import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import { createCharacterService } from "./character.service.js";

const ids = Object.fromEntries(
  ["studentA", "studentB", "lesson", "character", "draft", "attempt"].map(
    (key, index) => [
      key,
      new ObjectId(
        `907f1f77bcf86cd799439${String(index + 1).padStart(3, "0")}`,
      ),
    ],
  ),
);

const targetData = {
  strokes: ["M 0 0", "M 0 0"],
  medians: [
    [
      [100, 900],
      [900, 900],
    ],
    [
      [500, 900],
      [500, 100],
    ],
  ],
};
const correctStrokes = [
  [
    { x: 100 / 1024, y: 1 - 900 / 1024 },
    { x: 900 / 1024, y: 1 - 900 / 1024 },
  ],
  [
    { x: 500 / 1024, y: 1 - 900 / 1024 },
    { x: 500 / 1024, y: 1 - 100 / 1024 },
  ],
];

const publishedCharacter = {
  _id: ids.character,
  simplified: "十",
  traditional: "",
  pinyin: "shí",
  meaningVietnamese: "mười",
  meaningEnglish: "ten",
  radical: "十",
  strokeCount: 2,
  hskLevel: "HSK 1",
  examples: [],
  strokeDataKey: "十",
  lessonId: ids.lesson,
  status: "published",
  createdAt: new Date("2026-08-24T00:00:00Z"),
  updatedAt: new Date("2026-08-24T00:00:00Z"),
};
const draftCharacter = {
  ...publishedCharacter,
  _id: ids.draft,
  simplified: "木",
  strokeCount: 4,
  strokeDataKey: "木",
  status: "draft",
};

function matches(item, filter = {}) {
  if (filter.status && item.status !== filter.status) return false;
  if (filter.hskLevel && item.hskLevel !== filter.hskLevel) return false;
  if (filter.lessonId && String(item.lessonId) !== String(filter.lessonId))
    return false;
  return true;
}

function fakeRepository(overrides = {}) {
  const characters = [publishedCharacter, draftCharacter];
  const attempts = [];
  return {
    characters,
    attempts,
    toObjectId(value) {
      return ObjectId.isValid(value) ? new ObjectId(value) : null;
    },
    async listPage(filter, { skip, limit }) {
      return characters
        .filter((item) => matches(item, filter))
        .slice(skip, skip + limit);
    },
    async count(filter) {
      return characters.filter((item) => matches(item, filter)).length;
    },
    async find(id, filter = {}) {
      return (
        characters.find(
          (item) => String(item._id) === String(id) && matches(item, filter),
        ) || null
      );
    },
    async findByIdentifier(identifier, filter = {}) {
      return (
        characters.find(
          (item) =>
            matches(item, filter) &&
            [item._id, item.simplified, item.traditional].some(
              (value) => String(value) === String(identifier),
            ),
        ) || null
      );
    },
    async findLesson() {
      return { _id: ids.lesson, type: "character" };
    },
    async create(document) {
      const item = { ...document, _id: new ObjectId() };
      characters.push(item);
      return item;
    },
    async update(id, update) {
      const index = characters.findIndex(
        (item) => String(item._id) === String(id),
      );
      if (index < 0) return null;
      characters[index] = { ...characters[index], ...update };
      return characters[index];
    },
    async delete(id) {
      const index = characters.findIndex(
        (item) => String(item._id) === String(id),
      );
      if (index < 0) return { deletedCount: 0 };
      characters.splice(index, 1);
      return { deletedCount: 1 };
    },
    async countAttempts(characterId) {
      return attempts.filter(
        (item) => String(item.characterId) === String(characterId),
      ).length;
    },
    async createAttempt(document) {
      const item = { ...document, _id: ids.attempt };
      attempts.push(item);
      return item;
    },
    async listOwnAttempts(userId, characterId) {
      return attempts
        .filter(
          (item) =>
            String(item.userId) === String(userId) &&
            String(item.characterId) === String(characterId),
        )
        .sort((a, b) => b.createdAt - a.createdAt);
    },
    async getOwnAttemptSummary(userId, characterId) {
      const owned = attempts
        .filter(
          (item) =>
            String(item.userId) === String(userId) &&
            String(item.characterId) === String(characterId),
        )
        .sort((a, b) => b.createdAt - a.createdAt);
      return {
        count: owned.length,
        latest: owned[0] || null,
        best: [...owned].sort((a, b) => b.score - a.score)[0] || null,
      };
    },
    async findOwnAttempt(userId, attemptId) {
      return (
        attempts.find(
          (item) =>
            String(item.userId) === String(userId) &&
            String(item._id) === String(attemptId),
        ) || null
      );
    },
    ...overrides,
  };
}

const loadData = async () => targetData;

test("public Character catalog hides drafts and exposes published records", async () => {
  const service = createCharacterService(fakeRepository(), loadData);
  const result = await service.listPublic({ page: 1, pageSize: 12 });
  assert.deepEqual(
    result.data.map((item) => item.simplified),
    ["十"],
  );
  assert.equal(result.pagination.total, 1);
  await assert.rejects(() => service.getPublic("木"), { status: 404 });
  assert.equal((await service.getPublic("十")).status, "published");
});

test("publishing verifies the open stroke data and linked Lesson type", async () => {
  const service = createCharacterService(fakeRepository(), loadData);
  await assert.rejects(
    () => service.update(String(ids.draft), { status: "published" }),
    {
      status: 409,
      message:
        "strokeCount must match the 2 strokes in the selected stroke data",
    },
  );
  const wrongLesson = createCharacterService(
    fakeRepository({
      async findLesson() {
        return { _id: ids.lesson, type: "grammar" };
      },
    }),
    loadData,
  );
  await assert.rejects(
    () =>
      wrongLesson.update(String(ids.character), {
        lessonId: String(ids.lesson),
      }),
    {
      status: 409,
    },
  );
});

test("scoring handles empty, missing, extra, and correct strokes deterministically", async () => {
  const service = createCharacterService(fakeRepository(), loadData);
  const empty = await service.compare("十", { strokes: [] });
  assert.equal(empty.score, 0);
  assert.equal(empty.feedback[0].code, "missing_strokes");
  const missing = await service.compare("十", {
    strokes: correctStrokes.slice(0, 1),
  });
  assert.ok(missing.score > 0 && missing.score < 100);
  assert.equal(missing.feedback[0].code, "missing_strokes");
  const extra = await service.compare("十", {
    strokes: [...correctStrokes, correctStrokes[0]],
  });
  assert.ok(extra.score < 100);
  assert.equal(extra.feedback[0].code, "extra_strokes");
  const correct = await service.compare("十", { strokes: correctStrokes });
  assert.equal(correct.score, 100);
  assert.equal(correct.level, "excellent");
});

test("attempt ownership comes from auth and raw handwriting is not persisted", async () => {
  const repository = fakeRepository();
  const service = createCharacterService(repository, loadData);
  const attempt = await service.submitAttempt(
    { _id: ids.studentA, role: "student" },
    String(ids.character),
    { strokes: correctStrokes },
  );
  assert.equal(attempt.score, 100);
  assert.equal(String(repository.attempts[0].userId), String(ids.studentA));
  assert.equal("strokes" in repository.attempts[0], false);
  await assert.rejects(
    () =>
      service.submitAttempt(
        { _id: ids.studentA, role: "student" },
        String(ids.character),
        { strokes: correctStrokes, userId: String(ids.studentB) },
      ),
    { status: 400, message: "Unknown fields: userId" },
  );
});

test("attempt summary is owner-scoped and cross-user attempt access is denied", async () => {
  const repository = fakeRepository();
  const service = createCharacterService(repository, loadData);
  await service.submitAttempt(
    { _id: ids.studentA, role: "student" },
    String(ids.character),
    { strokes: correctStrokes },
  );
  assert.equal(
    (
      await service.getAttemptSummary(
        { _id: ids.studentA, role: "student" },
        String(ids.character),
      )
    ).count,
    1,
  );
  assert.equal(
    (
      await service.getAttemptSummary(
        { _id: ids.studentB, role: "student" },
        String(ids.character),
      )
    ).count,
    0,
  );
  await assert.rejects(
    () =>
      service.getOwnAttempt(
        { _id: ids.studentB, role: "student" },
        String(ids.attempt),
      ),
    { status: 404 },
  );
});

test("published or practiced Characters cannot be deleted", async () => {
  const repository = fakeRepository();
  const service = createCharacterService(repository, loadData);
  await assert.rejects(() => service.delete(String(ids.character)), {
    status: 409,
  });
  repository.attempts.push({ userId: ids.studentA, characterId: ids.draft });
  await assert.rejects(() => service.delete(String(ids.draft)), {
    status: 409,
    message: "Practiced characters cannot be deleted",
  });
});
