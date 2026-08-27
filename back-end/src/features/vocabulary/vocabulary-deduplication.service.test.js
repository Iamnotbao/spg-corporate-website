import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import { createVocabularyDeduplicationService } from "./vocabulary-deduplication.service.js";

const lessonId = new ObjectId("707f1f77bcf86cd799439015");
const firstId = new ObjectId("707f1f77bcf86cd799439016");
const secondId = new ObjectId("707f1f77bcf86cd799439017");
const thirdId = new ObjectId("707f1f77bcf86cd799439018");

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
    async deleteDuplicates(ids) {
      return { deletedCount: ids.length };
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
  assert.equal(result.summary.deletableRecords, 1);
  assert.equal(result.summary.protectedRecords, 0);
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

test("referenced redundant duplicates are protected instead of being hard deleted", async () => {
  let deletedIds = null;
  const service = createVocabularyDeduplicationService(
    repository({
      async listDuplicateGroups() {
        return [
          {
            _id: { lessonId, simplified: "学习", pinyin: "xuéxí" },
            count: 3,
            items: [word(firstId), word(secondId), word(thirdId)],
          },
        ];
      },
      async countLearningReferences(ids) {
        return Object.fromEntries(
          ids.map((id) => {
            const key = String(id);
            if (key === String(firstId)) {
              return [key, { progress: 4, reviewHistory: 1, total: 5 }];
            }
            if (key === String(secondId)) {
              return [key, { progress: 1, reviewHistory: 0, total: 1 }];
            }
            return [key, { progress: 0, reviewHistory: 0, total: 0 }];
          }),
        );
      },
      async deleteDuplicates(ids) {
        deletedIds = ids;
        return { deletedCount: ids.length };
      },
    }),
  );

  const result = await service.cleanup();

  assert.equal(result.groups[0].canonical.id, String(firstId));
  assert.deepEqual(result.groups[0].protectedIds, [String(secondId)]);
  assert.deepEqual(result.groups[0].deletableIds, [String(thirdId)]);
  assert.deepEqual(deletedIds, [String(thirdId)]);
  assert.equal(result.summary.protectedRecords, 1);
  assert.equal(result.deleted, 1);
});
