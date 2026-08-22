import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import { createVocabularyService } from "./vocabulary.service.js";

const studentA = new ObjectId("707f1f77bcf86cd799439011");
const studentB = new ObjectId("707f1f77bcf86cd799439012");
const courseId = new ObjectId("707f1f77bcf86cd799439013");
const unitId = new ObjectId("707f1f77bcf86cd799439014");
const lessonId = new ObjectId("707f1f77bcf86cd799439015");
const wordId = new ObjectId("707f1f77bcf86cd799439016");
const word = {
  _id: wordId,
  simplified: "学",
  pinyin: "xué",
  meaningVietnamese: "học",
  hskLevel: "HSK 1",
  lessonId,
  status: "published",
};

function repository(overrides = {}) {
  return {
    toObjectId(value) {
      return ObjectId.isValid(value) ? new ObjectId(value) : null;
    },
    async list(filter = {}) {
      return filter._id?.$in?.length === 0 ? [] : [word];
    },
    async find(id, filter = {}) {
      return String(id) === String(wordId) &&
        (!filter.status || filter.status === word.status)
        ? word
        : null;
    },
    async listPublishedLessons() {
      return [{ _id: lessonId, unitId, status: "published" }];
    },
    async listUnits() {
      return [{ _id: unitId, courseId }];
    },
    async listPublishedCourses() {
      return [{ _id: courseId, status: "published" }];
    },
    async save(userId) {
      return {
        userId,
        vocabularyId: wordId,
        saved: true,
        updatedAt: new Date(),
      };
    },
    async unsave() {
      return { deletedCount: 1 };
    },
    async listSavedProgress(userId) {
      return String(userId) === String(studentA)
        ? [{ userId, vocabularyId: wordId, saved: true }]
        : [];
    },
    ...overrides,
  };
}

test("vocabulary saves and lists are scoped to the authenticated student", async () => {
  let savedOwner;
  let removedOwner;
  const service = createVocabularyService(
    repository({
      async save(userId) {
        savedOwner = userId;
        return { saved: true, updatedAt: new Date() };
      },
      async unsave(userId) {
        removedOwner = userId;
        return { deletedCount: 1 };
      },
    }),
  );
  await service.save({ _id: studentA, role: "student" }, String(wordId));
  await service.unsave({ _id: studentB, role: "student" }, String(wordId));
  assert.equal(String(savedOwner), String(studentA));
  assert.equal(String(removedOwner), String(studentB));
  assert.equal(
    (await service.listSaved({ _id: studentA, role: "student" })).length,
    1,
  );
  assert.equal(
    (await service.listSaved({ _id: studentB, role: "student" })).length,
    0,
  );
});

test("draft or hidden hierarchy vocabulary is unavailable to students", async () => {
  const service = createVocabularyService(
    repository({
      async listPublishedCourses() {
        return [];
      },
    }),
  );
  assert.deepEqual(await service.listPublic(), []);
  await assert.rejects(
    () => service.save({ _id: studentA, role: "student" }, String(wordId)),
    { status: 404 },
  );
});
