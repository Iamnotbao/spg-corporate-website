import { getCollection } from "../../config/db.js";
import { toObjectId } from "../../utils/objectId.js";
import { LEARNING_COLLECTIONS } from "../learning/learning.constants.js";
import { VOCABULARY_COLLECTIONS, ensureVocabularyIndexes } from "./vocabulary.repository.js";

export const LESSON_VOCABULARY_COLLECTION = "lesson_vocabulary";

let indexPromise;

async function linksCollection() {
  await ensureVocabularyIndexes();
  if (!indexPromise) {
    indexPromise = getCollection(LESSON_VOCABULARY_COLLECTION)
      .then(async (collection) => {
        await Promise.all([
          collection.createIndex({ lessonId: 1, vocabularyId: 1 }, { unique: true }),
          collection.createIndex({ vocabularyId: 1, lessonId: 1 }),
        ]);
        return collection;
      })
      .catch((error) => {
        indexPromise = undefined;
        throw error;
      });
  }
  return indexPromise;
}

export const lessonVocabularyRepository = {
  toObjectId,

  async findLesson(id, { published = false } = {}) {
    const filter = {
      _id: toObjectId(id),
      deletedAt: { $exists: false },
    };
    if (published) filter.status = "published";
    return getCollection(LEARNING_COLLECTIONS.lessons).then((collection) =>
      collection.findOne(filter),
    );
  },

  async findUnit(id) {
    return getCollection(LEARNING_COLLECTIONS.units).then((collection) =>
      collection.findOne({ _id: toObjectId(id), deletedAt: { $exists: false } }),
    );
  },

  async findPublishedCourse(id) {
    return getCollection(LEARNING_COLLECTIONS.courses).then((collection) =>
      collection.findOne({
        _id: toObjectId(id),
        status: "published",
        deletedAt: { $exists: false },
      }),
    );
  },

  async listLinkedIds(lessonId) {
    const rows = await (await linksCollection())
      .find({ lessonId: toObjectId(lessonId) }, { projection: { vocabularyId: 1 } })
      .sort({ order: 1, _id: 1 })
      .toArray();
    return rows.map((row) => row.vocabularyId);
  },

  async replaceLinks(lessonId, vocabularyIds) {
    const collection = await linksCollection();
    const lessonObjectId = toObjectId(lessonId);
    await collection.deleteMany({ lessonId: lessonObjectId });
    if (!vocabularyIds.length) return [];
    const now = new Date();
    const documents = vocabularyIds.map((vocabularyId, index) => ({
      lessonId: lessonObjectId,
      vocabularyId: toObjectId(vocabularyId),
      order: index,
      createdAt: now,
      updatedAt: now,
    }));
    await collection.insertMany(documents, { ordered: true });
    return documents;
  },

  async countVocabulary(ids) {
    if (!ids.length) return 0;
    return getCollection(VOCABULARY_COLLECTIONS.vocabulary).then((collection) =>
      collection.countDocuments({
        _id: { $in: ids.map(toObjectId).filter(Boolean) },
        deletedAt: { $exists: false },
      }),
    );
  },

  async listLessonVocabularyPage(
    lessonId,
    linkedIds,
    query,
    { skip = 0, limit = 12 } = {},
  ) {
    const legacyLessonId = toObjectId(lessonId);
    const linkedObjectIds = linkedIds.map(toObjectId).filter(Boolean);
    const relationFilter = linkedObjectIds.length
      ? { $or: [{ _id: { $in: linkedObjectIds } }, { lessonId: legacyLessonId }] }
      : { lessonId: legacyLessonId };
    const filter = {
      ...relationFilter,
      ...query,
      status: "published",
      deletedAt: { $exists: false },
    };
    const collection = await getCollection(VOCABULARY_COLLECTIONS.vocabulary);
    const [items, total] = await Promise.all([
      collection
        .find(filter)
        .sort({ hskLevel: 1, simplified: 1, _id: 1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      collection.countDocuments(filter),
    ]);
    return { items, total };
  },

  async listSavedLibraryPage(userId, vocabularyFilter, { skip = 0, limit = 12 } = {}) {
    const [result = { data: [], metadata: [] }] = await getCollection(
      VOCABULARY_COLLECTIONS.progress,
    ).then((collection) =>
      collection
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
                    deletedAt: { $exists: false },
                    ...vocabularyFilter,
                  },
                },
              ],
              as: "vocabulary",
            },
          },
          { $unwind: "$vocabulary" },
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
        .toArray(),
    );
    return { items: result.data, total: result.metadata[0]?.total || 0 };
  },

  async removeVocabularyLinks(vocabularyId) {
    return (await linksCollection()).deleteMany({ vocabularyId: toObjectId(vocabularyId) });
  },
};
