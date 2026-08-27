import assert from "node:assert/strict";
import test from "node:test";
import { ObjectId } from "mongodb";
import { createHskExamService } from "./hsk-exam.service.js";

const ids = Object.fromEntries(
  [
    "exam",
    "listening",
    "reading",
    "writing",
    "choice",
    "blank",
    "student",
    "other",
  ].map((key) => [key, new ObjectId()]),
);

function fakeRepository({ level = 1, status = "published", includeWriting = false } = {}) {
  const exam = {
    _id: ids.exam,
    level,
    title: `Thi thử HSK ${level}`,
    description: "Demo",
    durationMinutes: 20,
    passingScore: 60,
    status,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const sections = [
    {
      _id: ids.listening,
      examId: ids.exam,
      title: "Listening",
      type: "listening",
      order: 0,
    },
    {
      _id: ids.reading,
      examId: ids.exam,
      title: "Reading",
      type: "reading",
      order: 1,
    },
  ];
  if (includeWriting) {
    sections.push({
      _id: ids.writing,
      examId: ids.exam,
      title: "Writing",
      type: "writing",
      order: 2,
    });
  }

  const questions = [
    {
      _id: ids.choice,
      sectionId: ids.listening,
      question: "Choose",
      type: "multiple_choice",
      points: 40,
      order: 0,
      audioUrl: "https://res.cloudinary.com/demo/video/upload/listening.mp3",
      options: [
        { id: "a", content: "A", isCorrect: true, order: 0 },
        { id: "b", content: "B", isCorrect: false, order: 1 },
      ],
      explanation: "A is correct",
    },
    {
      _id: ids.blank,
      sectionId: ids.reading,
      question: "Fill",
      type: "fill_blank",
      points: 50,
      order: 0,
      acceptedAnswers: ["你好"],
      explanation: "Greeting",
    },
  ];
  if (includeWriting) {
    questions.push({
      _id: new ObjectId(),
      sectionId: ids.writing,
      question: "Arrange",
      type: "arrange_sentence",
      points: 99,
      order: 0,
      tokens: [
        { id: "w1", content: "我" },
        { id: "w2", content: "很好" },
      ],
      correctOrder: ["w1", "w2"],
    });
  }

  const attempts = [];
  return {
    attempts,
    exam,
    sections,
    questions,
    toObjectId(value) {
      return ObjectId.isValid(value) ? new ObjectId(value) : null;
    },
    async findExam(id, filter = {}) {
      return String(id) === String(ids.exam) &&
        (!filter.status || filter.status === exam.status)
        ? exam
        : null;
    },
    async listSections() {
      return sections;
    },
    async listQuestionsBySectionIds() {
      return questions;
    },
    async findSection(id) {
      return sections.find((item) => String(item._id) === String(id)) || null;
    },
    async createSection(document) {
      const item = { ...document, _id: new ObjectId() };
      sections.push(item);
      return item;
    },
    async updateSection(id, update) {
      const item = sections.find((row) => String(row._id) === String(id));
      if (!item) return null;
      Object.assign(item, update);
      return item;
    },
    async countQuestions(sectionId) {
      return questions.filter((item) => String(item.sectionId) === String(sectionId)).length;
    },
    async findQuestion(id) {
      return questions.find((item) => String(item._id) === String(id)) || null;
    },
    async createQuestion(document) {
      const item = { ...document, _id: new ObjectId() };
      questions.push(item);
      return item;
    },
    async updateExam(id, update) {
      assert.equal(String(id), String(ids.exam));
      Object.assign(exam, update);
      return exam;
    },
    async countAttempts() {
      return attempts.length;
    },
    async createAttempt(document) {
      const item = { ...document, _id: new ObjectId() };
      attempts.push(item);
      return item;
    },
    async findOwnAttempt(userId, attemptId) {
      return (
        attempts.find(
          (item) =>
            String(item._id) === String(attemptId) &&
            String(item.userId) === String(userId),
        ) || null
      );
    },
    async updateOwnAttempt(userId, attemptId, attemptStatus, update) {
      const item = attempts.find(
        (row) =>
          String(row._id) === String(attemptId) &&
          String(row.userId) === String(userId) &&
          row.status === attemptStatus,
      );
      if (!item) return null;
      Object.assign(item, update);
      return item;
    },
    async listOwnAttempts() {
      return [];
    },
    async countOwnAttempts() {
      return 0;
    },
  };
}

test("HSK attempt start never leaks answer keys and grading is server-owned", async () => {
  const repository = fakeRepository();
  const service = createHskExamService(repository);
  const started = await service.startAttempt(
    { _id: ids.student, role: "student" },
    ids.exam,
  );
  assert.equal(started.questions[0].options[0].isCorrect, undefined);
  assert.equal(started.questions[1].acceptedAnswers, undefined);
  assert.equal(started.questions[0].explanation, undefined);

  const result = await service.submitAttempt(
    { _id: ids.student, role: "student" },
    started.id,
    {
      answers: [
        { questionId: String(ids.choice), answer: "a" },
        { questionId: String(ids.blank), answer: "sai" },
      ],
    },
  );

  assert.equal(result.score, 50);
  assert.equal(result.hskScore, 100);
  assert.equal(result.maxHskScore, 200);
  assert.equal(result.correctCount, 1);
  assert.equal(result.wrongCount, 1);
  assert.equal(result.passed, false);
  assert.equal(result.sectionScores.length, 2);
  assert.equal(result.sectionScores[0].hskScore, 100);
  assert.equal(result.sectionScores[1].hskScore, 0);
  assert.equal(result.results[0].earnedPoints, 1);
  assert.equal(result.results[0].possiblePoints, 1);
  assert.equal(result.results[0].correctAnswer.content, "A");
});

test("HSK 1 and 2 use listening and reading only", async () => {
  const repository = fakeRepository({ status: "archived" });
  const service = createHskExamService(repository);

  await assert.rejects(
    service.createSection(ids.exam, {
      title: "Writing",
      type: "writing",
      description: "Not valid for HSK 1",
      order: 2,
    }),
    (error) => error.status === 409 && /Writing starts from HSK 3/.test(error.message),
  );

  const published = await service.updateExam(ids.exam, { status: "published" });
  assert.equal(published.status, "published");
});

test("HSK 3+ requires one listening, reading and writing section", async () => {
  const missingWriting = fakeRepository({ level: 3, status: "archived" });
  const missingWritingService = createHskExamService(missingWriting);

  await assert.rejects(
    missingWritingService.updateExam(ids.exam, { status: "published" }),
    (error) => error.status === 409 && /Listening, Reading, Writing/.test(error.message),
  );

  const complete = fakeRepository({ level: 3, status: "archived", includeWriting: true });
  const completeService = createHskExamService(complete);
  const published = await completeService.updateExam(ids.exam, { status: "published" });
  assert.equal(published.status, "published");
});

test("listening questions require audio and writing rejects true false", async () => {
  const repository = fakeRepository({ level: 3, status: "archived", includeWriting: true });
  const service = createHskExamService(repository);

  await assert.rejects(
    service.createQuestion(ids.listening, {
      question: "No audio",
      type: "multiple_choice",
      explanation: "",
      points: 9,
      order: 2,
      audioUrl: "",
      imageUrl: "",
      options: [
        { content: "A", isCorrect: true, order: 0 },
        { content: "B", isCorrect: false, order: 1 },
      ],
    }),
    (error) => error.status === 409 && /require an audio URL/.test(error.message),
  );

  await assert.rejects(
    service.createQuestion(ids.writing, {
      question: "Writing is not true false",
      type: "true_false",
      explanation: "",
      points: 1,
      order: 2,
      audioUrl: "",
      imageUrl: "",
      options: [
        { content: "Đúng", isCorrect: true, order: 0 },
        { content: "Sai", isCorrect: false, order: 1 },
      ],
    }),
    (error) => error.status === 409 && /Writing does not support true_false/.test(error.message),
  );
});

test("HSK submissions reject unrelated questions, duplicates, and other owners", async () => {
  const repository = fakeRepository();
  const service = createHskExamService(repository);
  const started = await service.startAttempt(
    { _id: ids.student, role: "student" },
    ids.exam,
  );

  await assert.rejects(
    service.submitAttempt(
      { _id: ids.student, role: "student" },
      started.id,
      {
        answers: [
          { questionId: String(new ObjectId()), answer: "a" },
        ],
      },
    ),
    (error) => error.status === 400 && /does not belong/.test(error.message),
  );

  await assert.rejects(
    service.submitAttempt(
      { _id: ids.other, role: "student" },
      started.id,
      { answers: [] },
    ),
    (error) => error.status === 404,
  );
});
