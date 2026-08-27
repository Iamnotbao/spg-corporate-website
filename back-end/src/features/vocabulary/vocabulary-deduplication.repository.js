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

function dateValue(value) {
  if (!value) return null;
  const result = new Date(value).getTime();
  return Number.isFinite(result) ? result : null;
}

function progressFreshness(row = {}) {
  const reviewedAt = dateValue(row.lastReviewedAt);
  if (reviewedAt !== null) return { reviewed: 1, time: reviewedAt };
  return {
    reviewed: 0,
    time: dateValue(row.updatedAt) ?? dateValue(row.createdAt) ?? 0,
  };
}

function newerProgress(left = {}, right = {}) {
  const leftFreshness = progressFreshness(left);
  const rightFreshness = progressFreshness(right);
  if (leftFreshness.reviewed !== rightFreshness.reviewed) {
    return leftFreshness.reviewed > rightFreshness.reviewed ? left : right;
  }
  return leftFreshness.time >= rightFreshness.time ? left : right;
}

function earliestDate(left, right) {
  const values = [dateValue(left), dateValue(right)].filter(
    (value) => value !== null,
  );
  return values.length ? new Date(Math.min(...values)) : undefined;
}

function mergeSnapshot(row = {}) {
  return {
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
    reviewCount: Number(row.reviewCount) || 0,
    lapses: Number(row.lapses) || 0,
  };
}

function snapshotMatches(snapshot, row = {}) {
  if (!snapshot) return false;
  return (
    snapshot.updatedAt ===
      (row.updatedAt ? new Date(row.updatedAt).toISOString() : null) &&
    Number(snapshot.reviewCount || 0) === (Number(row.reviewCount) || 0) &&
    Number(snapshot.lapses || 0) === (Number(row.lapses) || 0)
  );
}

function optimisticProgressFilter(row, vocabularyId) {
  const filter = {
    _id: row._id,
    vocabularyId,
    "pendingReviewHistory.reviewId": { $exists: false },
  };
  if (row.updatedAt) filter.updatedAt = row.updatedAt;
  return filter;
}

export function mergeDuplicateProgressState(
  canonicalRow = {},
  duplicateRow = {},
  now = new Date(),
) {
  const latest = newerProgress(canonicalRow, duplicateRow);
  const merged = { ...canonicalRow, ...latest };

  delete merged._id;
  delete merged.userId;
  delete merged.vocabularyId;
  delete merged.pendingReviewHistory;

  merged.saved = Boolean(canonicalRow.saved || duplicateRow.saved);
  merged.reviewCount =
    (Number(canonicalRow.reviewCount) || 0) +
    (Number(duplicateRow.reviewCount) || 0);
  merged.lapses =
    (Number(canonicalRow.lapses) || 0) + (Number(duplicateRow.lapses) || 0);
  merged.createdAt =
    earliestDate(canonicalRow.createdAt, duplicateRow.createdAt) ||
    canonicalRow.createdAt ||
    duplicateRow.createdAt ||
    now;
  merged.updatedAt = now;

  return merged;
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
      .find({ vocabularyId: { $in: ids } })
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
      .find({ vocabularyId: { $in: [canonical, duplicate] } })
      .toArray();

    if (rows.some((row) => row.pendingReviewHistory?.reviewId)) {
      throw manualMergeError("A review is still being synchronized for this duplicate");
    }

    const canonicalByUser = new Map(
      rows
        .filter((row) => String(row.vocabularyId) === String(canonical))
        .map((row) => [String(row.userId), row]),
    );
    const duplicateRows = rows.filter(
      (row) => String(row.vocabularyId) === String(duplicate),
    );
    const snapshotKey = String(duplicate);
    const now = new Date();
    let movedProgress = 0;
    let combinedProgress = 0;

    for (const duplicateRow of duplicateRows) {
      const userKey = String(duplicateRow.userId);
      let canonicalRow = canonicalByUser.get(userKey);

      if (!canonicalRow) {
        const result = await progressCollection.updateOne(
          optimisticProgressFilter(duplicateRow, duplicate),
          { $set: { vocabularyId: canonical, updatedAt: now } },
        );
        if (result.matchedCount !== 1) {
          throw manualMergeError(
            "Student progress changed while duplicate vocabulary was being merged",
          );
        }
        movedProgress += 1;
        canonicalByUser.set(userKey, {
          ...duplicateRow,
          vocabularyId: canonical,
          updatedAt: now,
        });
        continue;
      }

      const previousSnapshot =
        canonicalRow.deduplicationMergeSnapshots?.[snapshotKey];
      if (previousSnapshot) {
        if (!snapshotMatches(previousSnapshot, duplicateRow)) {
          throw manualMergeError(
            "Duplicate progress changed after a previous merge attempt",
          );
        }
      } else {
        const merged = mergeDuplicateProgressState(
          canonicalRow,
          duplicateRow,
          now,
        );
        const snapshot = mergeSnapshot(duplicateRow);
        const updateResult = await progressCollection.updateOne(
          optimisticProgressFilter(canonicalRow, canonical),
          {
            $set: {
              ...merged,
              [`deduplicationMergeSnapshots.${snapshotKey}`]: snapshot,
            },
          },
        );
        if (updateResult.matchedCount !== 1) {
          throw manualMergeError(
            "Canonical student progress changed while duplicate vocabulary was being merged",
          );
        }
        canonicalRow = {
          ...canonicalRow,
          ...merged,
          deduplicationMergeSnapshots: {
            ...(canonicalRow.deduplicationMergeSnapshots || {}),
            [snapshotKey]: snapshot,
          },
        };
        canonicalByUser.set(userKey, canonicalRow);
        combinedProgress += 1;
      }

      const deleteResult = await progressCollection.deleteOne(
        optimisticProgressFilter(duplicateRow, duplicate),
      );
      if (deleteResult.deletedCount !== 1) {
        throw manualMergeError(
          "Duplicate student progress changed before it could be removed",
        );
      }
      movedProgress += 1;
    }

    const historyResult = await historyCollection.updateMany(
      { vocabularyId: duplicate },
      { $set: { vocabularyId: canonical } },
    );
    const deleteResult = await vocabularyCollection.deleteOne({ _id: duplicate });

    if (deleteResult.deletedCount) {
      await progressCollection.updateMany(
        {
          vocabularyId: canonical,
          [`deduplicationMergeSnapshots.${snapshotKey}`]: { $exists: true },
        },
        { $unset: { [`deduplicationMergeSnapshots.${snapshotKey}`]: "" } },
      );
    }

    return {
      movedProgress,
      combinedProgress,
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
