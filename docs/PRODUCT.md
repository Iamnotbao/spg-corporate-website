# Mandora Product Specification

## Status

This document defines the approved Mandora V1 product boundary. It describes the target
product, not the current implementation. The repository audit in
[`ARCHITECTURE.md`](./ARCHITECTURE.md) confirms that the learning product has not yet
been implemented.

## Product definition

Mandora is a Chinese e-learning platform for Vietnamese learners.

The product has three surfaces:

1. a public learning and discovery website;
2. an authenticated student application;
3. an authenticated admin content-management application.

The immediate goal is a clear, dependable learning flow built around courses, units,
lessons, vocabulary, quizzes, and progress. Mandora V1 is not a marketplace, live-class
platform, certification system, or AI tutoring product.

## Audience and roles

### Visitor

A visitor can discover courses and consume the public learning and Blog experiences
included in V1. A visitor can register or log in as a student.

### Student

A student can use the visitor experience plus My Courses and Progress. Student access
must be isolated to the authenticated student's own records.

### Admin

An admin can manage the V1 learning and Blog content and view/manage students through the
admin application. Admin authorization must be enforced by the API, not only by hidden
frontend controls.

Mandora V1 has two authenticated roles: `admin` and `student`. The current legacy
`employee` role is not a Mandora role and must not be silently converted into `student`.

## V1 scope

### Public

| Area          | V1 outcome                                                                              |
| ------------- | --------------------------------------------------------------------------------------- |
| Home          | Introduces Mandora and gives clear entry points into learning content.                  |
| Courses       | Shows the available public course catalog with useful loading, empty, and error states. |
| Course Detail | Explains one course and exposes its published learning structure.                       |
| Lesson        | Presents the published lesson learning experience.                                      |
| Vocabulary    | Presents the vocabulary experience defined for the relevant public context.             |
| Quiz          | Presents and evaluates the quiz experience defined for the relevant public context.     |
| Blog          | Lists and displays Mandora editorial content.                                           |

### Student

| Area           | V1 outcome                                                                                |
| -------------- | ----------------------------------------------------------------------------------------- |
| Login/Register | Creates and authenticates student accounts through one shared authentication foundation.  |
| My Courses     | Shows the courses associated with the signed-in student.                                  |
| Progress       | Shows the signed-in student's learning progress according to the agreed completion rules. |

### Admin

| Area       | V1 outcome                                                                           |
| ---------- | ------------------------------------------------------------------------------------ |
| Dashboard  | Provides a concise operational entry point to the V1 admin areas.                    |
| Courses    | Creates, edits, publishes, orders, and removes course content subject to validation. |
| Units      | Manages units within their course hierarchy.                                         |
| Lessons    | Manages lessons within their unit hierarchy.                                         |
| Vocabulary | Manages vocabulary associated with the agreed learning context.                      |
| Quizzes    | Manages quiz definitions and their relationship to learning content.                 |
| Blog       | Manages Mandora Blog content.                                                        |
| Students   | Views and manages student accounts within explicit authorization rules.              |

## Learning hierarchy

The required hierarchy is:

```text
Course
└── Unit
    └── Lesson
```

Vocabulary and Quizzes are required V1 domains, but their exact ownership within the
hierarchy must be confirmed before schemas and routes are implemented. The system must
not encode conflicting relationships in the frontend and backend.

## Cross-cutting V1 requirements

- Public and admin content must have explicit draft/published behavior.
- Public queries must expose only approved public fields and published records.
- Student-private pages and APIs must require authentication and record ownership.
- Admin mutations must require backend role/permission checks and request validation.
- Remote-data experiences must include loading, empty, error, and retry handling where
  retry is meaningful.
- Public layouts must be responsive and accessible.
- Public learning and Blog pages must support the SEO requirements in
  [`SEO_MIGRATION.md`](./SEO_MIGRATION.md).
- Production content must come from authorized content management or an approved import;
  do not fabricate production course data.

## Explicitly out of scope for V1

- AI Tutor
- repurposing the existing corporate OpenAI/chat feature as a learning feature
- payments
- subscriptions
- live classes
- certificates
- pronunciation scoring
- speech scoring
- advanced gamification
- advanced spaced repetition

These items must not influence the V1 architecture beyond avoiding decisions that make a
reasonable future extension impossible.

## Current-to-target gap

The current application now provides Mandora public Course, Course Detail, Lesson, and
Vocabulary reads; admin CRUD APIs for those learning resources; public student
registration/login; Enrollment; My Courses; explicit Lesson completion; derived Course
progress; student-owned saved Vocabulary; and the Quiz, Question, QuizAttempt, scoring,
and result flow. It does not yet provide password recovery/email verification, a separate
aggregate Progress page, or an admin student/progress reporting API. Legacy Posts/Blog,
Jobs, applications, visitor chat,
company settings, media, and CMS compatibility code still exists in the backend and must
be retired only through an approved data-retention process.

The closest structural reuse candidates are:

- Posts and their structured-content/media tools as a starting point for Blog, after
  validation and field projections are added;
- the admin shell, feedback states, pagination, media picker, and content editor patterns;
- the central frontend HTTP client;
- the backend environment/database helpers, security middleware, password hashing, JWT
  verification pattern, upload validation, and error handling.

Legacy content and data are not Mandora seed data.

## Product decisions required before implementation

The supplied V1 scope does not decide the following. They must be resolved explicitly,
not guessed during coding:

1. publish cascades beyond the Phase 4C-1 minimum (published Course, Lesson, Vocabulary,
   and valid Quiz; Unit has no independent publish state), including Blog posts;
2. the public URL patterns and final production hostname;
3. whether the interface itself is Vietnamese-only in V1 or has crawlable locale variants;
4. the retention/migration policy for legacy users, content, applications, CVs, chat data,
   and media.

Phase 4B defines My Courses as active student enrollment in a published Course. A Lesson
is complete only after the enrolled student explicitly marks the published Lesson
complete. Course progress is calculated dynamically as completed published Lessons
divided by all published Lessons in Unit order; no percentage is stored. Vocabulary is
attached to a Lesson, and V1 persistence records only whether the authenticated student
saved it. Learned state and spaced-repetition scheduling remain out of scope.

Phase 4C-1 defines exactly one Quiz per Lesson, and only Lessons whose type is `quiz` may
own one. Supported Question types are `multiple_choice`, `true_false`, `fill_blank`, and
`arrange_sentence`. Students may retry a published Quiz without an attempt limit; every
submission is stored as a separate QuizAttempt. A normal Lesson still requires explicit
Mark Complete. A `quiz` Lesson can only be completed by passing its associated published
Quiz. Failed attempts are retained but do not change LessonProgress. Passing retries use
the existing idempotent LessonProgress record and therefore do not inflate Course
progress.

Until decided, architecture documents may identify these as open boundaries but must not
invent product behavior.
