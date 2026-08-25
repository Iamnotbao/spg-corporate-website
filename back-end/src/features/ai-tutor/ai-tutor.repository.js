import { getCollection } from "../../config/db.js";
import { toObjectId } from "../../utils/objectId.js";
import { LEARNING_COLLECTIONS } from "../learning/learning.constants.js";
import { QUIZ_COLLECTIONS } from "../quiz/quiz.repository.js";
import { VOCABULARY_COLLECTIONS } from "../vocabulary/vocabulary.repository.js";

export const AI_TUTOR_COLLECTIONS = Object.freeze({
  conversations: "ai_conversations",
  messages: "ai_messages",
  dailyUsage: "ai_daily_usage",
});

let indexPromise;

export async function ensureAiTutorIndexes() {
  if (!indexPromise) {
    indexPromise = Promise.all([
      getCollection(AI_TUTOR_COLLECTIONS.conversations).then((collection) =>
        collection.createIndex({ userId: 1, updatedAt: -1 }),
      ),
      getCollection(AI_TUTOR_COLLECTIONS.messages).then((collection) =>
        collection.createIndex({ userId: 1, conversationId: 1, createdAt: 1 }),
      ),
      getCollection(AI_TUTOR_COLLECTIONS.dailyUsage).then((collection) =>
        Promise.all([
          collection.createIndex({ userId: 1, day: 1 }, { unique: true }),
          collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
        ]),
      ),
    ]).catch((error) => {
      indexPromise = undefined;
      throw error;
    });
  }
  return indexPromise;
}

async function collection(name) {
  await ensureAiTutorIndexes();
  return getCollection(name);
}

function idFilter(value) {
  const id = toObjectId(value);
  return id ? { _id: id } : { _id: null };
}

export const aiTutorRepository = {
  async createConversation(userId, title, now) {
    const document = {
      userId: toObjectId(userId),
      title,
      createdAt: now,
      updatedAt: now,
    };
    const result = await (
      await collection(AI_TUTOR_COLLECTIONS.conversations)
    ).insertOne(document);
    return { ...document, _id: result.insertedId };
  },

  async findConversation(userId, conversationId) {
    return (await collection(AI_TUTOR_COLLECTIONS.conversations)).findOne({
      ...idFilter(conversationId),
      userId: toObjectId(userId),
    });
  },

  async listConversations(userId, limit = 20) {
    return (await collection(AI_TUTOR_COLLECTIONS.conversations))
      .find({ userId: toObjectId(userId) })
      .sort({ updatedAt: -1, _id: -1 })
      .limit(limit)
      .toArray();
  },

  async touchConversation(userId, conversationId, now) {
    return (await collection(AI_TUTOR_COLLECTIONS.conversations)).updateOne(
      { ...idFilter(conversationId), userId: toObjectId(userId) },
      { $set: { updatedAt: now } },
    );
  },

  async insertMessage(document) {
    const result = await (
      await collection(AI_TUTOR_COLLECTIONS.messages)
    ).insertOne(document);
    return { ...document, _id: result.insertedId };
  },

  async listMessages(userId, conversationId, limit = 40) {
    const rows = await (
      await collection(AI_TUTOR_COLLECTIONS.messages)
    )
      .find({
        userId: toObjectId(userId),
        conversationId: toObjectId(conversationId),
      })
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .toArray();
    return rows.reverse();
  },

  async reserveDailyMessage(userId, day, limit, now) {
    const usage = await collection(AI_TUTOR_COLLECTIONS.dailyUsage);
    const identity = { userId: toObjectId(userId), day };
    const expiresAt = new Date(now);
    expiresAt.setUTCDate(expiresAt.getUTCDate() + 90);

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const updated = await usage.updateOne(
        { ...identity, count: { $lt: limit } },
        { $inc: { count: 1 }, $set: { updatedAt: now } },
      );
      if (updated.modifiedCount) return true;
      try {
        await usage.insertOne({
          ...identity,
          count: 1,
          createdAt: now,
          updatedAt: now,
          expiresAt,
        });
        return true;
      } catch (error) {
        if (error?.code !== 11000) throw error;
      }
    }
    return false;
  },

  async findPublishedLesson(id) {
    return (await getCollection(LEARNING_COLLECTIONS.lessons)).findOne(
      { ...idFilter(id), status: "published" },
      {
        projection: {
          title: 1,
          description: 1,
          content: 1,
          type: 1,
          unitId: 1,
        },
      },
    );
  },

  async findUnit(id) {
    return (await getCollection(LEARNING_COLLECTIONS.units)).findOne(
      idFilter(id),
      { projection: { title: 1, courseId: 1 } },
    );
  },

  async findPublishedCourse(id) {
    return (await getCollection(LEARNING_COLLECTIONS.courses)).findOne(
      { ...idFilter(id), status: "published" },
      { projection: { title: 1, level: 1 } },
    );
  },

  async listPublishedLessonVocabulary(lessonId, limit = 12) {
    return (await getCollection(VOCABULARY_COLLECTIONS.vocabulary))
      .find(
        { lessonId: toObjectId(lessonId), status: "published" },
        {
          projection: {
            simplified: 1,
            traditional: 1,
            pinyin: 1,
            meaningVietnamese: 1,
            exampleChinese: 1,
            exampleVietnamese: 1,
          },
        },
      )
      .sort({ simplified: 1 })
      .limit(limit)
      .toArray();
  },

  async findPublishedVocabulary(id) {
    return (await getCollection(VOCABULARY_COLLECTIONS.vocabulary)).findOne(
      { ...idFilter(id), status: "published" },
      {
        projection: {
          lessonId: 1,
          simplified: 1,
          traditional: 1,
          pinyin: 1,
          meaningVietnamese: 1,
          hskLevel: 1,
          exampleChinese: 1,
          examplePinyin: 1,
          exampleVietnamese: 1,
        },
      },
    );
  },

  async findOwnedQuizAttempt(userId, attemptId) {
    return (await getCollection(QUIZ_COLLECTIONS.attempts)).findOne(
      { ...idFilter(attemptId), userId: toObjectId(userId) },
      {
        projection: {
          quizId: 1,
          lessonId: 1,
          score: 1,
          passed: 1,
          results: 1,
          submittedAt: 1,
        },
      },
    );
  },

  async findQuiz(id) {
    return (await getCollection(QUIZ_COLLECTIONS.quizzes)).findOne(
      idFilter(id),
      { projection: { title: 1 } },
    );
  },

  async findLessonSummary(id) {
    return (await getCollection(LEARNING_COLLECTIONS.lessons)).findOne(
      idFilter(id),
      { projection: { title: 1, type: 1 } },
    );
  },

  toObjectId,
};
