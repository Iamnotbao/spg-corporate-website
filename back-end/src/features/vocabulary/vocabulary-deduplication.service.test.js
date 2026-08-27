import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import { createVocabularyDeduplicationService } from "./vocabulary-deduplication.service.js";

const lessonId = new ObjectId("707f1f77bcf86cd799439015");
const firstId = new ObjectId("707f1f77bcf86cd799439016");
const secondId = new ObjectId("707f1f77bcf86cd799439017");
const firstUserId = new ObjectId("707f1f77bcf86cd799439019");
const secondUserId = new ObjectId("707f1f77bcf86cd799439020");

function word(id, overrides = {}) {
  return {
    _id: id,
    lessonId,
    simplified: "学习",
    pinyin: "xuéxí",
    meaningVietnamese: "học tập",
    status: "draft",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function repository(overrides = {}) {
  return {
    async listDuplicateGroups() {
      return [
        {
          _id: { lessonId, simplified: "学习", pinyin: "xuéxí" },
          count: 2,
          items: [word(firstId), word(secondId)],
        },
      ];
    },
    async countLearningReferences(ids) {
      return Object.fromEntries(
        ids.map((id) => [String(id), { progress: 0, reviewHistory: 0, total: 0 }]),
      );
    },
    async listProgressRows() {
      return [];
    },
    async deleteDuplicates(ids) {
      return { deletedCount: ids.length };
    },
    async mergeLearningReferences() {
      return {
        movedProgress: 0,
        combinedProgress: 0,
        movedReviewHistory: 0,
        deletedCount: 1,
      };
    },
    ...overrides,
  };
}

test("duplicate cleanup keeps one canonical record and deletes unreferenced redundant rows", async () => {
  let deletedIds = [];
  const service = createVocabularyDeduplicationService(
    repository({
      async deleteDuplicates(ids) {
        deletedIds = ids;
        return { deletedCount: ids.length };
      },
    }),
  );

  const result = await service.cleanup();

  assert.equal(result.summary.duplicateGroups, 1);
  assert.equal(result.summary.redundantRecords, 1);
  assert.equal(result.summary.unreferencedRecords, 1);
  assert.equal(result.summary.mergeableRecords, 0);
  assert.equal(result.summary.manualRecords, 0);
  assert.equal(result.deleted, 1);
  assert.deepEqual(deletedIds, [String(secondId)]);
});

test("canonical selection prefers the vocabulary record with student learning references", async () => {
  const service = createVocabularyDeduplicationService(
    repository({
      async countLearningReferences(ids) {
        return Object.fromEntries(
          ids.map((id) => [
            String(id),
            String(id) === String(secondId)
              ? { progress: 2, reviewHistory: 3, total: 5 }
              : { progress: 0, reviewHistory: 0, total: 0 },
          ]),
        );
      },
    }),
  );

  const report = await service.analyze();

  assert.equal(report.groups[0].canonical.id, String(secondId));
  assert.deepEqual(report.groups[0].deletableIds, [String(firstId)]);
});

test("referenced duplicate with a different student is merged into the canonical record", async () => {
  let merged = null;
  const service = createVocabularyDeduplicationService(
    repository({
      async countLearningReferences(ids) {
        return Object.fromEntries(
          ids.map((id) => {
            const key = String(id);
            return key === String(firstId)
              ? [key, { progress: 2, reviewHistory: 2, total: 4 }]
              : [key, { progress: 1, reviewHistory: 1, total: 2 }];
          }),
        );
      },
      async listProgressRows() {
        return [
          { userId: firstUserId, vocabularyId: firstId },
          { userId: secondUserId, vocabularyId: secondId },
        ];
      },
      async mergeLearningReferences(canonicalId, duplicateId) {
        merged = { canonicalId, duplicateId };
        return {
          movedProgress: 1,
          combinedProgress: 0,
          movedReviewHistory: 1,
          deletedCount: 1,
        };
      },
    }),
  );

  const result = await service.cleanup();

  assert.deepEqual(result.groups[0].mergeableIds, [String(secondId)]);
  assert.equal(result.summary.manualRecords, 0);
  assert.equal(result.merged, 1);
  assert.equal(result.movedProgress, 1);
  assert.equal(result.combinedProgress, 0);
  assert.equal(result.movedReviewHistory, 1);
  assert.deepEqual(merged, {
    canonicalId: String(firstId),
    duplicateId: String(secondId),
  });
});

test("same student progress on both duplicate records is mergeable", async () => {
  let mergeCalls = 0;
  const service = createVocabularyDeduplicationService(
    repository({
      async countLearningReferences(ids) {
        return Object.fromEntries(
          ids.map((id) => [String(id), { progress: 1, reviewHistory: 1, total: 2 }]),
        );
      },
      async listProgressRows() {
        return [
          { userId: firstUserId, vocabularyId: firstId },
          { userId: firstUserId, vocabularyId: secondId },
        ];
      },
      async mergeLearningReferences() {
        mergeCalls += 1;
        return {
          movedProgress: 1,
          combinedProgress: 1,
          movedReviewHistory: 1,
          deletedCount: 1,
        };
      },
    }),
  );

  const report = await service.analyze();
  assert.deepEqual(report.groups[0].mergeableIds, [String(secondId)]);
  assert.deepEqual(report.groups[0].manualIds, []);

  const result = await service.cleanup();
  assert.equal(mergeCalls, 1);
  assert.equal(result.merged, 1);
  assert.equal(result.combinedProgress, 1);
  assert.equal(result.summary.manualRecords, 0);
});

test("duplicate stays manual while a review history write is pending", async () => {
  const service = createVocabularyDeduplicationService(
    repository({
      async countLearningReferences(ids) {
        return Object.fromEntries(
          ids.map((id) => [String(id), { progress: 1, reviewHistory: 1, total: 2 }]),
        );
      },
      async listProgressRows() {
        return [
          { userId: firstUserId, vocabularyId: firstId },
          {
            userId: secondUserId,
            vocabularyId: secondId,
            pendingReviewHistory: { reviewId: "pending-review" },
          },
        ];
      },
    }),
  );

  const report = await service.analyze();

  assert.deepEqual(report.groups[0].manualIds, [String(secondId)]);
  assert.match(report.groups[0].duplicates[0].manualReason, /chờ đồng bộ/i);
});
