import { getCollection } from "../../config/db.js";
import { toObjectId } from "../../utils/objectId.js";
import { LEARNING_COLLECTIONS } from "../learning/learning.constants.js";
import { ensureLearningIndexes } from "../learning/learning.repository.js";
import {
  ensureQuizIndexes,
  QUIZ_COLLECTIONS,
} from "../quiz/quiz.repository.js";
import {
  ensureStudentLearningIndexes,
  STUDENT_COLLECTIONS,
} from "../student-learning/student-learning.repository.js";
import {
  ensureVocabularyIndexes,
  VOCABULARY_COLLECTIONS,
} from "../vocabulary/vocabulary.repository.js";

let indexPromise;

export async function ensureProgressIndexes() {
  if (!indexPromise) {
    indexPromise = Promise.all([
      getCollection("users").then((collection) =>
        collection.createIndex({ role: 1, active: 1 }),
      ),
      getCollection(QUIZ_COLLECTIONS.attempts).then((collection) =>
        collection.createIndex({ userId: 1, submittedAt: -1 }),
      ),
      ensureLearningIndexes(),
      ensureStudentLearningIndexes(),
      ensureQuizIndexes(),
      ensureVocabularyIndexes(),
    ]).catch((error) => {
      indexPromise = undefined;
      throw error;
    });
  }
  return indexPromise;
}

async function collection(name) {
  await ensureProgressIndexes();
  return getCollection(name);
}

function enrollmentProgressStages() {
  return [
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "student",
      },
    },
    { $unwind: "$student" },
    { $match: { "student.role": "student" } },
    {
      $lookup: {
        from: LEARNING_COLLECTIONS.courses,
        localField: "courseId",
        foreignField: "_id",
        as: "course",
      },
    },
    { $unwind: "$course" },
    {
      $lookup: {
        from: LEARNING_COLLECTIONS.units,
        localField: "courseId",
        foreignField: "courseId",
        as: "units",
      },
    },
    {
      $lookup: {
        from: LEARNING_COLLECTIONS.lessons,
        let: { unitIds: "$units._id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $in: ["$unitId", "$$unitIds"] },
                  { $eq: ["$status", "published"] },
                ],
              },
            },
          },
          { $project: { _id: 1 } },
        ],
        as: "lessons",
      },
    },
    {
      $lookup: {
        from: STUDENT_COLLECTIONS.lessonProgress,
        let: { lessonIds: "$lessons._id", studentId: "$userId" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$userId", "$$studentId"] },
                  { $in: ["$lessonId", "$$lessonIds"] },
                  { $eq: ["$completed", true] },
                ],
              },
            },
          },
          { $project: { completedAt: 1 } },
        ],
        as: "completedProgress",
      },
    },
    {
      $addFields: {
        totalLessons: { $size: "$lessons" },
        completedLessons: { $size: "$completedProgress" },
        latestCompletion: { $max: "$completedProgress.completedAt" },
      },
    },
    {
      $addFields: {
        progressPercentage: {
          $cond: [
            { $gt: ["$totalLessons", 0] },
            {
              $round: [
                {
                  $multiply: [
                    { $divide: ["$completedLessons", "$totalLessons"] },
                    100,
                  ],
                },
                0,
              ],
            },
            0,
          ],
        },
        completed: {
          $and: [
            { $gt: ["$totalLessons", 0] },
            { $eq: ["$completedLessons", "$totalLessons"] },
          ],
        },
        latestActivity: {
          $max: ["$updatedAt", "$enrolledAt", "$latestCompletion"],
        },
      },
    },
  ];
}

export const progressRepository = {
  async listStudentEnrollments(userId) {
    return (await collection(STUDENT_COLLECTIONS.enrollments))
      .find({
        userId: toObjectId(userId),
        status: { $in: ["active", "archived"] },
      })
      .sort({ updatedAt: -1, enrolledAt: -1 })
      .toArray();
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
  async countSavedVocabulary(userId) {
    return (await collection(VOCABULARY_COLLECTIONS.progress)).countDocuments({
      userId: toObjectId(userId),
      saved: true,
    });
  },
  async countQuizAttempts(userId) {
    return (await collection(QUIZ_COLLECTIONS.attempts)).countDocuments({
      userId: toObjectId(userId),
    });
  },
  async listRecentQuizAttempts(userId, limit = 5) {
    return (await collection(QUIZ_COLLECTIONS.attempts))
      .aggregate([
        { $match: { userId: toObjectId(userId) } },
        { $sort: { submittedAt: -1 } },
        { $limit: limit },
        {
          $lookup: {
            from: QUIZ_COLLECTIONS.quizzes,
            localField: "quizId",
            foreignField: "_id",
            as: "quiz",
          },
        },
        { $unwind: { path: "$quiz", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            quizId: 1,
            quizTitle: "$quiz.title",
            score: 1,
            earnedPoints: 1,
            totalPoints: 1,
            passed: 1,
            submittedAt: 1,
          },
        },
      ])
      .toArray();
  },

  async getAdminCounts() {
    const [students, courses, activeEnrollments, totalEnrollments, completedLessons, quizAttempts] =
      await Promise.all([
        collection("users").then((items) => items.countDocuments({ role: "student" })),
        collection(LEARNING_COLLECTIONS.courses).then((items) => items.countDocuments()),
        collection(STUDENT_COLLECTIONS.enrollments).then((items) =>
          items.countDocuments({ status: "active" }),
        ),
        collection(STUDENT_COLLECTIONS.enrollments).then((items) =>
          items.countDocuments(),
        ),
        collection(STUDENT_COLLECTIONS.lessonProgress).then((items) =>
          items.countDocuments({ completed: true }),
        ),
        collection(QUIZ_COLLECTIONS.attempts).then((items) => items.countDocuments()),
      ]);
    return {
      students,
      courses,
      activeEnrollments,
      totalEnrollments,
      completedLessons,
      quizAttempts,
    };
  },
  async listCoursesForReporting() {
    return (await collection(LEARNING_COLLECTIONS.courses))
      .find({}, { projection: { title: 1, slug: 1, status: 1, order: 1 } })
      .sort({ order: 1, title: 1 })
      .toArray();
  },
  async aggregateCourseMetrics() {
    return (await collection(STUDENT_COLLECTIONS.enrollments))
      .aggregate([
        ...enrollmentProgressStages(),
        {
          $group: {
            _id: "$courseId",
            totalEnrollments: { $sum: 1 },
            activeEnrollments: {
              $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
            },
            completedCourses: { $sum: { $cond: ["$completed", 1, 0] } },
            averageProgress: { $avg: "$progressPercentage" },
          },
        },
      ])
      .toArray();
  },
  async listEnrollmentProgress({ page, pageSize, search, courseId, status }) {
    const initialMatch = {};
    if (courseId) initialMatch.courseId = toObjectId(courseId);
    if (status) initialMatch.status = status;
    const pipeline = [
      { $match: initialMatch },
      ...enrollmentProgressStages(),
    ];
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { "student.username": { $regex: search, $options: "i" } },
            { "student.displayName": { $regex: search, $options: "i" } },
            { "course.title": { $regex: search, $options: "i" } },
          ],
        },
      });
    }
    pipeline.push(
      { $sort: { latestActivity: -1, _id: 1 } },
      {
        $project: {
          id: { $toString: "$_id" },
          student: {
            id: { $toString: "$student._id" },
            username: "$student.username",
            displayName: { $ifNull: ["$student.displayName", "$student.username"] },
            active: { $ne: ["$student.active", false] },
          },
          course: {
            id: { $toString: "$course._id" },
            title: "$course.title",
            slug: "$course.slug",
            status: "$course.status",
          },
          enrollmentStatus: "$status",
          completedLessons: 1,
          totalLessons: 1,
          progressPercentage: 1,
          completed: 1,
          enrolledAt: 1,
          latestActivity: 1,
        },
      },
      {
        $facet: {
          data: [{ $skip: (page - 1) * pageSize }, { $limit: pageSize }],
          metadata: [{ $count: "total" }],
        },
      },
    );
    const [result] = await (
      await collection(STUDENT_COLLECTIONS.enrollments)
    )
      .aggregate(pipeline)
      .toArray();
    return {
      data: result?.data || [],
      total: result?.metadata?.[0]?.total || 0,
    };
  },
  toObjectId,
};

export async function countUserLearningHistory(userId) {
  const id = toObjectId(userId);
  if (!id) return 0;
  const counts = await Promise.all([
    collection(STUDENT_COLLECTIONS.enrollments).then((items) =>
      items.countDocuments({ userId: id }),
    ),
    collection(STUDENT_COLLECTIONS.lessonProgress).then((items) =>
      items.countDocuments({ userId: id }),
    ),
    collection(QUIZ_COLLECTIONS.attempts).then((items) =>
      items.countDocuments({ userId: id }),
    ),
    collection(VOCABULARY_COLLECTIONS.progress).then((items) =>
      items.countDocuments({ userId: id }),
    ),
  ]);
  return counts.reduce((total, count) => total + count, 0);
}
