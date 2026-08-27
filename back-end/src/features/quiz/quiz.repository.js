import { getCollection } from "../../config/db.js";
import { toObjectId } from "../../utils/objectId.js";
import { LEARNING_COLLECTIONS } from "../learning/learning.constants.js";
import { ensureLearningIndexes } from "../learning/learning.repository.js";
import {
  ensureStudentLearningIndexes,
  STUDENT_COLLECTIONS,
} from "../student-learning/student-learning.repository.js";

export const QUIZ_COLLECTIONS = Object.freeze({
  quizzes: "quizzes",
  questions: "quiz_questions",
  attempts: "quiz_attempts",
});

let indexPromise;

export async function ensureQuizIndexes() {
  if (!indexPromise) {
    indexPromise = Promise.all([
      getCollection(QUIZ_COLLECTIONS.quizzes).then((collection) =>
        Promise.all([
          collection.createIndex({ lessonId: 1 }, { unique: true }),
          collection.createIndex({ status: 1, updatedAt: -1, _id: -1 }),
        ]),
      ),
      getCollection(QUIZ_COLLECTIONS.questions).then((collection) =>
        collection.createIndex({ quizId: 1, order: 1, _id: 1 }),
      ),
      getCollection(QUIZ_COLLECTIONS.attempts).then((collection) =>
        Promise.all([
          collection.createIndex({ userId: 1, quizId: 1, submittedAt: -1 }),
          collection.createIndex({ quizId: 1, submittedAt: -1 }),
        ]),
      ),
      ensureLearningIndexes(),
      ensureStudentLearningIndexes(),
    ]).catch((error) => {
      indexPromise = undefined;
      throw error;
    });
  }
  return indexPromise;
}

async function collection(name) {
  await ensureQuizIndexes();
  return getCollection(name);
}

function idFilter(id) {
  const value = toObjectId(id);
  return value ? { _id: value } : { _id: null };
}

function lessonIdentifierFilter(identifier) {
  const id = toObjectId(identifier);
  return id
    ? { $or: [{ _id: id }, { slug: String(identifier) }] }
    : { slug: String(identifier) };
}

export const quizRepository = {
  async listQuizzes(filter = {}) {
    return (await collection(QUIZ_COLLECTIONS.quizzes))
      .find(filter)
      .sort({ updatedAt: -1, title: 1, _id: -1 })
      .toArray();
  },
  async listQuizzesPage(filter = {}, { skip = 0, limit = 10 } = {}) {
    return (await collection(QUIZ_COLLECTIONS.quizzes))
      .aggregate([
        { $match: filter },
        { $sort: { updatedAt: -1, title: 1, _id: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: QUIZ_COLLECTIONS.questions,
            localField: "_id",
            foreignField: "quizId",
            pipeline: [{ $count: "total" }],
            as: "questionMetadata",
          },
        },
        {
          $set: {
            questionCount: {
              $ifNull: [{ $arrayElemAt: ["$questionMetadata.total", 0] }, 0],
            },
          },
        },
        { $unset: "questionMetadata" },
      ])
      .toArray();
  },
  async countQuizzes(filter = {}) {
    return (await collection(QUIZ_COLLECTIONS.quizzes)).countDocuments(filter);
  },
  async findQuiz(id, filter = {}) {
    return (await collection(QUIZ_COLLECTIONS.quizzes)).findOne({
      ...idFilter(id),
      ...filter,
    });
  },
  async findQuizByLessonId(lessonId, filter = {}) {
    return (await collection(QUIZ_COLLECTIONS.quizzes)).findOne({
      lessonId: toObjectId(lessonId),
      ...filter,
    });
  },
  async createQuiz(document) {
    const result = await (
      await collection(QUIZ_COLLECTIONS.quizzes)
    ).insertOne(document);
    return { ...document, _id: result.insertedId };
  },
  async updateQuiz(id, update) {
    return (await collection(QUIZ_COLLECTIONS.quizzes)).findOneAndUpdate(
      idFilter(id),
      { $set: update },
      { returnDocument: "after" },
    );
  },
  async deleteQuiz(id) {
    return (await collection(QUIZ_COLLECTIONS.quizzes)).deleteOne(idFilter(id));
  },
  async listQuestions(filter = {}) {
    return (await collection(QUIZ_COLLECTIONS.questions))
      .find(filter)
      .sort({ order: 1, _id: 1 })
      .toArray();
  },
  async findQuestion(id) {
    return (await collection(QUIZ_COLLECTIONS.questions)).findOne(idFilter(id));
  },
  async createQuestion(document) {
    const result = await (
      await collection(QUIZ_COLLECTIONS.questions)
    ).insertOne(document);
    return { ...document, _id: result.insertedId };
  },
  async updateQuestion(id, update) {
    return (await collection(QUIZ_COLLECTIONS.questions)).findOneAndUpdate(
      idFilter(id),
      { $set: update },
      { returnDocument: "after" },
    );
  },
  async deleteQuestion(id) {
    return (await collection(QUIZ_COLLECTIONS.questions)).deleteOne(
      idFilter(id),
    );
  },
  async countQuestions(quizId) {
    return (await collection(QUIZ_COLLECTIONS.questions)).countDocuments({
      quizId: toObjectId(quizId),
    });
  },
  async countAttempts(quizId) {
    return (await collection(QUIZ_COLLECTIONS.attempts)).countDocuments({
      quizId: toObjectId(quizId),
    });
  },
  async createAttempt(document) {
    const result = await (
      await collection(QUIZ_COLLECTIONS.attempts)
    ).insertOne(document);
    return { ...document, _id: result.insertedId };
  },
  async listAttempts(userId, quizId) {
    return (await collection(QUIZ_COLLECTIONS.attempts))
      .find({ userId: toObjectId(userId), quizId: toObjectId(quizId) })
      .sort({ submittedAt: -1 })
      .toArray();
  },
  async listAttemptsPage(userId, quizId, { skip = 0, limit = 20 } = {}) {
    return (await collection(QUIZ_COLLECTIONS.attempts))
      .find({ userId: toObjectId(userId), quizId: toObjectId(quizId) })
      .sort({ submittedAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
  },
  async countOwnAttempts(userId, quizId) {
    return (await collection(QUIZ_COLLECTIONS.attempts)).countDocuments({
      userId: toObjectId(userId),
      quizId: toObjectId(quizId),
    });
  },
  async findLesson(identifier, filter = {}) {
    return (await collection(LEARNING_COLLECTIONS.lessons)).findOne({
      ...lessonIdentifierFilter(identifier),
      ...filter,
    });
  },
  async findUnit(id) {
    return (await collection(LEARNING_COLLECTIONS.units)).findOne(idFilter(id));
  },
  async findCourse(id, filter = {}) {
    return (await collection(LEARNING_COLLECTIONS.courses)).findOne({
      ...idFilter(id),
      ...filter,
    });
  },
  async findEnrollment(userId, courseId) {
    return (await collection(STUDENT_COLLECTIONS.enrollments)).findOne({
      userId: toObjectId(userId),
      courseId: toObjectId(courseId),
      status: "active",
    });
  },
  toObjectId,
};
