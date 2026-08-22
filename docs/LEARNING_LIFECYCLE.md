# Mandora V1 Learning Lifecycle

This document records the Phase 4C-2 lifecycle and reporting rules implemented by the Mandora V1 learning domain. It complements `docs/ARCHITECTURE.md` and is intentionally limited to the current V1 behavior.

## Enrollment lifecycle

An Enrollment has two supported states:

- `active`: the student is currently enrolled and may persist learning actions for a published Course.
- `archived`: the student has left the Course, but historical learning records are retained.

There is exactly one Enrollment record per `(userId, courseId)`, enforced by the existing unique index.

### Enroll

A student may enroll only in a published Course. Enrollment ownership always comes from the authenticated student; the client does not choose a `userId`.

If no Enrollment exists, the repository creates one. If an archived Enrollment already exists, enrolling again reactivates that same unique record, updates the enrollment timestamps, and clears `archivedAt`.

### Leave / unenroll

The V1 leave-course action is non-destructive. It changes the Enrollment to `archived` and keeps:

- LessonProgress
- QuizAttempt history
- saved Vocabulary state
- the Enrollment record itself

Calling the leave action repeatedly is idempotent.

### Re-enroll

Re-enrollment reactivates the existing Enrollment record. Previously recorded learning history remains available and progress is derived again from the Course's currently published Lessons.

## Course completion and progress

Course completion is not stored as a separate mutable flag.

For one student and Course:

`progress = completed current published lessons / current published lessons * 100`

A Course is complete only when it has at least one published Lesson and every current published Lesson has a completed LessonProgress record for that student.

Consequences:

- draft Lessons do not enter the denominator;
- historical completion records for now-unpublished Lessons remain retained but do not inflate current progress;
- a Course with zero published Lessons is not considered complete;
- quiz-type Lessons become complete only through the passing-Quiz rule defined by Phase 4C-1.

Progress percentages are derived server-side; the client never supplies a trusted percentage.

## Continue Learning

For an active Enrollment, Continue Learning resolves the first incomplete published Lesson using Course -> Unit order -> Lesson order.

Archived Enrollment records do not expose a Continue Learning target.

## Course publish/unpublish behavior

New enrollment and student learning access require a published Course.

When a Course is changed to draft/unpublished:

- it is removed from public Course discovery;
- no new enrollment is allowed;
- student Course-state access through the published learning flow is denied, including for an existing enrollee;
- retained Enrollment, LessonProgress, QuizAttempt, and Vocabulary history is not deleted.

Publishing a Course requires at least one published Lesson. Every published quiz-type Lesson must have a published Quiz.

Unit has no independent publish status in Mandora V1.

## Lesson and Quiz publish rules

Public lesson reads require both the Lesson and parent Course to be published.

A published quiz-type Lesson requires a published Quiz. A published Quiz cannot be unpublished while its parent Lesson remains published; the Lesson is unpublished first. Quiz attempts require a published Quiz, published Lesson, published Course, and active Enrollment.

Normal Lessons use explicit Mark Complete. Quiz Lessons cannot bypass scoring through manual completion. A failed attempt is retained without completing the Lesson. A passing attempt idempotently creates/updates the student's LessonProgress.

## Historical Quiz integrity

QuizAttempt is append-only at the learning-service level: every retry creates another attempt rather than overwriting an earlier result.

Each attempt stores a result snapshot including submitted answers, grading result, earned/possible points, score, pass/fail state, and relevant question/result text. Therefore later Question edits do not recalculate or silently rewrite an earlier score.

Deletion protections prevent deleting a Quiz that has attempts and prevent deleting Questions after attempts exist.

## Safe deletion and retention

Mandora V1 favors unpublish/archive over destructive deletion once learning history exists.

### Course

A published Course must first be unpublished. A Course with Units cannot be deleted until its children are handled. A Course with Enrollment history cannot be hard-deleted; keep it unpublished/draft so historical references remain valid.

### Unit

A Unit with Lessons cannot be hard-deleted.

### Lesson

A published Lesson must first be unpublished. A Lesson with LessonProgress, Vocabulary content, or an attached Quiz cannot be hard-deleted.

### Quiz and Questions

A published Quiz must first be unpublished. A Quiz with attempts cannot be deleted. A Quiz with Questions must have its Questions handled before deletion. Questions with attempt history cannot be deleted.

### Vocabulary

Published Vocabulary must first be unpublished. Vocabulary with saved-progress references cannot be hard-deleted.

### Student account

A user with Enrollment, LessonProgress, QuizAttempt, or VocabularyProgress history cannot be hard-deleted through the existing admin user deletion flow. The account should be disabled instead.

## Reporting

### Student Progress

`GET /api/student/progress` is authenticated and student-owned. It returns real derived data for the current student, including:

- active and archived Course states;
- completed/current published Lesson totals;
- derived Course progress and completion;
- Continue Learning where applicable;
- Quiz attempt count and recent results;
- saved Vocabulary count.

No `userId` is accepted from the client for ownership.

### Admin reporting

The admin-only reporting foundation exposes:

- `GET /api/admin/reports/learning-summary`
- `GET /api/admin/reports/progress`

The summary uses real MongoDB counts/aggregates for students, Courses, enrollments, completed LessonProgress, Quiz attempts, Course completion counts, and average progress.

The Progress report performs search/filter/pagination in MongoDB and does not download all students and all progress records into the browser. The aggregate pipeline batches Course/Unit/Lesson/progress joins rather than issuing a per-row frontend N+1 query pattern.

## Ownership and authorization

Student-owned APIs derive identity from the authenticated backend context. A student cannot supply another student's ID to read or mutate that person's enrollment, progress, attempts, or saved Vocabulary.

Learning-management and reporting endpoints are protected on the backend with admin authorization. Frontend menu visibility is not treated as an authorization control.

## Idempotency and indexes

The V1 design relies on unique indexes plus defensive service behavior for repeatable operations:

- one Enrollment per `(userId, courseId)`;
- one LessonProgress per `(userId, lessonId)`;
- one VocabularyProgress per `(userId, vocabularyId)`;
- repeated enrollment reuses/reactivates the Enrollment;
- repeated lesson completion updates the same logical LessonProgress;
- repeated leave-course calls do not create another Enrollment.

Quiz attempts are intentionally not idempotent: each submitted retry is a new historical attempt.

## Cross-collection consistency limitation

The current native-MongoDB application has no repository-wide transaction abstraction and no explicitly safe test database was available during Phase 4C-2 work.

A passing Quiz currently persists QuizAttempt and then idempotently marks the Quiz Lesson complete. If the second write fails after the attempt write succeeds, the attempt remains valid historical evidence while LessonProgress may temporarily lag. V1 does not claim an atomic cross-collection guarantee that the deployed MongoDB configuration has not been verified to support.

The chosen mitigation is:

- append-only QuizAttempt history;
- unique/idempotent LessonProgress upsert;
- server-derived progress;
- no destructive rollback of a successfully recorded attempt;
- document the consistency boundary for a future verified transaction/reconciliation design.

Do not introduce MongoDB transactions until replica-set/deployment support is confirmed.

## Validation status and limitation

Phase 4C-2 was designed to be covered primarily by repository/service tests without mutating production data. The previous Codex run stopped because of an external usage limit after implementing the reporting/lifecycle work, before it could produce its final validation report.

A follow-up lifecycle test was added on the completion branch to explicitly cover:

- archive -> re-enroll using the same logical Enrollment while retaining Lesson history;
- unpublished Course access remaining unavailable even when Enrollment/history exists.

A real MongoDB CRUD/destructive lifecycle test must only be run against an explicitly safe test database. Production data must not be used for this verification.
