import { getCollection } from "../../config/db.js";
import { toObjectId } from "../../utils/objectId.js";
import {
  CHARACTER_COLLECTIONS,
  ensureCharacterIndexes,
} from "../character/character.repository.js";
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
import { vocabularyStageExpression } from "../vocabulary/vocabulary.mastery.js";

let indexPromise;

export async function ensureDashboardIndexes() {
  if (!indexPromise) {
    indexPromise = Promise.all([
      ensureLearningIndexes(),
      ensureStudentLearningIndexes(),
      ensureQuizIndexes(),
      ensureVocabularyIndexes(),
      ensureCharacterIndexes(),
      getCollection(STUDENT_COLLECTIONS.lessonProgress).then((items) =>
        items.createIndex({ userId: 1, completed: 1, completedAt: -1 }),
      ),
      getCollection(QUIZ_COLLECTIONS.attempts).then((items) =>
        items.createIndex({ userId: 1, submittedAt: -1 }),
      ),
      getCollection(VOCABULARY_COLLECTIONS.progress).then((items) =>
        items.createIndex({ userId: 1, saved: 1, lastReviewedAt: -1 }),
      ),
      getCollection(CHARACTER_COLLECTIONS.attempts).then((items) =>
        items.createIndex({ userId: 1, createdAt: -1 }),
      ),
    ]).catch((error) => {
      indexPromise = undefined;
      throw error;
    });
  }
  return indexPromise;
}

async function collection(name) {
  await ensureDashboardIndexes();
  return getCollection(name);
}

function visibleVocabularyStages(userId) {
  return [
    { $match: { userId: toObjectId(userId), saved: true } },
    {
      $lookup: {
        from: VOCABULARY_COLLECTIONS.vocabulary,
        localField: "vocabularyId",
        foreignField: "_id",
        as: "vocabulary",
      },
    },
    { $unwind: "$vocabulary" },
    { $match: { "vocabulary.status": "published" } },
    {
      $lookup: {
        from: LEARNING_COLLECTIONS.lessons,
        localField: "vocabulary.lessonId",
        foreignField: "_id",
        as: "lesson",
      },
    },
    { $unwind: "$lesson" },
    { $match: { "lesson.status": "published" } },
    {
      $lookup: {
        from: LEARNING_COLLECTIONS.units,
        localField: "lesson.unitId",
        foreignField: "_id",
        as: "unit",
      },
    },
    { $unwind: "$unit" },
    {
      $lookup: {
        from: LEARNING_COLLECTIONS.courses,
        let: { courseId: "$unit.courseId" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$_id", "$$courseId"] },
              status: "published",
            },
          },
        ],
        as: "course",
      },
    },
    { $unwind: "$course" },
  ];
}

export const dashboardRepository = {
  async getVocabularyAnalytics(userId, { now, todayStart, tomorrow }) {
    const unscheduled = {
      $eq: [{ $ifNull: ["$nextReviewAt", null] }, null],
    };
    const dueNow = { $or: [unscheduled, { $lte: ["$nextReviewAt", now] }] };
    const dueToday = {
      $or: [unscheduled, { $lt: ["$nextReviewAt", tomorrow] }],
    };
    const [result] = await (
      await collection(VOCABULARY_COLLECTIONS.progress)
    )
      .aggregate([
        ...visibleVocabularyStages(userId),
        { $set: { normalizedStage: vocabularyStageExpression() } },
        {
          $facet: {
            summary: [
              {
                $group: {
                  _id: null,
                  saved: { $sum: 1 },
                  dueNow: { $sum: { $cond: [dueNow, 1, 0] } },
                  dueToday: { $sum: { $cond: [dueToday, 1, 0] } },
                  overdue: {
                    $sum: {
                      $cond: [{ $lt: ["$nextReviewAt", todayStart] }, 1, 0],
                    },
                  },
                  new: {
                    $sum: {
                      $cond: [{ $eq: ["$normalizedStage", "new"] }, 1, 0],
                    },
                  },
                  learning: {
                    $sum: {
                      $cond: [{ $eq: ["$normalizedStage", "learning"] }, 1, 0],
                    },
                  },
                  review: {
                    $sum: {
                      $cond: [{ $eq: ["$normalizedStage", "review"] }, 1, 0],
                    },
                  },
                  mastered: {
                    $sum: {
                      $cond: [{ $eq: ["$normalizedStage", "mastered"] }, 1, 0],
                    },
                  },
                },
              },
            ],
            recent: [
              { $match: { lastReviewedAt: { $type: "date" } } },
              { $sort: { lastReviewedAt: -1 } },
              { $limit: 6 },
              {
                $project: {
                  _id: 0,
                  vocabularyId: 1,
                  simplified: "$vocabulary.simplified",
                  pinyin: "$vocabulary.pinyin",
                  characterIds: "$vocabulary.characterIds",
                  stage: "$normalizedStage",
                  lastRating: 1,
                  lastReviewedAt: 1,
                  nextReviewAt: 1,
                },
              },
            ],
          },
        },
      ])
      .toArray();
    const [historySummary] = await (
      await collection(VOCABULARY_COLLECTIONS.reviewHistory)
    )
      .aggregate([
        { $match: { userId: toObjectId(userId) } },
        {
          $group: {
            _id: null,
            reviewedToday: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gte: ["$reviewedAt", todayStart] },
                      { $lt: ["$reviewedAt", tomorrow] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            again: { $sum: { $cond: [{ $eq: ["$rating", "again"] }, 1, 0] } },
            hard: { $sum: { $cond: [{ $eq: ["$rating", "hard"] }, 1, 0] } },
            good: { $sum: { $cond: [{ $eq: ["$rating", "good"] }, 1, 0] } },
            easy: { $sum: { $cond: [{ $eq: ["$rating", "easy"] }, 1, 0] } },
          },
        },
      ])
      .toArray();
    return {
      summary: { ...(result?.summary?.[0] || {}), ...(historySummary || {}) },
      recent: result?.recent || [],
    };
  },

  async getQuizAnalytics(userId) {
    const [result] = await (
      await collection(QUIZ_COLLECTIONS.attempts)
    )
      .aggregate([
        { $match: { userId: toObjectId(userId) } },
        { $sort: { submittedAt: -1 } },
        {
          $facet: {
            summary: [
              {
                $group: {
                  _id: null,
                  totalAttempts: { $sum: 1 },
                  passedAttempts: {
                    $sum: { $cond: [{ $eq: ["$passed", true] }, 1, 0] },
                  },
                  recentScore: { $first: "$score" },
                  recentAttemptAt: { $first: "$submittedAt" },
                  bestScore: { $max: "$score" },
                },
              },
            ],
            recent: [
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
                $lookup: {
                  from: LEARNING_COLLECTIONS.lessons,
                  localField: "quiz.lessonId",
                  foreignField: "_id",
                  as: "lesson",
                },
              },
              {
                $unwind: { path: "$lesson", preserveNullAndEmptyArrays: true },
              },
              {
                $lookup: {
                  from: LEARNING_COLLECTIONS.units,
                  localField: "lesson.unitId",
                  foreignField: "_id",
                  as: "unit",
                },
              },
              { $unwind: { path: "$unit", preserveNullAndEmptyArrays: true } },
              {
                $lookup: {
                  from: LEARNING_COLLECTIONS.courses,
                  localField: "unit.courseId",
                  foreignField: "_id",
                  as: "course",
                },
              },
              {
                $unwind: { path: "$course", preserveNullAndEmptyArrays: true },
              },
              {
                $project: {
                  _id: 1,
                  quizId: 1,
                  quizTitle: { $ifNull: ["$quiz.title", "Quiz"] },
                  score: 1,
                  passed: 1,
                  submittedAt: 1,
                  lessonSlug: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ["$quiz.status", "published"] },
                          { $eq: ["$lesson.status", "published"] },
                          { $eq: ["$course.status", "published"] },
                        ],
                      },
                      "$lesson.slug",
                      null,
                    ],
                  },
                  courseSlug: {
                    $cond: [
                      { $eq: ["$course.status", "published"] },
                      "$course.slug",
                      null,
                    ],
                  },
                },
              },
            ],
          },
        },
      ])
      .toArray();
    return {
      summary: result?.summary?.[0] || {},
      recent: result?.recent || [],
    };
  },

  async getCharacterAnalytics(userId) {
    const [result] = await (
      await collection(CHARACTER_COLLECTIONS.attempts)
    )
      .aggregate([
        { $match: { userId: toObjectId(userId) } },
        { $sort: { createdAt: -1 } },
        {
          $facet: {
            summary: [
              {
                $group: {
                  _id: null,
                  totalAttempts: { $sum: 1 },
                  characterIds: { $addToSet: "$characterId" },
                  recentScore: { $first: "$score" },
                  recentPracticeAt: { $first: "$createdAt" },
                  bestScore: { $max: "$score" },
                },
              },
              {
                $project: {
                  _id: 0,
                  totalAttempts: 1,
                  charactersPracticed: { $size: "$characterIds" },
                  recentScore: 1,
                  recentPracticeAt: 1,
                  bestScore: 1,
                },
              },
            ],
            recent: [
              { $limit: 5 },
              {
                $lookup: {
                  from: CHARACTER_COLLECTIONS.characters,
                  localField: "characterId",
                  foreignField: "_id",
                  as: "character",
                },
              },
              { $unwind: "$character" },
              { $match: { "character.status": "published" } },
              { $limit: 5 },
              {
                $project: {
                  _id: 1,
                  characterId: 1,
                  simplified: "$character.simplified",
                  score: 1,
                  createdAt: 1,
                },
              },
            ],
          },
        },
      ])
      .toArray();
    return {
      summary: result?.summary?.[0] || {},
      recent: result?.recent || [],
    };
  },

  async listStudyEvents(userId) {
    const id = toObjectId(userId);
    const [lessons, quizzes, vocabulary, characters] = await Promise.all([
      collection(STUDENT_COLLECTIONS.lessonProgress).then((items) =>
        items
          .find(
            { userId: id, completed: true, completedAt: { $type: "date" } },
            { projection: { _id: 0, completedAt: 1 } },
          )
          .toArray(),
      ),
      collection(QUIZ_COLLECTIONS.attempts).then((items) =>
        items
          .find(
            { userId: id, submittedAt: { $type: "date" } },
            { projection: { _id: 0, submittedAt: 1 } },
          )
          .toArray(),
      ),
      collection(VOCABULARY_COLLECTIONS.reviewHistory).then((items) =>
        items
          .find(
            { userId: id, reviewedAt: { $type: "date" } },
            { projection: { _id: 0, reviewedAt: 1 } },
          )
          .toArray(),
      ),
      collection(CHARACTER_COLLECTIONS.attempts).then((items) =>
        items
          .find(
            { userId: id, createdAt: { $type: "date" } },
            { projection: { _id: 0, createdAt: 1 } },
          )
          .toArray(),
      ),
    ]);
    return [
      ...lessons.map((item) => ({
        type: "lesson_completed",
        occurredAt: item.completedAt,
      })),
      ...quizzes.map((item) => ({
        type: "quiz_attempt",
        occurredAt: item.submittedAt,
      })),
      ...vocabulary.map((item) => ({
        type: "vocabulary_review",
        occurredAt: item.reviewedAt,
      })),
      ...characters.map((item) => ({
        type: "character_practice",
        occurredAt: item.createdAt,
      })),
    ];
  },

  async listRecentLessonActivity(userId, limit = 8) {
    return (await collection(STUDENT_COLLECTIONS.lessonProgress))
      .aggregate([
        {
          $match: {
            userId: toObjectId(userId),
            completed: true,
            completedAt: { $type: "date" },
          },
        },
        { $sort: { completedAt: -1 } },
        { $limit: limit },
        {
          $lookup: {
            from: LEARNING_COLLECTIONS.lessons,
            localField: "lessonId",
            foreignField: "_id",
            as: "lesson",
          },
        },
        { $unwind: "$lesson" },
        { $match: { "lesson.status": "published" } },
        {
          $lookup: {
            from: LEARNING_COLLECTIONS.units,
            localField: "lesson.unitId",
            foreignField: "_id",
            as: "unit",
          },
        },
        { $unwind: "$unit" },
        {
          $lookup: {
            from: LEARNING_COLLECTIONS.courses,
            let: { courseId: "$unit.courseId" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$_id", "$$courseId"] },
                  status: "published",
                },
              },
            ],
            as: "course",
          },
        },
        { $unwind: "$course" },
        {
          $project: {
            _id: 1,
            lessonTitle: "$lesson.title",
            lessonSlug: "$lesson.slug",
            courseTitle: "$course.title",
            courseSlug: "$course.slug",
            completedAt: 1,
          },
        },
      ])
      .toArray();
  },

  async findIncompleteQuizLesson(userId) {
    const [item] = await (
      await collection(STUDENT_COLLECTIONS.enrollments)
    )
      .aggregate([
        { $match: { userId: toObjectId(userId), status: "active" } },
        {
          $lookup: {
            from: LEARNING_COLLECTIONS.courses,
            let: { courseId: "$courseId" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$_id", "$$courseId"] },
                  status: "published",
                },
              },
            ],
            as: "course",
          },
        },
        { $unwind: "$course" },
        {
          $lookup: {
            from: LEARNING_COLLECTIONS.units,
            localField: "courseId",
            foreignField: "courseId",
            as: "unit",
          },
        },
        { $unwind: "$unit" },
        {
          $lookup: {
            from: LEARNING_COLLECTIONS.lessons,
            let: { unitId: "$unit._id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$unitId", "$$unitId"] },
                  status: "published",
                  type: "quiz",
                },
              },
            ],
            as: "lesson",
          },
        },
        { $unwind: "$lesson" },
        {
          $lookup: {
            from: QUIZ_COLLECTIONS.quizzes,
            let: { lessonId: "$lesson._id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$lessonId", "$$lessonId"] },
                  status: "published",
                },
              },
            ],
            as: "quiz",
          },
        },
        { $unwind: "$quiz" },
        {
          $lookup: {
            from: STUDENT_COLLECTIONS.lessonProgress,
            let: { lessonId: "$lesson._id", studentId: "$userId" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$lessonId", "$$lessonId"] },
                      { $eq: ["$userId", "$$studentId"] },
                      { $eq: ["$completed", true] },
                    ],
                  },
                },
              },
            ],
            as: "completion",
          },
        },
        { $match: { completion: { $size: 0 } } },
        { $sort: { "course.order": 1, "unit.order": 1, "lesson.order": 1 } },
        { $limit: 1 },
        {
          $project: {
            _id: 0,
            quizId: "$quiz._id",
            quizTitle: "$quiz.title",
            lessonTitle: "$lesson.title",
            lessonSlug: "$lesson.slug",
            courseTitle: "$course.title",
            courseSlug: "$course.slug",
          },
        },
      ])
      .toArray();
    return item || null;
  },

  async listPublishedCharactersByIds(ids) {
    const characterIds = ids.map(toObjectId).filter(Boolean);
    if (!characterIds.length) return [];
    return (await collection(CHARACTER_COLLECTIONS.characters))
      .find({ _id: { $in: characterIds }, status: "published" })
      .toArray();
  },
};
