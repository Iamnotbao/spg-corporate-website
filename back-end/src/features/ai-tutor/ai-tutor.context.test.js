import assert from "node:assert/strict";
import test from "node:test";
import { ObjectId } from "mongodb";
import { createAiContextResolver } from "./ai-tutor.context.js";

const ids = {
  user: new ObjectId("507f1f77bcf86cd799439011"),
  lesson: new ObjectId("507f1f77bcf86cd799439012"),
  unit: new ObjectId("507f1f77bcf86cd799439013"),
  course: new ObjectId("507f1f77bcf86cd799439014"),
  vocabulary: new ObjectId("507f1f77bcf86cd799439015"),
  attempt: new ObjectId("507f1f77bcf86cd799439016"),
  quiz: new ObjectId("507f1f77bcf86cd799439017"),
};

function contextRepository({ hiddenCourse = false, owner = true } = {}) {
  const lesson = {
    _id: ids.lesson,
    unitId: ids.unit,
    title: "Chào hỏi",
    type: "grammar",
    description: "Cách chào hỏi cơ bản",
    content: JSON.stringify({ blocks: [{ text: "你好 dùng khi chào." }] }),
  };
  return {
    async findPublishedLesson(id) {
      return String(id) === String(ids.lesson) ? lesson : null;
    },
    async findUnit() {
      return { _id: ids.unit, courseId: ids.course, title: "Nhập môn" };
    },
    async findPublishedCourse() {
      return hiddenCourse ? null : { _id: ids.course, title: "HSK 1" };
    },
    async listPublishedLessonVocabulary() {
      return [
        {
          simplified: "你好",
          pinyin: "nǐ hǎo",
          meaningVietnamese: "xin chào",
        },
      ];
    },
    async findPublishedVocabulary(id) {
      return String(id) === String(ids.vocabulary)
        ? {
            _id: ids.vocabulary,
            lessonId: ids.lesson,
            simplified: "你好",
            pinyin: "nǐ hǎo",
            meaningVietnamese: "xin chào",
          }
        : null;
    },
    async findOwnedQuizAttempt(userId, id) {
      if (
        !owner ||
        String(userId) !== String(ids.user) ||
        String(id) !== String(ids.attempt)
      ) {
        return null;
      }
      return {
        _id: ids.attempt,
        quizId: ids.quiz,
        lessonId: ids.lesson,
        score: 50,
        passed: false,
        results: [
          {
            question: "Chọn câu chào đúng",
            correct: false,
            submittedAnswer: "再见",
            correctAnswer: { content: "你好" },
          },
          { question: "Câu đúng", correct: true },
        ],
      };
    },
    async findQuiz() {
      return { title: "Quiz chào hỏi" };
    },
    async findLessonSummary() {
      return { title: "Chào hỏi" };
    },
  };
}

test("lesson and vocabulary contexts include only compact published hierarchy data", async () => {
  const resolve = createAiContextResolver(contextRepository());
  const lesson = await resolve(ids.user, {
    type: "lesson",
    id: String(ids.lesson),
  });
  const vocabulary = await resolve(ids.user, {
    type: "vocabulary",
    id: String(ids.vocabulary),
  });
  assert.match(lesson.prompt, /你好 dùng khi chào/);
  assert.match(lesson.prompt, /HSK 1/);
  assert.equal(vocabulary.public.label, "你好");
  assert.doesNotMatch(vocabulary.prompt, /userId|password|token/);
});

test("hidden lesson hierarchy is unavailable to AI context", async () => {
  const resolve = createAiContextResolver(
    contextRepository({ hiddenCourse: true }),
  );
  await assert.rejects(
    resolve(ids.user, { type: "lesson", id: String(ids.lesson) }),
    { status: 404, code: "AI_CONTEXT_UNAVAILABLE" },
  );
});

test("quiz context verifies attempt ownership and sends only incorrect results", async () => {
  const resolve = createAiContextResolver(contextRepository());
  const context = await resolve(ids.user, {
    type: "quizAttempt",
    id: String(ids.attempt),
  });
  assert.match(context.prompt, /Chọn câu chào đúng/);
  assert.doesNotMatch(context.prompt, /Câu đúng/);

  const denied = createAiContextResolver(contextRepository({ owner: false }));
  await assert.rejects(
    denied(ids.user, { type: "quizAttempt", id: String(ids.attempt) }),
    { status: 404, code: "AI_CONTEXT_FORBIDDEN" },
  );
});
