const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const RATINGS = new Set(["again", "hard", "good", "easy"]);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function calculateNextReview(progress = {}, rating, now = new Date()) {
  if (!RATINGS.has(rating)) {
    const error = new Error("rating must be one of again, hard, good, easy");
    error.status = 400;
    throw error;
  }

  const repetitions = Math.max(0, Number(progress.repetitions) || 0);
  const previousInterval = Math.max(0, Number(progress.intervalDays) || 0);
  const previousEase = clamp(Number(progress.easeFactor) || 2.5, 1.3, 3.2);
  const reviewCount = Math.max(0, Number(progress.reviewCount) || 0) + 1;
  let intervalDays = previousInterval;
  let easeFactor = previousEase;
  let nextRepetitions = repetitions;
  let lapses = Math.max(0, Number(progress.lapses) || 0);
  let nextReviewAt;
  let stage = "review";

  if (rating === "again") {
    intervalDays = 0;
    nextRepetitions = 0;
    lapses += 1;
    easeFactor = clamp(previousEase - 0.2, 1.3, 3.2);
    nextReviewAt = new Date(now.getTime() + 10 * MINUTE_MS);
    stage = "learning";
  } else if (rating === "hard") {
    intervalDays = previousInterval > 0 ? Math.max(1, Math.round(previousInterval * 1.2)) : 1;
    nextRepetitions = repetitions + 1;
    easeFactor = clamp(previousEase - 0.15, 1.3, 3.2);
    nextReviewAt = new Date(now.getTime() + intervalDays * DAY_MS);
  } else if (rating === "good") {
    intervalDays = repetitions === 0 ? 1 : repetitions === 1 ? 3 : Math.max(1, Math.round(previousInterval * previousEase));
    nextRepetitions = repetitions + 1;
    nextReviewAt = new Date(now.getTime() + intervalDays * DAY_MS);
  } else {
    intervalDays = repetitions === 0 ? 4 : Math.max(2, Math.round(Math.max(1, previousInterval) * previousEase * 1.3));
    nextRepetitions = repetitions + 1;
    easeFactor = clamp(previousEase + 0.15, 1.3, 3.2);
    nextReviewAt = new Date(now.getTime() + intervalDays * DAY_MS);
  }

  return {
    saved: true,
    stage,
    repetitions: nextRepetitions,
    intervalDays,
    easeFactor: Math.round(easeFactor * 100) / 100,
    lapses,
    reviewCount,
    lastRating: rating,
    lastReviewedAt: now,
    nextReviewAt,
    updatedAt: now,
  };
}

export function initialSrsState(now = new Date()) {
  return {
    saved: true,
    stage: "new",
    repetitions: 0,
    intervalDays: 0,
    easeFactor: 2.5,
    lapses: 0,
    reviewCount: 0,
    nextReviewAt: now,
  };
}

export function serializeSrs(progress = {}) {
  return {
    stage: progress.stage || "new",
    repetitions: Number(progress.repetitions) || 0,
    intervalDays: Number(progress.intervalDays) || 0,
    easeFactor: Number(progress.easeFactor) || 2.5,
    lapses: Number(progress.lapses) || 0,
    reviewCount: Number(progress.reviewCount) || 0,
    lastRating: progress.lastRating || null,
    lastReviewedAt: progress.lastReviewedAt || null,
    nextReviewAt: progress.nextReviewAt || null,
  };
}
