import { vocabularyDeduplicationRepository } from "./vocabulary-deduplication.repository.js";

function idOf(item) {
  return String(item?._id || "");
}

function createdAtValue(item) {
  const raw = item?.createdAt;
  if (!raw) return Number.POSITIVE_INFINITY;
  const value = new Date(raw).getTime();
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
}

function summarizeItem(item, references = {}) {
  return {
    id: idOf(item),
    lessonId: String(item?.lessonId || ""),
    simplified: item?.simplified || "",
    pinyin: item?.pinyin || "",
    meaningVietnamese: item?.meaningVietnamese || "",
    status: item?.status || "draft",
    createdAt: item?.createdAt || null,
    references: {
      progress: references.progress || 0,
      reviewHistory: references.reviewHistory || 0,
      total: references.total || 0,
    },
  };
}

function compareCandidates(left, right, referenceCounts) {
  const leftRefs = referenceCounts[idOf(left)]?.total || 0;
  const rightRefs = referenceCounts[idOf(right)]?.total || 0;
  if (leftRefs !== rightRefs) return rightRefs - leftRefs;

  const leftCreatedAt = createdAtValue(left);
  const rightCreatedAt = createdAtValue(right);
  if (leftCreatedAt !== rightCreatedAt) return leftCreatedAt - rightCreatedAt;

  return idOf(left).localeCompare(idOf(right));
}

function progressByVocabulary(rows = []) {
  const result = new Map();
  for (const row of rows) {
    const key = String(row.vocabularyId || "");
    if (!result.has(key)) result.set(key, []);
    result.get(key).push(row);
  }
  return result;
}

function hasPendingReview(rows = []) {
  return rows.some((row) => row?.pendingReviewHistory?.reviewId);
}

function manualReason(reason) {
  if (reason === "pending-review") {
    return "Có lượt ôn tập đang chờ đồng bộ nên hệ thống chưa gộp tự động.";
  }
  return "Cần kiểm tra dữ liệu học tập trước khi gộp.";
}

export function createVocabularyDeduplicationService(
  repository = vocabularyDeduplicationRepository,
) {
  async function analyze() {
    const groups = await repository.listDuplicateGroups();
    const ids = groups.flatMap((group) => group.items.map(idOf));
    const [referenceCounts, progressRows] = await Promise.all([
      repository.countLearningReferences(ids),
      repository.listProgressRows(ids),
    ]);
    const progressMap = progressByVocabulary(progressRows);

    const analyzedGroups = groups.map((group) => {
      const sorted = [...group.items].sort((left, right) =>
        compareCandidates(left, right, referenceCounts),
      );
      const canonical = sorted[0];
      const redundant = sorted.slice(1);
      const canonicalId = idOf(canonical);
      const canonicalRows = progressMap.get(canonicalId) || [];
      const pendingInCanonical = hasPendingReview(canonicalRows);
      const deletableIds = [];
      const mergeableIds = [];
      const manualItems = [];
      const duplicateSummaries = [];

      for (const item of redundant) {
        const duplicateId = idOf(item);
        const references = referenceCounts[duplicateId] || {};
        const rows = progressMap.get(duplicateId) || [];
        let mergeStatus = "delete";
        let reason = "";

        if ((references.total || 0) === 0) {
          deletableIds.push(duplicateId);
        } else if (pendingInCanonical || hasPendingReview(rows)) {
          mergeStatus = "manual";
          reason = "pending-review";
          manualItems.push({ id: duplicateId, reason, message: manualReason(reason) });
        } else {
          mergeStatus = "merge";
          mergeableIds.push(duplicateId);
        }

        duplicateSummaries.push({
          ...summarizeItem(item, references),
          mergeStatus,
          manualReason: reason ? manualReason(reason) : "",
        });
      }

      return {
        key: {
          lessonId: String(group._id?.lessonId || ""),
          simplified: group._id?.simplified || "",
          pinyin: group._id?.pinyin || "",
        },
        canonical: summarizeItem(canonical, referenceCounts[canonicalId]),
        duplicates: duplicateSummaries,
        deletableIds,
        mergeableIds,
        manualItems,
        manualIds: manualItems.map((item) => item.id),
      };
    });

    const rawSummary = analyzedGroups.reduce(
      (result, group) => {
        result.redundantRecords += group.duplicates.length;
        result.unreferencedRecords += group.deletableIds.length;
        result.mergeableRecords += group.mergeableIds.length;
        result.manualRecords += group.manualIds.length;
        return result;
      },
      {
        duplicateGroups: analyzedGroups.length,
        redundantRecords: 0,
        unreferencedRecords: 0,
        mergeableRecords: 0,
        manualRecords: 0,
      },
    );

    const actionableRecords =
      rawSummary.unreferencedRecords + rawSummary.mergeableRecords;

    return {
      groups: analyzedGroups,
      summary: {
        ...rawSummary,
        actionableRecords,
        deletableRecords: actionableRecords,
        protectedRecords: rawSummary.manualRecords,
      },
    };
  }

  return {
    analyze,

    async cleanup() {
      const report = await analyze();
      const deletableIds = report.groups.flatMap((group) => group.deletableIds);
      const deleteResult = await repository.deleteDuplicates(deletableIds);
      let merged = 0;
      let movedProgress = 0;
      let combinedProgress = 0;
      let movedReviewHistory = 0;
      const mergeFailures = [];

      for (const group of report.groups) {
        for (const duplicateId of group.mergeableIds) {
          try {
            const result = await repository.mergeLearningReferences(
              group.canonical.id,
              duplicateId,
            );
            if (result.deletedCount) merged += 1;
            movedProgress += result.movedProgress || 0;
            combinedProgress += result.combinedProgress || 0;
            movedReviewHistory += result.movedReviewHistory || 0;
          } catch (error) {
            mergeFailures.push({
              id: duplicateId,
              message: error?.message || "Không thể gộp bản ghi trùng.",
            });
          }
        }
      }

      const deletedUnreferenced = deleteResult.deletedCount || 0;
      const processed = deletedUnreferenced + merged;
      const manualRecords = report.summary.manualRecords + mergeFailures.length;

      return {
        ...report,
        deletedUnreferenced,
        deleted: processed,
        merged,
        movedProgress,
        combinedProgress,
        movedReviewHistory,
        mergeFailures,
        summary: {
          ...report.summary,
          manualRecords,
          protectedRecords: manualRecords,
        },
        message:
          manualRecords > 0
            ? "Đã xử lý các bản trùng an toàn. Một số bản ghi cần kiểm tra thủ công."
            : "Đã gộp dữ liệu học tập và xóa các bản ghi từ vựng trùng.",
      };
    },
  };
}

export const vocabularyDeduplicationService =
  createVocabularyDeduplicationService();
