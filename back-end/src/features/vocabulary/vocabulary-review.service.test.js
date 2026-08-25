import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import { createVocabularyReviewService } from "./vocabulary-review.service.js";

function reviewFixture() {
  const studentA = new ObjectId();
  const studentB = new ObjectId();
  const vocabularyId = new ObjectId();
  const lessonId = new ObjectId();
  const unitId = new ObjectId();
  const courseId = new ObjectId();
  let progress = {
    _id: new ObjectId(),
    userId: studentA,
    vocabularyId,
    saved: true,
    stage: "review",
    repetitions: 3,
    intervalDays: 10,
    easeFactor: 2.5,
    reviewCount: 4,
  };
  const history = [];
  const repository = {
    toObjectId(value) {
      return ObjectId.isValid(value) ? new ObjectId(value) : null;
    },
    async reconcilePendingReviewHistory() {},
    async findProgress(userId) {
      return String(userId) === String(studentA) ? progress : null;
    },
    async list() {
      return [
        {
          _id: vocabularyId,
          lessonId,
          status: "published",
          simplified: "学",
          pinyin: "xué",
          meaningVietnamese: "học",
          hskLevel: "HSK 1",
        },
      ];
    },
    async listPublishedLessons() {
      return [{ _id: lessonId, unitId }];
    },
    async listUnits() {
      return [{ _id: unitId, courseId }];
    },
    async listPublishedCourses() {
      return [{ _id: courseId }];
    },
    async persistReview(userId, id, expectedReviewCount, update, event) {
      assert.equal(String(userId), String(studentA));
      assert.equal(String(id), String(vocabularyId));
      assert.equal(expectedReviewCount, progress.reviewCount);
      history.push({ ...event, _id: new ObjectId() });
      progress = { ...progress, ...update };
      return progress;
    },
    async listReviewHistory(userId) {
      return history.filter((item) => String(item.userId) === String(userId));
    },
  };
  return {
    studentA,
    studentB,
    vocabularyId,
    repository,
    history,
    getProgress: () => progress,
    setSaved(value) {
      progress.saved = value;
    },
  };
}

test("review appends owner-scoped history with server-derived before and after values", async () => {
  const fixture = reviewFixture();
  const service = createVocabularyReviewService(fixture.repository);
  const result = await service.review(
    { _id: fixture.studentA, role: "student" },
    String(fixture.vocabularyId),
    { rating: "good", userId: String(fixture.studentB), intervalDays: 999 },
  );
  assert.equal(result.srs.intervalDays, 25);
  assert.equal(fixture.history.length, 1);
  assert.deepEqual(
    {
      rating: fixture.history[0].rating,
      previousIntervalDays: fixture.history[0].previousIntervalDays,
      nextIntervalDays: fixture.history[0].nextIntervalDays,
      previousEase: fixture.history[0].previousEase,
      nextEase: fixture.history[0].nextEase,
      source: fixture.history[0].source,
    },
    {
      rating: "good",
      previousIntervalDays: 10,
      nextIntervalDays: 25,
      previousEase: 2.5,
      nextEase: 2.5,
      source: "review",
    },
  );
  assert.equal(String(fixture.history[0].userId), String(fixture.studentA));
});

test("history access is student-owned and survives unsave then resave", async () => {
  const fixture = reviewFixture();
  const service = createVocabularyReviewService(fixture.repository);
  await service.review(
    { _id: fixture.studentA, role: "student" },
    String(fixture.vocabularyId),
    { rating: "hard" },
  );
  fixture.setSaved(false);
  fixture.setSaved(true);
  const own = await service.history({ _id: fixture.studentA, role: "student" });
  const other = await service.history({
    _id: fixture.studentB,
    role: "student",
  });
  assert.equal(own.data.length, 1);
  assert.equal(other.data.length, 0);
  assert.equal(fixture.history.length, 1);
});

test("anonymous and non-student identities cannot read review history", async () => {
  const service = createVocabularyReviewService(reviewFixture().repository);
  await assert.rejects(() => service.history(null), { status: 403 });
  await assert.rejects(
    () => service.history({ _id: new ObjectId(), role: "admin" }),
    { status: 403 },
  );
});
