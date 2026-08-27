import { vocabularyDeduplicationRepository } from "./vocabulary-deduplication.repository.js";

function idOf(item) {
  return String(item?._id || "");
}

function createdAtValue(item) {
  const value = new Date(item?.createdAt || 0).getTime();
  return Number.isFinite(value) ? value : 0;
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

export function createVocabularyDeduplicationService(
  repository = vocabularyDeduplicationRepository,
) {
  async function analyze() {
    const groups = await repository.listDuplicateGroups();
    const ids = groups.flatMap((group) => group.items.map(idOf));
    const referenceCounts = await repository.countLearningReferences(ids);

    const analyzedGroups = groups.map((group) => {
      const sorted = [...group.items].sort((left, right) =>
        compareCandidates(left, right, referenceCounts),
      );
      const canonical = sorted[0];
      const redundant = sorted.slice(1);
      const deletable = redundant.filter(
        (item) => (referenceCounts[idOf(item)]?.total || 0) === 0,
      );
      const protectedItems = redundant.filter(
        (item) => (referenceCounts[idOf(item)]?.total || 0) > 0,
      );

      return {
        key: {
          lessonId: String(group._id?.lessonId || ""),
          simplified: group._id?.simplified || "",
          pinyin: group._id?.pinyin || "",
        },
        canonical: summarizeItem(canonical, referenceCounts[idOf(canonical)]),
        duplicates: redundant.map((item) =>
          summarizeItem(item, referenceCounts[idOf(item)]),
        ),
        deletableIds: deletable.map(idOf),
        protectedIds: protectedItems.map(idOf),
      };
    });

    const deletableCount = analyzedGroups.reduce(
      (sum, group) => sum + group.deletableIds.length,
      0,
    );
    const protectedCount = analyzedGroups.reduce(
      (sum, group) => sum + group.protectedIds.length,
      0,
    );

    return {
      groups: analyzedGroups,
      summary: {
        duplicateGroups: analyzedGroups.length,
        redundantRecords: analyzedGroups.reduce(
          (sum, group) => sum + group.duplicates.length,
          0,
        ),
        deletableRecords: deletableCount,
        protectedRecords: protectedCount,
      },
    };
  }

  return {
    analyze,

    async cleanup() {
      const report = await analyze();
      const deletableIds = report.groups.flatMap((group) => group.deletableIds);
      const result = await repository.deleteDuplicates(deletableIds);

      return {
        ...report,
        deleted: result.deletedCount || 0,
        message:
          report.summary.protectedRecords > 0
            ? "Deleted unreferenced duplicates. Referenced duplicates were kept to protect student learning history."
            : "Deleted duplicate vocabulary records.",
      };
    },
  };
}

export const vocabularyDeduplicationService =
  createVocabularyDeduplicationService();
