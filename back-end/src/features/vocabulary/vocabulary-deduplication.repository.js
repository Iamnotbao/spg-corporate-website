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

function manualMergeError(message) {
  const error = new Error(message);
  error.status = 409;
  error.code = "VOCABULARY_DUPLICATE_MANUAL_REVIEW";
  return error;
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

  async listProgressRows(vocabularyIds = []) {
    const ids = objectIds(vocabularyIds);
    if (!ids.length) return [];
    return (await collection(VOCABULARY_COLLECTIONS.progress))
      .find(
        { vocabularyId: { $in: ids } },
        {
          projection: {
            userId: 1,
            vocabularyId: 1,
            pendingReviewHistory: 1,
          },
        },
      )
      .toArray();
  },

  async mergeLearningReferences(canonicalId, duplicateId) {
    const canonical = toObjectId(canonicalId);
    const duplicate = toObjectId(duplicateId);
    if (!canonical || !duplicate || String(canonical) === String(duplicate)) {
      throw manualMergeError("Invalid duplicate merge target");
    }

    const progressCollection = await collection(VOCABULARY_COLLECTIONS.progress);
    const historyCollection = await collection(VOCABULARY_COLLECTIONS.reviewHistory);
    const vocabularyCollection = await collection(VOCABULARY_COLLECTIONS.vocabulary);

    const rows = await progressCollection
      .find(
        { vocabularyId: { $in: [canonical, duplicate] } },
        { projection: { userId: 1, vocabularyId: 1, pendingReviewHistory: 1 } },
      )
      .toArray();

    if (rows.some((row) => row.pendingReviewHistory?.reviewId)) {
      throw manualMergeError("A review is still being synchronized for this duplicate");
    }

    const canonicalUsers = new Set(
      rows
        .filter((row) => String(row.vocabularyId) === String(canonical))
        .map((row) => String(row.userId)),
    );
    const duplicateUsers = rows
      .filter((row) => String(row.vocabularyId) === String(duplicate))
      .map((row) => String(row.userId));

    if (duplicateUsers.some((userId) => canonicalUsers.has(userId))) {
      throw manualMergeError(
        "At least one student has progress for both vocabulary records",
      );
    }

    const progressResult = await progressCollection.updateMany(
      { vocabularyId: duplicate },
      { $set: { vocabularyId: canonical, updatedAt: new Date() } },
    );
    const historyResult = await historyCollection.updateMany(
      { vocabularyId: duplicate },
      { $set: { vocabularyId: canonical } },
    );
    const deleteResult = await vocabularyCollection.deleteOne({ _id: duplicate });

    return {
      movedProgress: progressResult.modifiedCount || 0,
      movedReviewHistory: historyResult.modifiedCount || 0,
      deletedCount: deleteResult.deletedCount || 0,
    };
  },

  async deleteDuplicates(ids = []) {
    const values = objectIds(ids);
    if (!values.length) return { deletedCount: 0 };
    return (await collection(VOCABULARY_COLLECTIONS.vocabulary)).deleteMany({
      _id: { $in: values },
    });
  },
};
