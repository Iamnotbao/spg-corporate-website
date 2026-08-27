import assert from "node:assert/strict";
import test from "node:test";
import { ObjectId } from "mongodb";
import { createHskExamService } from "./hsk-exam.service.js";

const ids = Object.fromEntries(
  ["exam", "listening", "reading", "choice", "blank", "student", "other"].map((key) => [key, new ObjectId()]),
);

function fakeRepository() {
  const exam = { _id: ids.exam, level: 1, title: "Thi thử HSK 1", description: "Demo", durationMinutes: 20, passingScore: 60, status: "published", createdAt: new Date(), updatedAt: new Date() };
  const sections = [
    { _id: ids.listening, examId: ids.exam, title: "Listening", type: "listening", order: 1 },
    { _id: ids.reading, examId: ids.exam, title: "Reading", type: "reading", order: 2 },
  ];
  const questions = [
    { _id: ids.choice, sectionId: ids.listening, question: "Choose", type: "multiple_choice", points: 1, order: 1, options: [{ id: "a", content: "A", isCorrect: true, order: 0 }, { id: "b", content: "B", isCorrect: false, order: 1 }], explanation: "A is correct" },
    { _id: ids.blank, sectionId: ids.reading, question: "Fill", type: "fill_blank", points: 1, order: 1, acceptedAnswers: ["你好"], explanation: "Greeting" },
  ];
  const attempts = [];
  return {
    attempts,
    toObjectId(value) { return ObjectId.isValid(value) ? new ObjectId(value) : null; },
    async findExam(id, filter = {}) { return String(id) === String(ids.exam) && (!filter.status || filter.status === exam.status) ? exam : null; },
    async listSections() { return sections; },
    async listQuestionsBySectionIds() { return questions; },
    async createAttempt(document) { const item = { ...document, _id: new ObjectId() }; attempts.push(item); return item; },
    async findOwnAttempt(userId, attemptId) { return attempts.find((item) => String(item._id) === String(attemptId) && String(item.userId) === String(userId)) || null; },
    async updateOwnAttempt(userId, attemptId, status, update) { const item = attempts.find((row) => String(row._id) === String(attemptId) && String(row.userId) === String(userId) && row.status === status); if (!item) return null; Object.assign(item, update); return item; },
    async listOwnAttempts() { return []; },
    async countOwnAttempts() { return 0; },
  };
}

test("HSK attempt start never leaks answer keys and grading is server-owned", async () => {
  const repository = fakeRepository();
  const service = createHskExamService(repository);
  const started = await service.startAttempt({ _id: ids.student, role: "student" }, ids.exam);
  assert.equal(started.questions[0].options[0].isCorrect, undefined);
  assert.equal(started.questions[1].acceptedAnswers, undefined);
  assert.equal(started.questions[0].explanation, undefined);

  const result = await service.submitAttempt(
    { _id: ids.student, role: "student" },
    started.id,
    { answers: [{ questionId: String(ids.choice), answer: "a" }, { questionId: String(ids.blank), answer: "sai" }] },
  );
  assert.equal(result.score, 50);
  assert.equal(result.correctCount, 1);
  assert.equal(result.wrongCount, 1);
  assert.equal(result.passed, false);
  assert.equal(result.sectionScores.length, 2);
  assert.equal(result.results[0].correctAnswer.content, "A");
});

test("HSK submissions reject unrelated questions, duplicates, and other owners", async () => {
  const repository = fakeRepository();
  const service = createHskExamService(repository);
  const started = await service.startAttempt({ _id: ids.student, role: "student" }, ids.exam);
  await assert.rejects(
    service.submitAttempt({ _id: ids.student, role: "student" }, started.id, { answers: [{ questionId: String(new ObjectId()), answer: "a" }] }),
    (error) => error.status === 400 && /does not belong/.test(error.message),
  );
  await assert.rejects(
    service.submitAttempt({ _id: ids.other, role: "student" }, started.id, { answers: [] }),
    (error) => error.status === 404,
  );
});
