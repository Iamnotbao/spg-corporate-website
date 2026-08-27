import { getCollection } from "../../config/db.js";
import { toObjectId } from "../../utils/objectId.js";
import {
  CHARACTER_COLLECTIONS,
  ensureCharacterIndexes,
} from "../character/character.repository.js";
import { LEARNING_COLLECTIONS } from "../learning/learning.constants.js";
import { ensureLearningIndexes } from "../learning/learning.repository.js";

export const VOCABULARY_COLLECTIONS = Object.freeze({
  vocabulary: "vocabularies",
  progress: "vocabulary_progress",
  reviewHistory: "vocabulary_review_history",
});

let indexPromise;

export async function ensureVocabularyIndexes() {
  if (!indexPromise) {
    indexPromise = Promise.all([
      getCollection(VOCABULARY_COLLECTIONS.vocabulary).then((collection) =>
        Promise.all([
          collection.createIndex({ lessonId: 1, status: 1 }),
          collection.createIndex({ status: 1, hskLevel: 1, simplified: 1, _id: 1 }),
          collection.createIndex({ characterIds: 1 }),
        ]),
      ),
      getCollection(VOCABULARY_COLLECTIONS.progress).then((collection) =>
        Promise.all([
          collection.createIndex(
            { userId: 1, vocabularyId: 1 },
            { unique: true },
          ),
          collection.createIndex({ userId: 1, saved: 1, updatedAt: -1 }),
          collection.createIndex({ userId: 1, saved: 1, nextReviewAt: 1 }),
        ]),
      ),
      getCollection(VOCABULARY_COLLECTIONS.reviewHistory).then((collection) =>
        Promise.all([
          collection.createIndex({ reviewId: 1 }, { unique: true }),
          collection.createIndex({ userId: 1, reviewedAt: -1 }),
          collection.createIndex({
            userId: 1,
            vocabularyId: 1,
            reviewedAt: -1,
          }),
        ]),
      ),
      ensureLearningIndexes(),
      ensureCharacterIndexes(),
    ]).catch((error) => {
      indexPromise = undefined;
      throw error;
    });
  }
  return indexPromise;
}

async function collection(name) {
  await ensureVocabularyIndexes();
  return getCollection(name);
}

function idFilter(id) {
  const value = toObjectId(id);
  return value ? { _id: value } : { _id: null };
}

export const vocabularyRepository = {
  async list(filter = {}) {
    return (await collection(VOCABULARY_COLLECTIONS.vocabulary))
      .find(filter)
      .sort({ hskLevel: 1, simplified: 1, _id: 1 })
      .toArray();
  },
  async listPage(filter = {}, { skip = 0, limit = 10 } = {}) {
    return (await collection(VOCABULARY_COLLECTIONS.vocabulary))
      .find(filter)
      .sort({ hskLevel: 1, simplified: 1, _id: 1 })
      .skip(skip)
      .limit(limit)
      .toArray();
  },
  async count(filter = {}) {
    return (await collection(VOCABULARY_COLLECTIONS.vocabulary)).countDocuments(filter);
  },
  async listPublicPage(filter = {}, { skip = 0, limit = 12 } = {}) {
    const [result = { data: [], metadata: [] }] = await (
      await collection(VOCABULARY_COLLECTIONS.vocabulary)
    )
      .aggregate([
        { $match: { ...filter, status: "published" } },
        {
          $lookup: {
            from: LEARNING_COLLECTIONS.lessons,
            let: { lessonId: "$lessonId" },
            pipeline: [
              { $match: { $expr: { $eq: ["$_id", "$$lessonId"] }, status: "published" } },
              { $project: { unitId: 1 } },
            ],
            as: "publicLesson",
          },
        },
        { $unwind: "$publicLesson" },
        {
          $lookup: {
            from: LEARNING_COLLECTIONS.units,
            localField: "publicLesson.unitId",
            foreignField: "_id",
            as: "publicUnit",
          },
        },
        { $unwind: "$publicUnit" },
        {
          $lookup: {
            from: LEARNING_COLLECTIONS.courses,
            let: { courseId: "$publicUnit.courseId" },
            pipeline: [
              { $match: { $expr: { $eq: ["$_id", "$$courseId"] }, status: "published" } },
              { $project: { _id: 1 } },
            ],
            as: "publicCourse",
          },
        },
        { $unwind: "$publicCourse" },
        { $sort: { hskLevel: 1, simplified: 1, _id: 1 } },
        {
          $facet: {
            data: [
              { $skip: skip },
              { $limit: limit },
              { $project: { publicLesson: 0, publicUnit: 0, publicCourse: 0 } },
            ],
            metadata: [{ $count: "total" }],
          },
        },
      ])
      .toArray();
    return { items: result.data, total: result.metadata[0]?.total || 0 };
  },
  async listSavedPublicPage(userId, vocabularyFilter = {}, { skip = 0, limit = 12 } = {}) {
    const [result = { data: [], metadata: [] }] = await (
      await collection(VOCABULARY_COLLECTIONS.progress)
    )
      .aggregate([
        { $match: { userId: toObjectId(userId), saved: true } },
        {
          $lookup: {
            from: VOCABULARY_COLLECTIONS.vocabulary,
            let: { vocabularyId: "$vocabularyId" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$_id", "$$vocabularyId"] },
                  status: "published",
                  ...vocabularyFilter,
                },
              },
            ],
            as: "vocabulary",
          },
        },
        { $unwind: "$vocabulary" },
        {
          $lookup: {
            from: LEARNING_COLLECTIONS.lessons,
            let: { lessonId: "$vocabulary.lessonId" },
            pipeline: [
              { $match: { $expr: { $eq: ["$_id", "$$lessonId"] }, status: "published" } },
              { $project: { unitId: 1 } },
            ],
            as: "publicLesson",
          },
        },
        { $unwind: "$publicLesson" },
        {
          $lookup: {
            from: LEARNING_COLLECTIONS.units,
            localField: "publicLesson.unitId",
            foreignField: "_id",
            as: "publicUnit",
          },
        },
        { $unwind: "$publicUnit" },
        {
          $lookup: {
            from: LEARNING_COLLECTIONS.courses,
            let: { courseId: "$publicUnit.courseId" },
            pipeline: [
              { $match: { $expr: { $eq: ["$_id", "$$courseId"] }, status: "published" } },
              { $project: { _id: 1 } },
            ],
            as: "publicCourse",
          },
        },
        { $unwind: "$publicCourse" },
        { $sort: { updatedAt: -1, _id: -1 } },
        {
          $facet: {
            data: [
              { $skip: skip },
              { $limit: limit },
              { $project: { vocabulary: 1, savedAt: "$updatedAt" } },
            ],
            metadata: [{ $count: "total" }],
          },
        },
      ])
      .toArray();
    return { items: result.data, total: result.metadata[0]?.total || 0 };
  },
  async listSavedIds(userId, vocabularyIds) {
    if (!vocabularyIds.length) return [];
    return (await collection(VOCABULARY_COLLECTIONS.progress))
      .find(
        {
          userId: toObjectId(userId),
          vocabularyId: { $in: vocabularyIds.map(toObjectId).filter(Boolean) },
          saved: true,
        },
        { projection: { vocabularyId: 1 } },
      )
      .limit(100)
      .toArray();
  },
  async find(id, filter = {}) {
    return (await collection(VOCABULARY_COLLECTIONS.vocabulary)).findOne({
      ...idFilter(id),
      ...filter,
    });
  },
  async create(document) {
    const result = await (
      await collection(VOCABULARY_COLLECTIONS.vocabulary)
    ).insertOne(document);
    return { ...document, _id: result.insertedId };
  },
  async insertMany(documents) {
    if (!documents.length) return { insertedCount: 0, failures: [] };
    try {
      const result = await (
        await collection(VOCABULARY_COLLECTIONS.vocabulary)
      ).insertMany(documents, { ordered: false });
      return { insertedCount: result.insertedCount, failures: [] };
    } catch (error) {
      const writeErrors = Array.isArray(error?.writeErrors)
        ? error.writeErrors
        : [];
      if (!writeErrors.length) throw error;
      return {
        insertedCount:
          error?.result?.insertedCount ??
          Math.max(0, documents.length - writeErrors.length),
        failures: writeErrors.map((writeError) => ({
          index: writeError.index,
          message: "Unable to insert this vocabulary row",
        })),
      };
    }
  },
  async listLessonIdentities(lessonId) {
    return (await collection(VOCABULARY_COLLECTIONS.vocabulary))
      .find(
        { lessonId: toObjectId(lessonId) },
        { projection: { simplified: 1, pinyin: 1 } },
      )
      .toArray();
  },
  async update(id, update) {
    return (
      await collection(VOCABULARY_COLLECTIONS.vocabulary)
    ).findOneAndUpdate(
      idFilter(id),
      { $set: update },
      { returnDocument: "after" },
    );
  },
  async delete(id) {
    return (await collection(VOCABULARY_COLLECTIONS.vocabulary)).deleteOne(
      idFilter(id),
    );
  },
  async countProgress(vocabularyId) {
    return (await collection(VOCABULARY_COLLECTIONS.progress)).countDocuments({
      vocabularyId: toObjectId(vocabularyId),
    });
  },
  async findLesson(id) {
    return (await collection(LEARNING_COLLECTIONS.lessons)).findOne(
      idFilter(id),
    );
  },
  async listPublishedLessons(ids) {
    return (await collection(LEARNING_COLLECTIONS.lessons))
      .find({ _id: { $in: ids }, status: "published" })
      .toArray();
  },
  async listUnits(ids) {
    return (await collection(LEARNING_COLLECTIONS.units))
      .find({ _id: { $in: ids } })
      .toArray();
  },
  async listPublishedCourses(ids) {
    return (await collection(LEARNING_COLLECTIONS.courses))
      .find({ _id: { $in: ids }, status: "published" })
      .toArray();
  },
  async listCharactersBySimplified(values, filter = {}) {
    const simplified = [
      ...new Set(values.map((value) => String(value).trim())),
    ].filter(Boolean);
    if (!simplified.length) return [];
    return (await collection(CHARACTER_COLLECTIONS.characters))
      .find({ simplified: { $in: simplified }, ...filter })
      .toArray();
  },
  async insertCharacters(documents) {
    if (!documents.length) return;
    try {
      await (
        await collection(CHARACTER_COLLECTIONS.characters)
      ).insertMany(documents, {
        ordered: false,
      });
    } catch (error) {
      const writeErrors = Array.isArray(error?.writeErrors)
        ? error.writeErrors
        : [];
      const duplicateOnly =
        writeErrors.length > 0 &&
        writeErrors.every((item) => item?.code === 11000);
      if (!duplicateOnly) throw error;
    }
  },
  async save(userId, vocabularyId, now, initialState = {}) {
    const filter = {
      userId: toObjectId(userId),
      vocabularyId: toObjectId(vocabularyId),
    };
    return (await collection(VOCABULARY_COLLECTIONS.progress)).findOneAndUpdate(
      filter,
      {
        $setOnInsert: {
          ...filter,
          createdAt: now,
          ...initialState,
        },
        $set: { saved: true, updatedAt: now },
      },
      { upsert: true, returnDocument: "after" },
    );
  },
  async unsave(userId, vocabularyId, now) {
    return (await collection(VOCABULARY_COLLECTIONS.progress)).findOneAndUpdate(
      {
        userId: toObjectId(userId),
        vocabularyId: toObjectId(vocabularyId),
      },
      { $set: { saved: false, updatedAt: now } },
      { returnDocument: "after" },
    );
  },
  async findProgress(userId, vocabularyId) {
    return (await collection(VOCABULARY_COLLECTIONS.progress)).findOne({
      userId: toObjectId(userId),
      vocabularyId: toObjectId(vocabularyId),
    });
  },
  async updateProgress(userId, vocabularyId, update) {
    return (await collection(VOCABULARY_COLLECTIONS.progress)).findOneAndUpdate(
      {
        userId: toObjectId(userId),
        vocabularyId: toObjectId(vocabularyId),
      },
      { $set: update },
      { returnDocument: "after" },
    );
  },
  async persistReview(
    userId,
    vocabularyId,
    expectedReviewCount,
    update,
    history,
  ) {
    const progressCollection = await collection(
      VOCABULARY_COLLECTIONS.progress,
    );
    const historyCollection = await collection(
      VOCABULARY_COLLECTIONS.reviewHistory,
    );
    const next = await progressCollection.findOneAndUpdate(
      {
        userId: toObjectId(userId),
        vocabularyId: toObjectId(vocabularyId),
        saved: true,
        $expr: {
          $eq: [{ $ifNull: ["$reviewCount", 0] }, expectedReviewCount],
        },
      },
      { $set: { ...update, pendingReviewHistory: history } },
      { returnDocument: "after" },
    );
    if (!next) return null;
    try {
      await historyCollection.insertOne(history);
    } catch (error) {
      if (error?.code !== 11000) throw error;
    }
    await progressCollection.updateOne(
      {
        _id: next._id,
        "pendingReviewHistory.reviewId": history.reviewId,
      },
      { $unset: { pendingReviewHistory: "" } },
    );
    delete next.pendingReviewHistory;
    return next;
  },
  async reconcilePendingReviewHistory(userId, limit = 20) {
    const progressCollection = await collection(
      VOCABULARY_COLLECTIONS.progress,
    );
    const historyCollection = await collection(
      VOCABULARY_COLLECTIONS.reviewHistory,
    );
    const rows = await progressCollection
      .find({
        userId: toObjectId(userId),
        "pendingReviewHistory.reviewId": { $type: "string" },
      })
      .limit(limit)
      .toArray();
    for (const row of rows) {
      try {
        await historyCollection.insertOne(row.pendingReviewHistory);
      } catch (error) {
        if (error?.code !== 11000) throw error;
      }
      await progressCollection.updateOne(
        {
          _id: row._id,
          "pendingReviewHistory.reviewId": row.pendingReviewHistory.reviewId,
        },
        { $unset: { pendingReviewHistory: "" } },
      );
    }
  },
  async listReviewHistory(userId, limit = 50) {
    return (await collection(VOCABULARY_COLLECTIONS.reviewHistory))
      .find({ userId: toObjectId(userId) })
      .sort({ reviewedAt: -1, _id: -1 })
      .limit(limit)
      .toArray();
  },
  async listDueProgress(userId, now, limit = 20) {
    return (await collection(VOCABULARY_COLLECTIONS.progress))
      .find({
        userId: toObjectId(userId),
        saved: true,
        $or: [
          { nextReviewAt: { $lte: now } },
          { nextReviewAt: { $exists: false } },
          { nextReviewAt: null },
        ],
      })
      .sort({ nextReviewAt: 1, updatedAt: 1 })
      .limit(limit)
      .toArray();
  },
  async countDueProgress(userId, now) {
    return (await collection(VOCABULARY_COLLECTIONS.progress)).countDocuments({
      userId: toObjectId(userId),
      saved: true,
      $or: [
        { nextReviewAt: { $lte: now } },
        { nextReviewAt: { $exists: false } },
        { nextReviewAt: null },
      ],
    });
  },
  async countSavedProgress(userId) {
    return (await collection(VOCABULARY_COLLECTIONS.progress)).countDocuments({
      userId: toObjectId(userId),
      saved: true,
    });
  },
  toObjectId,
};
