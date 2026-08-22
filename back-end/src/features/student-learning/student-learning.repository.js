import { getCollection } from "../../config/db.js";
import { toObjectId } from "../../utils/objectId.js";
import { LEARNING_COLLECTIONS } from "../learning/learning.constants.js";
import { ensureLearningIndexes } from "../learning/learning.repository.js";

export const STUDENT_COLLECTIONS = Object.freeze({
  enrollments: "enrollments",
  lessonProgress: "lesson_progress",
});

let indexPromise;

export async function ensureStudentLearningIndexes() {
  if (!indexPromise) {
    indexPromise = Promise.all([
      getCollection(STUDENT_COLLECTIONS.enrollments).then((collection) =>
        Promise.all([
          collection.createIndex({ userId: 1, courseId: 1 }, { unique: true }),
          collection.createIndex({ userId: 1, status: 1, enrolledAt: -1 }),
        ]),
      ),
      getCollection(STUDENT_COLLECTIONS.lessonProgress).then((collection) =>
        Promise.all([
          collection.createIndex({ userId: 1, lessonId: 1 }, { unique: true }),
          collection.createIndex({ userId: 1, completed: 1 }),
        ]),
      ),
      ensureLearningIndexes(),
    ]).catch((error) => {
      indexPromise = undefined;
      throw error;
    });
  }
  return indexPromise;
}

async function collection(name) {
  await ensureStudentLearningIndexes();
  return getCollection(name);
}

function identifierFilter(identifier) {
  const id = toObjectId(identifier);
  return id
    ? { $or: [{ _id: id }, { slug: String(identifier) }] }
    : { slug: String(identifier) };
}

export const studentLearningRepository = {
  async findPublishedCourse(identifier) {
    return (await collection(LEARNING_COLLECTIONS.courses)).findOne({
      ...identifierFilter(identifier),
      status: "published",
    });
  },
  async listPublishedCoursesByIds(courseIds) {
    if (!courseIds.length) return [];
    return (await collection(LEARNING_COLLECTIONS.courses))
      .find({ _id: { $in: courseIds }, status: "published" })
      .sort({ order: 1, title: 1 })
      .toArray();
  },
  async listUnitsByCourseIds(courseIds) {
    if (!courseIds.length) return [];
    return (await collection(LEARNING_COLLECTIONS.units))
      .find({ courseId: { $in: courseIds } })
      .sort({ order: 1, title: 1 })
      .toArray();
  },
  async listPublishedLessonsByUnitIds(unitIds) {
    if (!unitIds.length) return [];
    return (await collection(LEARNING_COLLECTIONS.lessons))
      .find({ unitId: { $in: unitIds }, status: "published" })
      .sort({ order: 1, title: 1 })
      .toArray();
  },
  async findPublishedLesson(identifier) {
    return (await collection(LEARNING_COLLECTIONS.lessons)).findOne({
      ...identifierFilter(identifier),
      status: "published",
    });
  },
  async findUnit(id) {
    const unitId = toObjectId(id);
    if (!unitId) return null;
    return (await collection(LEARNING_COLLECTIONS.units)).findOne({
      _id: unitId,
    });
  },
  async findEnrollment(userId, courseId) {
    return (await collection(STUDENT_COLLECTIONS.enrollments)).findOne({
      userId: toObjectId(userId),
      courseId: toObjectId(courseId),
      status: "active",
    });
  },
  async enroll(userId, courseId, now) {
    const filter = {
      userId: toObjectId(userId),
      courseId: toObjectId(courseId),
    };
    const result = await (
      await collection(STUDENT_COLLECTIONS.enrollments)
    ).updateOne(
      filter,
      {
        $setOnInsert: {
          ...filter,
          status: "active",
          enrolledAt: now,
          createdAt: now,
        },
        $set: { updatedAt: now },
      },
      { upsert: true },
    );
    return {
      created: result.upsertedCount === 1,
      enrollment: await (
        await collection(STUDENT_COLLECTIONS.enrollments)
      ).findOne(filter),
    };
  },
  async listEnrollments(userId) {
    return (await collection(STUDENT_COLLECTIONS.enrollments))
      .find({ userId: toObjectId(userId), status: "active" })
      .sort({ enrolledAt: -1 })
      .toArray();
  },
  async listCompletedProgress(userId, lessonIds) {
    if (!lessonIds.length) return [];
    return (await collection(STUDENT_COLLECTIONS.lessonProgress))
      .find({
        userId: toObjectId(userId),
        lessonId: { $in: lessonIds },
        completed: true,
      })
      .toArray();
  },
  async completeLesson(userId, lessonId, now) {
    const filter = {
      userId: toObjectId(userId),
      lessonId: toObjectId(lessonId),
    };
    return (
      await collection(STUDENT_COLLECTIONS.lessonProgress)
    ).findOneAndUpdate(
      filter,
      {
        $setOnInsert: { ...filter, createdAt: now },
        $set: { completed: true, completedAt: now, updatedAt: now },
      },
      { upsert: true, returnDocument: "after" },
    );
  },
  toObjectId,
};
