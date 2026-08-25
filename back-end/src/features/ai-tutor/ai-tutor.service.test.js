import assert from "node:assert/strict";
import test from "node:test";
import { ObjectId } from "mongodb";
import { createAiTutorService } from "./ai-tutor.service.js";

const ids = {
  student: new ObjectId("607f1f77bcf86cd799439011"),
  conversation: new ObjectId("607f1f77bcf86cd799439012"),
  message: new ObjectId("607f1f77bcf86cd799439013"),
  context: new ObjectId("607f1f77bcf86cd799439014"),
};
const student = { _id: ids.student, role: "student" };
const fixedNow = new Date("2026-08-25T03:00:00.000Z");
const config = {
  maxInputChars: 1000,
  dailyMessageLimit: 3,
};

function fakeRepository({ dailyAllowed = true, ownsConversation = true } = {}) {
  const conversations = [];
  const messages = [];
  return {
    conversations,
    messages,
    reserved: 0,
    toObjectId(value) {
      return value instanceof ObjectId ? value : new ObjectId(value);
    },
    async reserveDailyMessage() {
      this.reserved += 1;
      return dailyAllowed;
    },
    async createConversation(userId, title, now) {
      const item = {
        _id: ids.conversation,
        userId,
        title,
        createdAt: now,
        updatedAt: now,
      };
      conversations.push(item);
      return item;
    },
    async findConversation(userId, conversationId) {
      if (!ownsConversation || String(userId) !== String(ids.student))
        return null;
      return {
        _id: new ObjectId(conversationId),
        userId,
        title: "Hội thoại cũ",
        createdAt: fixedNow,
        updatedAt: fixedNow,
      };
    },
    async listConversations(userId) {
      return conversations.filter(
        (item) => String(item.userId) === String(userId),
      );
    },
    async listMessages(userId, conversationId) {
      return messages.filter(
        (item) =>
          String(item.userId) === String(userId) &&
          String(item.conversationId) === String(conversationId),
      );
    },
    async insertMessage(document) {
      const item = {
        ...document,
        _id: new ObjectId(
          messages.length ? "607f1f77bcf86cd799439015" : String(ids.message),
        ),
      };
      messages.push(item);
      return item;
    },
    async touchConversation() {},
  };
}

function serviceOptions(repository, provider = {}) {
  return {
    repository,
    provider: {
      available: true,
      name: "fake",
      model: "fake-model",
      async generate() {
        return {
          answer: "Giải thích thật từ provider giả.",
          examples: ["你好。"],
          followUp: "Bạn muốn luyện thêm không?",
        };
      },
      ...provider,
    },
    contextResolver: async (userId, context) => ({
      public: { ...context, label: "Ngữ cảnh đã xác minh" },
      prompt: `owner=${String(userId)}; published context`,
    }),
    config,
    now: () => fixedNow,
  };
}

test("chat validates input and never accepts user or LMS state fields", async () => {
  const service = createAiTutorService(serviceOptions(fakeRepository()));
  await assert.rejects(
    service.chat(student, { message: "Xin chào", userId: String(ids.student) }),
    { status: 400, code: "AI_INVALID_REQUEST" },
  );
  await assert.rejects(
    service.chat(student, {
      message: "Xin chào",
      context: { type: "lesson", id: "not-an-id" },
    }),
    { status: 400, code: "AI_INVALID_REQUEST" },
  );
  await assert.rejects(service.chat(student, { message: "" }), {
    status: 400,
    code: "AI_INVALID_REQUEST",
  });
  await assert.rejects(service.chat(student, { message: "x".repeat(1001) }), {
    status: 400,
    code: "AI_INVALID_REQUEST",
  });
  await assert.rejects(
    service.chat(student, {
      message: "Xin chào",
      context: { type: "admin", id: String(ids.context) },
    }),
    { status: 400, code: "AI_INVALID_REQUEST" },
  );
});

test("configured provider response is persisted in an owner-scoped conversation", async () => {
  const repository = fakeRepository();
  let providerInput;
  const service = createAiTutorService(
    serviceOptions(repository, {
      async generate(input) {
        providerInput = input;
        return { answer: "你好 là xin chào.", examples: [], followUp: "" };
      },
    }),
  );
  const result = await service.chat(student, {
    message: "Giải thích từ này",
    context: { type: "vocabulary", id: String(ids.context) },
  });

  assert.equal(result.conversation.id, String(ids.conversation));
  assert.equal(result.message.text, "你好 là xin chào.");
  assert.equal(repository.messages.length, 2);
  assert.equal(String(repository.messages[0].userId), String(ids.student));
  assert.match(providerInput.context, new RegExp(String(ids.student)));
  assert.equal(repository.reserved, 1);
});

test("missing provider returns controlled unavailable without consuming quota", async () => {
  const repository = fakeRepository();
  const service = createAiTutorService(
    serviceOptions(repository, {
      available: false,
      name: "unconfigured",
      model: "",
    }),
  );
  await assert.rejects(service.chat(student, { message: "Xin chào" }), {
    status: 503,
    code: "AI_UNAVAILABLE",
  });
  assert.equal(repository.reserved, 0);
  assert.equal(repository.messages.length, 0);
});

test("daily limit and provider timeout return distinct safe errors", async () => {
  const limited = createAiTutorService(
    serviceOptions(fakeRepository({ dailyAllowed: false })),
  );
  await assert.rejects(limited.chat(student, { message: "Xin chào" }), {
    status: 429,
    code: "AI_DAILY_LIMIT",
  });

  const timedOut = createAiTutorService(
    serviceOptions(fakeRepository(), {
      async generate() {
        throw Object.assign(new Error("provider detail"), { code: "timeout" });
      },
    }),
  );
  await assert.rejects(timedOut.chat(student, { message: "Xin chào" }), {
    status: 504,
    code: "AI_TIMEOUT",
  });
});

test("provider authentication and unavailable errors keep the generic API contract", async () => {
  for (const providerCode of ["authentication", "unavailable"]) {
    const service = createAiTutorService(
      serviceOptions(fakeRepository(), {
        async generate() {
          throw Object.assign(new Error("private provider detail"), {
            code: providerCode,
          });
        },
      }),
    );
    await assert.rejects(service.chat(student, { message: "Test provider" }), {
      status: 502,
      code: "AI_PROVIDER_ERROR",
    });
  }
});

test("conversation ownership is checked before quota is consumed", async () => {
  const repository = fakeRepository({ ownsConversation: false });
  const service = createAiTutorService(serviceOptions(repository));
  await assert.rejects(
    service.chat(student, {
      message: "Tiếp tục",
      conversationId: String(ids.conversation),
    }),
    { status: 404, code: "AI_CONVERSATION_NOT_FOUND" },
  );
  assert.equal(repository.reserved, 0);
});

test("conversation listing remains scoped to the authenticated student", async () => {
  const repository = fakeRepository();
  repository.conversations.push(
    {
      _id: ids.conversation,
      userId: ids.student,
      title: "Của tôi",
      createdAt: fixedNow,
      updatedAt: fixedNow,
    },
    {
      _id: new ObjectId("607f1f77bcf86cd799439099"),
      userId: new ObjectId("607f1f77bcf86cd799439098"),
      title: "Của người khác",
      createdAt: fixedNow,
      updatedAt: fixedNow,
    },
  );
  const service = createAiTutorService(serviceOptions(repository));
  const conversations = await service.listConversations(student);
  assert.deepEqual(
    conversations.map((item) => item.title),
    ["Của tôi"],
  );
});

test("non-students cannot use AI Tutor service", async () => {
  const service = createAiTutorService(serviceOptions(fakeRepository()));
  await assert.rejects(
    service.chat({ _id: ids.student, role: "admin" }, { message: "Xin chào" }),
    { status: 403, code: "AI_FORBIDDEN" },
  );
});
