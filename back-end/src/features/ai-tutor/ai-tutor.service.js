import { env } from "../../config/env.js";
import { resolveAiContext } from "./ai-tutor.context.js";
import { createConfiguredAiProvider } from "./ai-tutor.provider.js";
import { aiTutorRepository } from "./ai-tutor.repository.js";
import {
  validateAiChatInput,
  validateConversationId,
} from "./ai-tutor.validation.js";

export class AiTutorServiceError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function requireStudent(user) {
  if (!user || user.role !== "student") {
    throw new AiTutorServiceError(
      403,
      "Student access required",
      "AI_FORBIDDEN",
    );
  }
  return user._id;
}

function serializeConversation(item) {
  return {
    id: String(item._id),
    title: item.title,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function serializeMessage(item) {
  return {
    id: String(item._id),
    role: item.role,
    text: item.text,
    ...(item.examples?.length ? { examples: item.examples } : {}),
    ...(item.followUp ? { followUp: item.followUp } : {}),
    ...(item.context ? { context: item.context } : {}),
    createdAt: item.createdAt,
  };
}

function conversationTitle(message) {
  const text = String(message).replace(/\s+/g, " ").trim();
  return text.length > 64 ? `${text.slice(0, 61)}...` : text;
}

function providerFailure(error) {
  if (error?.code === "timeout") {
    return new AiTutorServiceError(
      504,
      "AI đang phản hồi chậm. Vui lòng thử lại.",
      "AI_TIMEOUT",
    );
  }
  if (error?.code === "rate_limit") {
    return new AiTutorServiceError(
      429,
      "Nhà cung cấp AI đang giới hạn yêu cầu. Vui lòng thử lại sau.",
      "AI_PROVIDER_RATE_LIMITED",
    );
  }
  return new AiTutorServiceError(
    502,
    "AI hiện chưa thể trả lời. Vui lòng thử lại.",
    "AI_PROVIDER_ERROR",
  );
}

export function createAiTutorService({
  repository = aiTutorRepository,
  provider = createConfiguredAiProvider(),
  contextResolver = resolveAiContext,
  config = env.ai,
  now = () => new Date(),
} = {}) {
  return {
    status() {
      return {
        available: provider.available === true,
        provider: provider.available ? provider.name : null,
        model: provider.available ? provider.model : null,
        maxInputChars: config.maxInputChars,
        dailyMessageLimit: config.dailyMessageLimit,
      };
    },

    async listConversations(user) {
      const userId = requireStudent(user);
      return (await repository.listConversations(userId)).map(
        serializeConversation,
      );
    },

    async listMessages(user, conversationId) {
      const userId = requireStudent(user);
      validateConversationId(conversationId);
      const conversation = await repository.findConversation(
        userId,
        conversationId,
      );
      if (!conversation) {
        throw new AiTutorServiceError(
          404,
          "AI conversation not found",
          "AI_CONVERSATION_NOT_FOUND",
        );
      }
      return (await repository.listMessages(userId, conversation._id)).map(
        serializeMessage,
      );
    },

    async chat(user, input) {
      const userId = requireStudent(user);
      const validated = validateAiChatInput(input, config.maxInputChars);
      if (!provider.available) {
        throw new AiTutorServiceError(
          503,
          "AI Gia sư chưa được cấu hình.",
          "AI_UNAVAILABLE",
        );
      }

      const resolvedContext = await contextResolver(userId, validated.context);
      const requestTime = now();
      let conversation;
      if (validated.conversationId) {
        conversation = await repository.findConversation(
          userId,
          validated.conversationId,
        );
        if (!conversation) {
          throw new AiTutorServiceError(
            404,
            "AI conversation not found",
            "AI_CONVERSATION_NOT_FOUND",
          );
        }
      }

      const day = requestTime.toISOString().slice(0, 10);
      const reserved = await repository.reserveDailyMessage(
        userId,
        day,
        config.dailyMessageLimit,
        requestTime,
      );
      if (!reserved) {
        throw new AiTutorServiceError(
          429,
          `Bạn đã dùng hết ${config.dailyMessageLimit} lượt hỏi AI hôm nay.`,
          "AI_DAILY_LIMIT",
        );
      }

      if (!conversation) {
        conversation = await repository.createConversation(
          userId,
          conversationTitle(validated.message),
          requestTime,
        );
      }

      const historyRows = await repository.listMessages(
        userId,
        conversation._id,
        10,
      );
      const history = historyRows
        .filter(
          (item) => ["user", "assistant"].includes(item.role) && item.text,
        )
        .map((item) => ({
          role: item.role,
          text: String(item.text).slice(0, 2400),
        }));

      const userMessage = await repository.insertMessage({
        userId: repository.toObjectId(userId),
        conversationId: conversation._id,
        role: "user",
        text: validated.message,
        context: resolvedContext.public,
        createdAt: requestTime,
      });

      let generated;
      try {
        generated = await provider.generate({
          context: resolvedContext.prompt,
          history,
          message: validated.message,
        });
      } catch (error) {
        throw providerFailure(error);
      }

      const responseTime = now();
      const assistantMessage = await repository.insertMessage({
        userId: repository.toObjectId(userId),
        conversationId: conversation._id,
        role: "assistant",
        text: generated.answer,
        examples: generated.examples,
        followUp: generated.followUp,
        context: resolvedContext.public,
        provider: provider.name,
        model: provider.model,
        createdAt: responseTime,
      });
      await repository.touchConversation(
        userId,
        conversation._id,
        responseTime,
      );

      return {
        conversation: serializeConversation({
          ...conversation,
          updatedAt: responseTime,
        }),
        userMessage: serializeMessage(userMessage),
        message: serializeMessage(assistantMessage),
        context: resolvedContext.public,
      };
    },
  };
}

export const aiTutorService = createAiTutorService();
