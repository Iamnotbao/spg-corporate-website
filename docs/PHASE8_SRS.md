# Phase 8 — Vocabulary Flashcards and Spaced Repetition

## Scope

Phase 8 turns the existing student-owned saved-vocabulary state into a small, deterministic spaced-repetition workflow. It does not add payments, certificates, AI grading, streak rewards, or a generic deck-builder.

The source vocabulary remains the existing published Mandora Vocabulary domain. A student opts a word into review by saving it; the review scheduler then reuses that student's existing `vocabulary_progress` record rather than creating a second ownership model.

## Student flow

1. Save a published Vocabulary item.
2. Open **Ôn tập hôm nay** (`/review`).
3. See only saved cards that are due now.
4. Reveal the answer.
5. Rate recall as `Again`, `Hard`, `Good`, or `Easy`.
6. The backend calculates and stores the next due time.
7. The next due queue remains owner-scoped to the authenticated student.

The browser never submits an interval, ease factor, due time, review count, or user ID. Those values are server-owned.

## Persistence

Phase 8 extends `vocabulary_progress`, whose unique key remains `(userId, vocabularyId)`.

Review-capable progress may contain:

- `saved`: whether the word is currently in the student's saved/review collection;
- `stage`: `new`, `learning`, or `review`;
- `repetitions`;
- `intervalDays`;
- `easeFactor`;
- `lapses`;
- `reviewCount`;
- `lastRating`;
- `lastReviewedAt`;
- `nextReviewAt`;
- `createdAt` / `updatedAt`.

A compound index on `(userId, saved, nextReviewAt)` supports the due queue. The existing unique `(userId, vocabularyId)` index keeps save/review mutations idempotent at the ownership level.

Unsave is intended to be non-destructive: it changes `saved` to false instead of erasing review history. Re-saving can therefore continue with the same historical record.

## V1 scheduling rule

This is a deterministic product rule inspired by common spaced-repetition mechanics; it is not presented as a scientifically optimal or SM-2-identical implementation.

- `Again`: reset repetitions, increment lapse count, lower ease, due again in 10 minutes.
- `Hard`: grow the interval conservatively and lower ease.
- `Good`: new card -> 1 day, second successful review -> 3 days, mature cards grow by the current ease factor.
- `Easy`: new card -> 4 days; mature cards grow faster and receive a small ease increase.
- Ease is clamped to a safe range so repeated ratings cannot produce pathological values.

All calculations happen on the backend from persisted progress plus the student's rating.

## Visibility and security

Review routes are under `/api/student/*`, so the existing authentication and `student` role boundary applies. They never accept a `userId` from the client.

A due progress record is returned as a flashcard only while its Vocabulary item is published and still belongs to a published Lesson hierarchy and published Course. Unpublishing content preserves the student's historical progress record but removes that content from the active review queue.

## HTTP contracts

- `GET /api/student/vocabulary-review?limit=20`
  - returns due flashcards plus saved/due summary data;
- `POST /api/student/vocabulary-review/:vocabularyId`
  - body: `{ "rating": "again|hard|good|easy" }`;
  - stores the server-derived next scheduling state.

The frontend exposes the protected `/review` page and links to it from the signed-in student account menu.

## Validation priorities

Before merge:

- backend unit tests must cover deterministic rating behavior and invalid ratings;
- backend auth smoke tests should continue to prove all student routes reject missing tokens;
- frontend lint and production build must pass;
- repository security checks must remain green;
- manually verify save -> review -> rate -> no longer due -> later due behavior against a safe non-production database when available.

No destructive production MongoDB test is required or permitted for this phase.

## Deferred ideas

Possible later extensions include daily streaks, custom decks, leech handling, richer review statistics, pronunciation prompts, reverse cards, and configurable scheduling. They should not be added implicitly to this V1 contract.
