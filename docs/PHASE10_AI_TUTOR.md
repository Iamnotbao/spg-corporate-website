# Phase 10 - AI Chinese Tutor V1

## Scope

Phase 10 adds an authenticated AI Chinese Tutor for Vietnamese learners. It supports
grammar explanations, sentence correction, vocabulary practice, owned Quiz mistake
explanations, and short unofficial exercises. It is not a generic assistant and is not an
authoritative LMS subsystem.

AI never changes Quiz scores, Lesson completion, Course progress, SRS state,
authentication, authorization, or admin data.

## HTTP contract

All routes require the existing authenticated `student` role:

- `GET /api/student/ai/status`
- `GET /api/student/ai/conversations`
- `GET /api/student/ai/conversations/:id/messages`
- `POST /api/student/ai/chat`

Chat accepts only `message`, optional `conversationId`, and `context`. Context types are
`general`, `lesson`, `vocabulary`, and `quizAttempt`. Non-general context requires one
MongoDB ID. The request cannot provide a trusted `userId`, LMS record content, model,
prompt, score, progress, or scheduling fields.

The normalized assistant message contains plain-text `answer`, string `examples`, and
plain-text `followUp`. If provider structured output is malformed but contains text, the
provider adapter returns a safe plain-text answer instead of crashing the page.

## Context and privacy

The backend resolves every context reference:

- Lesson requires a published Lesson and published parent Course, then includes bounded
  Lesson text and at most 12 published related Vocabulary records.
- Vocabulary requires a published Vocabulary record, published Lesson, and published
  parent Course.
- QuizAttempt requires the authenticated student's ownership and includes only score,
  result state, and incorrect result snapshots needed for explanation.
- General sends no LMS record context.

No password hash, JWT, email, reset token, verification token, API key, admin field,
other-user record, or full student history is sent to the provider.

The server prompt marks learning context and student text as untrusted data. Instructions
inside Lesson, Vocabulary, Quiz, or student content cannot override the tutor's system
rules. The provider has no database, filesystem, shell, network tool, admin tool, or code
execution access.

## Provider and configuration

The provider boundary is injectable. Both adapters reuse the official OpenAI Node SDK and
Responses API request shape. The OpenAI adapter uses the SDK's default endpoint, while the
Groq adapter uses Groq's OpenAI-compatible `https://api.groq.com/openai/v1` endpoint. No
additional provider SDK is required.

Select exactly one provider. Each provider has its own backend-only key and model; keys are
never interchangeable:

```dotenv
AI_PROVIDER=openai
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5-mini
```

or:

```dotenv
AI_PROVIDER=groq
GROQ_API_KEY=
GROQ_MODEL=openai/gpt-oss-120b
```

Shared AI Tutor controls remain provider-neutral:

```dotenv
AI_MAX_INPUT_CHARS=3000
AI_MAX_OUTPUT_TOKENS=700
AI_DAILY_MESSAGE_LIMIT=30
AI_REQUEST_TIMEOUT_MS=20000
```

`GROQ_API_KEY` is read only by the backend. It must never be exposed as
`VITE_GROQ_API_KEY` or sent to the browser. Missing configuration for the selected provider
never blocks backend startup or other Mandora features. Status reports the provider
unavailable and chat returns `AI_UNAVAILABLE`. Rate-limit, authentication, timeout,
provider-unavailable, and generic provider failures are normalized without exposing raw
provider details.

## Persistence and cost control

Phase 10 persists a small owner-scoped history in `ai_conversations` and `ai_messages`.
There are no sharing, branching, attachment, export, rename, or deletion workflows. The
frontend can start a new conversation and reopen recent owned conversations.

`ai_daily_usage` atomically enforces the configured per-student daily limit. A dedicated
per-student burst limiter permits eight chat requests per minute. Input, compact context,
output tokens, provider retries, and request duration are bounded on the backend. Usage
counter rows receive a 90-day TTL cleanup date; conversations are retained until a later
written retention policy is approved.

## Frontend integrations

- `/ai-tutor` is protected by `StudentLayout` and appears as **AI Gia sư** in signed-in
  navigation.
- Lesson links use `/ai-tutor?lesson=<id>`.
- Vocabulary **Hỏi AI** actions pass only the Vocabulary ID.
- completed Quiz results link with the owned QuizAttempt ID.

The page covers empty, sending, generating, success, retryable error, rate-limited, and
provider-unavailable states on desktop/mobile and in light/dark themes. Responses are
rendered by React as plain text; no raw HTML or unsafe Markdown parser is used.

## Deferred

Speech recognition, speech synthesis, pronunciation scoring, realtime voice, provider
streaming, vector search, AI content generation for official Courses/Quizzes, AI grading,
payments, and a large AI admin console remain out of scope.
