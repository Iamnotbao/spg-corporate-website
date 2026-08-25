import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateNextReview, initialSrsState } from "./vocabulary.srs.js";

const now = new Date("2026-08-25T00:00:00.000Z");

test("new cards schedule Good for one day and Easy for four days", () => {
  const base = initialSrsState(now);
  const good = calculateNextReview(base, "good", now);
  const easy = calculateNextReview(base, "easy", now);
  assert.equal(good.intervalDays, 1);
  assert.equal(good.repetitions, 1);
  assert.equal(good.nextReviewAt.toISOString(), "2026-08-26T00:00:00.000Z");
  assert.equal(easy.intervalDays, 4);
  assert.equal(easy.nextReviewAt.toISOString(), "2026-08-29T00:00:00.000Z");
});

test("Again returns a card to learning without deleting history", () => {
  const result = calculateNextReview(
    {
      repetitions: 4,
      intervalDays: 12,
      easeFactor: 2.5,
      lapses: 1,
      reviewCount: 7,
    },
    "again",
    now,
  );
  assert.equal(result.stage, "learning");
  assert.equal(result.repetitions, 0);
  assert.equal(result.lapses, 2);
  assert.equal(result.reviewCount, 8);
  assert.equal(result.nextReviewAt.toISOString(), "2026-08-25T00:10:00.000Z");
});

test("Hard reduces ease while Good grows a mature interval", () => {
  const hard = calculateNextReview(
    { repetitions: 3, intervalDays: 10, easeFactor: 2.5 },
    "hard",
    now,
  );
  const good = calculateNextReview(
    { repetitions: 3, intervalDays: 10, easeFactor: 2.5 },
    "good",
    now,
  );
  assert.equal(hard.intervalDays, 12);
  assert.equal(hard.easeFactor, 2.35);
  assert.equal(good.intervalDays, 25);
});

test("invalid ratings are rejected", () => {
  assert.throws(() => calculateNextReview({}, "perfect", now), {
    status: 400,
  });
});
