import { ObjectId } from "mongodb";
import { getCollection } from "../../config/db.js";

const DEFAULT_MESSAGE_LIMIT = 50;
const MAX_MESSAGE_LIMIT = 100;

function messageLimit(value) {
  const parsed = Number.parseInt(value, 10);
  return Math.min(
    MAX_MESSAGE_LIMIT,
    Number.isInteger(parsed) && parsed >= 1 ? parsed : DEFAULT_MESSAGE_LIMIT,
  );
}

export function encodeMessageCursor(message) {
  if (!message?._id || !message?.createdAt) return null;
  return Buffer.from(
    JSON.stringify({ createdAt: new Date(message.createdAt).toISOString(), id: String(message._id) }),
  ).toString("base64url");
}

export function decodeMessageCursor(value) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(String(value), "base64url").toString("utf8"));
    const createdAt = new Date(parsed.createdAt);
    if (Number.isNaN(createdAt.getTime()) || !ObjectId.isValid(parsed.id)) return null;
    return { createdAt, id: new ObjectId(parsed.id) };
  } catch {
    return null;
  }
}

export function createChatRepository(collectionProvider = getCollection) {
  return {
    async findMessage(sessionId, messageId) {
      if (!ObjectId.isValid(messageId)) return null;
      return (await collectionProvider("chat_messages")).findOne({
        _id: new ObjectId(messageId),
        sessionId,
      });
    },

    async listMessages(sessionId, query = {}) {
      const limit = messageLimit(query.limit);
      const before = decodeMessageCursor(query.before);
      if (query.before && !before) {
        const error = new Error("Invalid message cursor");
        error.status = 400;
        throw error;
      }
      const filter = { sessionId };
      if (before) {
        filter.$or = [
          { createdAt: { $lt: before.createdAt } },
          { createdAt: before.createdAt, _id: { $lt: before.id } },
        ];
      }
      const rows = await (await collectionProvider("chat_messages"))
        .find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .limit(limit + 1)
        .toArray();
      const hasMore = rows.length > limit;
      const items = rows.slice(0, limit).reverse();
      return {
        items,
        pagination: {
          limit,
          hasMore,
          nextCursor: hasMore ? encodeMessageCursor(items[0]) : null,
        },
      };
    },

    async deleteConversation(sessionId) {
      const messages = await collectionProvider("chat_messages");
      const sessions = await collectionProvider("chat_sessions");
      const messageResult = await messages.deleteMany({ sessionId });
      const sessionResult = await sessions.deleteOne({ sessionId });
      return {
        deletedMessages: messageResult.deletedCount,
        deletedSession: sessionResult.deletedCount,
      };
    },
  };
}

export const chatRepository = createChatRepository();
