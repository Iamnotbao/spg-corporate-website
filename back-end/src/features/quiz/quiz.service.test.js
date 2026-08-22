import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import { createQuizService } from "./quiz.service.js";

const ids = Object.fromEntries(
  [
    "studentA",
    "studentB",
    "course",
    "unit",
    "lesson",
    "otherLesson",
    "quiz",
    "draftQuiz",
    "choice",
    "boolean",
    "blank",
    "arrange",
    "foreignQuestion",
    "attempt",
  ].map((key, index) => [
    key,
    new ObjectId(`807f1f77bcf86cd799439${String(index + 1).padStart(3, "0")}`),
  ]),
);

const lesson = {
  _id: ids.lesson,
  unitId: ids.unit,
  title: "Quiz lesson",
  slug: "quiz-lesson",
  type: "quiz",
  status: "published",
};
const quiz = {
  _id: ids.quiz,
  lessonId: ids.lesson,
  title: "Checkpoint",
  description: "Review",
  passingScore: 70,
  status: "published",
};
const questions = [
  {
    _id: ids.choice,
    quizId: ids.quiz,
    question: "Choose A",
    type: "multiple_choice",
    points: 2,
    order: 1,
    explanation: "A is correct",
    options: [
      { id: "a", content: "A", isCorrect: true, order: 1 },
      { id: "b", content: "B", isCorrect: false, order: 2 },
    ],
  },
  {
    _id: ids.boolean,
    quizId: ids.quiz,
    question: "True?",
    type: "true_false",
    points: 1,
    order: 2,
    options: [
      { id: "true", content: "True", isCorrect: true, order: 1 },
      { id: "false", content: "False", isCorrect: false, order: 2 },
    ],
  },
  {
    _id: ids.blank,
    quizId: ids.quiz,
    question: "Capital",
    type: "fill_blank",
    points: 2,
    order: 3,
    acceptedAnswers: ["Beijing", "北京"],
  },
  {
    _id: ids.arrange,
    quizId: ids.quiz,
    question: "Arrange",
    type: "arrange_sentence",
    points: 2,
    order: 4,
    tokens: [
      { id: "token-2", content: "学习" },
      { id: "token-1", content: "我" },
    ],
    correctOrder: ["token-1", "token-2"],
  },
];

function fakeRepository(overrides = {}) {
  const attempts = [];
  return {
    attempts,
    toObjectId(value) {
      return ObjectId.isValid(value) ? new ObjectId(value) : null;
    },
    async findLesson(identifier, filter = {}) {
      if (
        String(identifier) !== String(ids.lesson) &&
        identifier !== "quiz-lesson"
      )
        return null;
      return filter.status && filter.status !== lesson.status ? null : lesson;
    },
    async findUnit() {
      return { _id: ids.unit, courseId: ids.course };
    },
    async findCourse(_id, filter = {}) {
      const course = { _id: ids.course, slug: "hsk-1", status: "published" };
      return filter.status && filter.status !== course.status ? null : course;
    },
    async findEnrollment(userId) {
      return String(userId) === String(ids.studentA)
        ? { userId, courseId: ids.course, status: "active" }
        : null;
    },
    async findQuiz(id, filter = {}) {
      const item =
        String(id) === String(ids.draftQuiz)
          ? { ...quiz, _id: ids.draftQuiz, status: "draft" }
          : quiz;
      return filter.status && filter.status !== item.status ? null : item;
    },
    async findQuizByLessonId(_lessonId, filter = {}) {
      return filter.status && filter.status !== quiz.status ? null : quiz;
    },
    async listQuizzes() {
      return [quiz];
    },
    async listQuestions() {
      return questions;
    },
    async createQuiz(document) {
      return { ...document, _id: ids.quiz };
    },
    async updateQuiz(_id, update) {
      return { ...quiz, ...update };
    },
    async findQuestion(id) {
      return questions.find((question) => String(question._id) === String(id));
    },
    async createQuestion(document) {
      return { ...document, _id: ids.choice };
    },
    async updateQuestion(id, update) {
      return {
        ...questions.find((item) => String(item._id) === String(id)),
        ...update,
      };
    },
    async countAttempts() {
      return attempts.length;
    },
    async countQuestions() {
      return questions.length;
    },
    async createAttempt(document) {
      const attempt = { ...document, _id: new ObjectId() };
      attempts.push(attempt);
      return attempt;
    },
    async listAttempts(userId, quizId) {
      return attempts.filter(
        (attempt) =>
          String(attempt.userId) === String(userId) &&
          String(attempt.quizId) === String(quizId),
      );
    },
    ...overrides,
  };
}

function answers({ correct = true } = {}) {
  return {
    answers: [
      { questionId: String(ids.choice), answer: correct ? "a" : "b" },
      { questionId: String(ids.boolean), answer: correct ? "true" : "false" },
      {
        questionId: String(ids.blank),
        answer: correct ? "  BEIJING  " : "Shanghai",
      },
      {
        questionId: String(ids.arrange),
        answer: correct ? ["token-1", "token-2"] : ["token-2", "token-1"],
      },
    ],
  };
}

test("Quiz requires a valid quiz-type Lesson and one Quiz per Lesson", async () => {
  const missing = createQuizService(
    fakeRepository({
      async findLesson() {
        return null;
      },
    }),
  );
  await assert.rejects(
    () =>
      missing.createQuiz({
        lessonId: String(ids.lesson),
        title: "Quiz",
        passingScore: 70,
        status: "draft",
      }),
    { status: 404 },
  );
  const wrongType = createQuizService(
    fakeRepository({
      async findLesson() {
        return { ...lesson, type: "grammar" };
      },
    }),
  );
  await assert.rejects(
    () =>
      wrongType.createQuiz({
        lessonId: String(ids.lesson),
        title: "Quiz",
        passingScore: 70,
        status: "draft",
      }),
    { status: 409 },
  );
  const duplicate = createQuizService(
    fakeRepository({
      async createQuiz() {
        const error = new Error("duplicate");
        error.code = 11000;
        throw error;
      },
    }),
  );
  await assert.rejects(
    () =>
      duplicate.createQuiz({
        lessonId: String(ids.lesson),
        title: "Quiz",
        passingScore: 70,
        status: "draft",
      }),
    { status: 409, message: "This lesson already has a quiz" },
  );
});

test("invalid question types and empty published Quizzes are rejected", async () => {
  const service = createQuizService(
    fakeRepository({
      async listQuestions() {
        return [];
      },
    }),
  );
  await assert.rejects(
    () =>
      service.createQuestion(String(ids.quiz), {
        question: "Bad",
        type: "essay",
        points: 1,
        order: 0,
      }),
    { status: 400 },
  );
  await assert.rejects(
    () => service.updateQuiz(String(ids.quiz), { status: "published" }),
    {
      status: 409,
      message: "A published quiz requires at least one question",
    },
  );
});

test("student Quiz reads hide correct answers and explanations", async () => {
  const service = createQuizService(fakeRepository());
  const result = await service.getPublicByLesson("quiz-lesson");
  assert.equal(result.questions.length, 4);
  assert.equal("explanation" in result.questions[0], false);
  assert.equal("isCorrect" in result.questions[0].options[0], false);
  assert.equal("acceptedAnswers" in result.questions[2], false);
  assert.equal("correctOrder" in result.questions[3], false);
  assert.notDeepEqual(
    result.questions[3].tokens.map((token) => token.id),
    ["token-1", "token-2"],
  );
});

test("draft Quiz cannot be attempted and enrollment belongs to current student", async () => {
  const service = createQuizService(fakeRepository());
  await assert.rejects(
    () =>
      service.submit(
        { _id: ids.studentA, role: "student" },
        String(ids.draftQuiz),
        answers(),
      ),
    { status: 404 },
  );
  await assert.rejects(
    () =>
      service.submit(
        { _id: ids.studentB, role: "student" },
        String(ids.quiz),
        answers(),
      ),
    { status: 403, message: "Enrollment is required to attempt this quiz" },
  );
});

test("all V1 answer types are scored server-side and passing completes progress", async () => {
  let completions = 0;
  const progress = {
    async completeQuizLesson() {
      completions += 1;
      return { courseState: { progressPercentage: 100 } };
    },
    async getCourseState() {
      return { progressPercentage: 0 };
    },
  };
  const repository = fakeRepository();
  const service = createQuizService(repository, progress);
  const result = await service.submit(
    { _id: ids.studentA, role: "student" },
    String(ids.quiz),
    answers(),
  );
  assert.equal(result.attempt.score, 100);
  assert.equal(result.attempt.earnedPoints, 7);
  assert.equal(result.attempt.passed, true);
  assert.equal(result.courseState.progressPercentage, 100);
  assert.equal(completions, 1);
  assert.equal(
    repository.attempts[0].userId.toString(),
    ids.studentA.toString(),
  );
  assert.equal(
    result.attempt.results.every((item) => item.correct),
    true,
  );
});

test("weighted scoring is calculated on the backend", async () => {
  const input = answers();
  input.answers[0].answer = "b";
  const result = await createQuizService(fakeRepository(), {
    async completeQuizLesson() {
      return { courseState: { progressPercentage: 100 } };
    },
  }).submit({ _id: ids.studentA, role: "student" }, String(ids.quiz), input);
  assert.equal(result.attempt.earnedPoints, 5);
  assert.equal(result.attempt.totalPoints, 7);
  assert.equal(result.attempt.score, 71.43);
  assert.equal(result.attempt.passed, true);
});

test("failed Quiz persists an attempt without completing progress", async () => {
  let completions = 0;
  const progress = {
    async completeQuizLesson() {
      completions += 1;
    },
    async getCourseState() {
      return { progressPercentage: 0 };
    },
  };
  const repository = fakeRepository();
  const service = createQuizService(repository, progress);
  const result = await service.submit(
    { _id: ids.studentA, role: "student" },
    String(ids.quiz),
    answers({ correct: false }),
  );
  assert.equal(result.attempt.score, 0);
  assert.equal(result.attempt.passed, false);
  assert.equal(repository.attempts.length, 1);
  assert.equal(completions, 0);
});

test("a question from another Quiz is rejected", async () => {
  const service = createQuizService(fakeRepository());
  const input = answers();
  input.answers[0].questionId = String(ids.foreignQuestion);
  await assert.rejects(
    () =>
      service.submit(
        { _id: ids.studentA, role: "student" },
        String(ids.quiz),
        input,
      ),
    { status: 400, message: "Submitted question does not belong to this quiz" },
  );
});

test("submission identity comes only from the authenticated student", async () => {
  await assert.rejects(
    () =>
      createQuizService(fakeRepository()).submit(
        { _id: ids.studentA, role: "student" },
        String(ids.quiz),
        { ...answers(), userId: String(ids.studentB) },
      ),
    { status: 400, message: "Unknown fields: userId" },
  );
});

test("attempt history is scoped to the authenticated student", async () => {
  const repository = fakeRepository();
  repository.attempts.push({
    _id: ids.attempt,
    userId: ids.studentA,
    quizId: ids.quiz,
    score: 100,
    passed: true,
    results: [],
  });
  const service = createQuizService(repository);
  assert.equal(
    (
      await service.listOwnAttempts(
        { _id: ids.studentA, role: "student" },
        String(ids.quiz),
      )
    ).length,
    1,
  );
  assert.equal(
    (
      await service.listOwnAttempts(
        { _id: ids.studentB, role: "student" },
        String(ids.quiz),
      )
    ).length,
    0,
  );
});
