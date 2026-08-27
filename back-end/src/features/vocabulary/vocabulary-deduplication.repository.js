import { getCollection } from "../../config/db.js";
import { toObjectId } from "../../utils/objectId.js";
import {
  ensureVocabularyIndexes,
  VOCABULARY_COLLECTIONS,
} from "./vocabulary.repository.js";

async function collection(name) {
  await ensureVocabularyIndexes();
  return getCollection(name);
}

function objectIds(values = []) {
  return values.map((value) => toObjectId(value)).filter(Boolean);
}

async function groupedReferenceCounts(name, ids) {
  if (!ids.length) return [];
  return (await collection(name))
    .aggregate([
      { $match: { vocabularyId: { $in: ids } } },
      { $group: { _id: "$vocabularyId", count: { $sum: 1 } } },
    ])
    .toArray();
}

export const vocabularyDeduplicationRepository = {
  async listDuplicateGroups() {
    return (await collection(VOCABULARY_COLLECTIONS.vocabulary))
      .aggregate(
        [
          {
            $group: {
              _id: {
                lessonId: "$lessonId",
                simplified: {
                  $trim: { input: { $ifNull: ["$simplified", ""] } },
                },
                pinyin: {
                  $trim: { input: { $ifNull: ["$pinyin", ""] } },
                },
              },
              count: { $sum: 1 },
              items: { $push: "$$ROOT" },
            },
          },
          { $match: { count: { $gt: 1 } } },
          {
            $sort: {
              "_id.lessonId": 1,
              "_id.simplified": 1,
              "_id.pinyin": 1,
            },
          },
        ],
        {
          collation: {
            locale: "vi",
            strength: 2,
          },
        },
      )
      .toArray();
  },

  async countLearningReferences(vocabularyIds = []) {
    const ids = objectIds(vocabularyIds);
    const result = Object.fromEntries(
      ids.map((id) => [
        String(id),
        { progress: 0, reviewHistory: 0, total: 0 },
      ]),
    );
    if (!ids.length) return result;

    const [progressCounts, reviewCounts] = await Promise.all([
      groupedReferenceCounts(VOCABULARY_COLLECTIONS.progress, ids),
      groupedReferenceCounts(VOCABULARY_COLLECTIONS.reviewHistory, ids),
    ]);

    for (const row of progressCounts) {
      const key = String(row._id);
      if (!result[key]) result[key] = { progress: 0, reviewHistory: 0, total: 0 };
      result[key].progress = row.count;
    }
    for (const row of reviewCounts) {
      const key = String(row._id);
      if (!result[key]) result[key] = { progress: 0, reviewHistory: 0, total: 0 };
      result[key].reviewHistory = row.count;
    }
    for (const counts of Object.values(result)) {
      counts.total = counts.progress + counts.reviewHistory;
    }
    return result;
  },

  async updateCanonical(id, update) {
    const _id = toObjectId(id);
    if (!_id) return null;
    return (await collection(VOCABULARY_COLLECTIONS.vocabulary)).findOneAndUpdate(
      { _id },
      { $set: update },
      { returnDocument: "after" },
    );
  },

  async deleteDuplicates(ids = []) {
    const values = objectIds(ids);
    if (!values.length) return { deletedCount: 0 };
    return (await collection(VOCABULARY_COLLECTIONS.vocabulary)).deleteMany({
      _id: { $in: values },
    });
  },
};
