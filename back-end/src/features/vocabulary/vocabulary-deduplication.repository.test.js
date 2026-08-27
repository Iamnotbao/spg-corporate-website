import assert from "node:assert/strict";
import { test } from "node:test";
import { mergeDuplicateProgressState } from "./vocabulary-deduplication.repository.js";

test("duplicate progress merge keeps the freshest reviewed SRS state and combines counters", () => {
  const canonical = {
    saved: false,
    stage: "review",
    repetitions: 4,
    intervalDays: 10,
    easeFactor: 2.2,
    reviewCount: 4,
    lapses: 1,
    lastRating: "good",
    lastReviewedAt: new Date("2026-08-20T10:00:00.000Z"),
    nextReviewAt: new Date("2026-08-30T10:00:00.000Z"),
    createdAt: new Date("2026-08-01T00:00:00.000Z"),
    updatedAt: new Date("2026-08-20T10:00:00.000Z"),
  };
  const duplicate = {
    saved: true,
    stage: "learning",
    repetitions: 1,
    intervalDays: 0,
    easeFactor: 2,
    reviewCount: 2,
    lapses: 2,
    lastRating: "again",
    lastReviewedAt: new Date("2026-08-25T10:00:00.000Z"),
    nextReviewAt: new Date("2026-08-25T10:10:00.000Z"),
    createdAt: new Date("2026-08-05T00:00:00.000Z"),
    updatedAt: new Date("2026-08-25T10:00:00.000Z"),
  };
  const now = new Date("2026-08-27T00:00:00.000Z");

  const merged = mergeDuplicateProgressState(canonical, duplicate, now);

  assert.equal(merged.saved, true);
  assert.equal(merged.reviewCount, 6);
  assert.equal(merged.lapses, 3);
  assert.equal(merged.stage, "learning");
  assert.equal(merged.lastRating, "again");
  assert.equal(merged.repetitions, 1);
  assert.equal(merged.intervalDays, 0);
  assert.equal(merged.easeFactor, 2);
  assert.deepEqual(merged.nextReviewAt, duplicate.nextReviewAt);
  assert.deepEqual(merged.createdAt, canonical.createdAt);
  assert.deepEqual(merged.updatedAt, now);
});

test("reviewed state wins over a newer unsaved edit that has never been reviewed", () => {
  const reviewed = {
    saved: true,
    reviewCount: 3,
    lapses: 0,
    repetitions: 3,
    intervalDays: 7,
    easeFactor: 2.5,
    lastRating: "good",
    lastReviewedAt: new Date("2026-08-20T10:00:00.000Z"),
    updatedAt: new Date("2026-08-20T10:00:00.000Z"),
  };
  const neverReviewed = {
    saved: false,
    reviewCount: 0,
    lapses: 0,
    repetitions: 0,
    intervalDays: 0,
    easeFactor: 2.5,
    updatedAt: new Date("2026-08-26T10:00:00.000Z"),
  };

  const merged = mergeDuplicateProgressState(reviewed, neverReviewed);

  assert.equal(merged.saved, true);
  assert.equal(merged.reviewCount, 3);
  assert.equal(merged.lastRating, "good");
  assert.equal(merged.repetitions, 3);
  assert.equal(merged.intervalDays, 7);
});
