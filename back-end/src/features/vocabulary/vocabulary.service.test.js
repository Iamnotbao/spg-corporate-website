import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import { createVocabularyService, extractHanCharacters } from "./vocabulary.service.js";
import { MAX_VOCABULARY_IMPORT_ROWS } from "./vocabulary.validation.js";

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
    async listCharactersBySimplified() {
      return [];
    },
    async insertCharacters() {},
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

const fakeCharacterData = async () => ({ strokes: ["stroke"], medians: [] });

test("extracts unique Han characters only", () => {
  assert.deepEqual(extractHanCharacters("学习 123, 学!"), ["学", "习"]);
});

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
    fakeCharacterData,
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
    fakeCharacterData,
  );
  assert.deepEqual((await service.listPublic()).data, []);
  await assert.rejects(
    () => service.save({ _id: studentA, role: "student" }, String(wordId)),
    { status: 404 },
  );
});

function importRow(overrides = {}) {
  return {
    simplified: "学习",
    traditional: "學習",
    pinyin: "xuéxí",
    meaningVietnamese: "học tập",
    meaningEnglish: "to study",
    hskLevel: "HSK 1",
    audioUrl: "",
    exampleChinese: "我学习中文。",
    examplePinyin: "Wǒ xuéxí Zhōngwén.",
    exampleVietnamese: "Tôi học tiếng Trung.",
    ...overrides,
  };
}

test("batch import validates once and inserts 100 rows in one repository call", async () => {
  let insertCalls = 0;
  let insertedDocuments = [];
  const service = createVocabularyService(
    repository({
      async findLesson(id) {
        return String(id) === String(lessonId) ? { _id: lessonId } : null;
      },
      async listLessonIdentities() {
        return [];
      },
      async insertMany(documents) {
        insertCalls += 1;
        insertedDocuments = documents;
        return { insertedCount: documents.length, failures: [] };
      },
    }),
    fakeCharacterData,
  );
  const result = await service.importBatch({
    lessonId: String(lessonId),
    status: "draft",
    duplicateMode: "skip",
    rows: Array.from({ length: 100 }, (_, index) =>
      importRow({ simplified: `词${index}`, rowNumber: index + 2 }),
    ),
  });

  assert.equal(insertCalls, 1);
  assert.equal(insertedDocuments.length, 100);
  assert.equal(result.inserted, 100);
  assert.deepEqual(
    {
      total: result.total,
      selected: result.selected,
      skippedDuplicates: result.skippedDuplicates,
      invalid: result.invalid,
      failures: result.failures,
    },
    { total: 100, selected: 100, skippedDuplicates: 0, invalid: 0, failures: 0 },
  );
});

test("batch import skips normalized database and file duplicates", async () => {
  let documents = [];
  const service = createVocabularyService(
    repository({
      async findLesson() {
        return { _id: lessonId };
      },
      async listLessonIdentities() {
        return [{ simplified: "学习", pinyin: "XUÉXÍ" }];
      },
      async insertMany(nextDocuments) {
        documents = nextDocuments;
        return { insertedCount: nextDocuments.length, failures: [] };
      },
    }),
    fakeCharacterData,
  );
  const result = await service.importBatch({
    lessonId: String(lessonId),
    status: "published",
    duplicateMode: "skip",
    rows: [
      importRow({ simplified: " 学习 ", pinyin: " xuéxí ", rowNumber: 2 }),
      importRow({ simplified: "你好", pinyin: "nǐ hǎo", rowNumber: 3 }),
      importRow({ simplified: "你好", pinyin: "NǏ HǍO", rowNumber: 4 }),
    ],
  });

  assert.equal(documents.length, 1);
  assert.equal(result.inserted, 1);
  assert.equal(result.skippedDuplicates, 2);
  assert.deepEqual(
    result.rowErrors.map(({ rowNumber, type }) => ({ rowNumber, type })),
    [
      { rowNumber: 2, type: "duplicate" },
      { rowNumber: 4, type: "duplicate" },
    ],
  );
});

test("batch import can allow duplicates and reports invalid rows", async () => {
  let documents = [];
  const service = createVocabularyService(
    repository({
      async findLesson() {
        return { _id: lessonId };
      },
      async listLessonIdentities() {
        return [{ simplified: "学习", pinyin: "xuéxí" }];
      },
      async insertMany(nextDocuments) {
        documents = nextDocuments;
        return { insertedCount: nextDocuments.length, failures: [] };
      },
    }),
    fakeCharacterData,
  );
  const result = await service.importBatch({
    lessonId: String(lessonId),
    status: "draft",
    duplicateMode: "allow",
    rows: [
      importRow({ rowNumber: 2 }),
      importRow({ simplified: "", rowNumber: 3 }),
      importRow({ lessonId: String(lessonId), rowNumber: 4 }),
    ],
  });

  assert.equal(documents.length, 1);
  assert.equal(result.inserted, 1);
  assert.equal(result.skippedDuplicates, 0);
  assert.equal(result.invalid, 2);
  assert.equal(result.rowErrors[0].rowNumber, 3);
  assert.equal(result.rowErrors[1].rowNumber, 4);
});

test("batch import maps partial write failures back to source rows", async () => {
  const service = createVocabularyService(
    repository({
      async findLesson() {
        return { _id: lessonId };
      },
      async listLessonIdentities() {
        return [];
      },
      async insertMany() {
        return {
          insertedCount: 1,
          failures: [{ index: 1, message: "Unable to insert this vocabulary row" }],
        };
      },
    }),
    fakeCharacterData,
  );
  const result = await service.importBatch({
    lessonId: String(lessonId),
    status: "draft",
    duplicateMode: "skip",
    rows: [
      importRow({ simplified: "一", rowNumber: 8 }),
      importRow({ simplified: "二", rowNumber: 12 }),
    ],
  });

  assert.equal(result.inserted, 1);
  assert.equal(result.failures, 1);
  assert.deepEqual(result.rowErrors[0], {
    index: 1,
    rowNumber: 12,
    type: "failure",
    message: "Unable to insert this vocabulary row",
  });
});

test("batch import rejects requests over the 500-row limit", async () => {
  const service = createVocabularyService(repository(), fakeCharacterData);
  await assert.rejects(
    () =>
      service.importBatch({
        lessonId: String(lessonId),
        status: "draft",
        duplicateMode: "skip",
        rows: Array.from(
          { length: MAX_VOCABULARY_IMPORT_ROWS + 1 },
          importRow,
        ),
      }),
    { status: 400 },
  );
});
