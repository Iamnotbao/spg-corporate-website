import { randomUUID } from "node:crypto";
import {
  paginationResult,
  parseAdminPagination,
  parseDateRange,
  parsePagination,
  parseSearch,
  searchFilter,
} from "../../utils/pagination.js";
import { hskExamRepository } from "./hsk-exam.repository.js";
import {
  EXAM_STATUSES,
  HskExamValidationError,
  validateExam,
  validateQuestion,
  validateSection,
  validateSubmission,
} from "./hsk-exam.validation.js";

export class HskExamServiceError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function requireId(repository, value, field = "id") {
  const id = repository.toObjectId(value);
  if (!id) throw new HskExamValidationError(`${field} must be a valid id`);
  return id;
}

function requireStudent(user) {
  if (user?.role !== "student") throw new HskExamServiceError(403, "Student access required");
  return user._id;
}

function examDto(item) {
  return {
    id: String(item._id),
    level: item.level,
    title: item.title,
    description: item.description,
    durationMinutes: item.durationMinutes,
    passingScore: item.passingScore,
    status: item.status,
    featured: Boolean(item.featured),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function sectionDto(item) {
  return { id: String(item._id), examId: String(item.examId), title: item.title, type: item.type, description: item.description, order: item.order };
}

function normalizeQuestion(validated) {
  const result = { ...validated };
  if (validated.options) {
    result.options = validated.options.map((option) => ({ ...option, id: option.id || randomUUID() }));
  }
  if (validated.tokens) {
    result.tokens = validated.tokens.map((content) => ({ id: randomUUID(), content }));
    result.correctOrder = result.tokens.map((token) => token.id);
  }
  return result;
}

function adminQuestionDto(item) {
  return {
    id: String(item._id), sectionId: String(item.sectionId), question: item.question,
    type: item.type, explanation: item.explanation, points: item.points, order: item.order,
    audioUrl: item.audioUrl, imageUrl: item.imageUrl,
    ...(item.options ? { options: item.options } : {}),
    ...(item.acceptedAnswers ? { acceptedAnswers: item.acceptedAnswers } : {}),
    ...(item.tokens ? { tokens: item.correctOrder.map((id) => item.tokens.find((token) => token.id === id)?.content) } : {}),
  };
}

function safeQuestion(item) {
  const sortedTokens = item.tokens
    ? [...item.tokens]
        .map(({ id, content }) => ({ id, content }))
        .sort((a, b) => a.id.localeCompare(b.id))
    : null;
  const safeTokens =
    sortedTokens &&
    sortedTokens.every((token, index) => token.id === item.correctOrder[index])
      ? [...sortedTokens.slice(1), sortedTokens[0]]
      : sortedTokens;
  return {
    id: String(item._id), sectionId: String(item.sectionId), question: item.question,
    type: item.type, points: item.points, order: item.order, audioUrl: item.audioUrl, imageUrl: item.imageUrl,
    ...(item.options ? { options: item.options.map(({ id, content, order }) => ({ id, content, order })) } : {}),
    ...(safeTokens ? { tokens: safeTokens } : {}),
  };
}

function normalizeText(value) {
  return String(value ?? "").trim().normalize("NFC").toLocaleLowerCase("vi");
}

function gradeQuestion(question, answer) {
  let correct = false;
  let correctAnswer;
  if (["multiple_choice", "true_false"].includes(question.type)) {
    const option = question.options.find((item) => item.isCorrect);
    correct = typeof answer === "string" && answer === option.id;
    correctAnswer = { optionId: option.id, content: option.content };
  } else if (question.type === "fill_blank") {
    correct = typeof answer === "string" && question.acceptedAnswers.some((item) => normalizeText(item) === normalizeText(answer));
    correctAnswer = { acceptedAnswers: question.acceptedAnswers };
  } else {
    correct = Array.isArray(answer) && answer.length === question.correctOrder.length && answer.every((item, index) => item === question.correctOrder[index]);
    correctAnswer = { tokens: question.correctOrder.map((id) => question.tokens.find((token) => token.id === id)) };
  }
  return {
    questionId: String(question._id), sectionId: String(question.sectionId), question: question.question,
    submittedAnswer: answer, correct, earnedPoints: correct ? question.points : 0,
    possiblePoints: question.points, explanation: question.explanation, correctAnswer,
  };
}

function evaluation(score, title) {
  if (score >= 80) return `${title}: nền tảng vững, có thể tăng độ khó.`;
  if (score >= 60) return `${title}: đã nắm phần chính, nên ôn lại các câu sai.`;
  return `${title}: cần củng cố kiến thức nền trước khi thử lại.`;
}

function attemptDto(item, { includeResults = true } = {}) {
  return {
    id: String(item._id), examId: String(item.examId), status: item.status,
    startedAt: item.startedAt, expiresAt: item.expiresAt, submittedAt: item.submittedAt,
    score: item.score, passed: item.passed, correctCount: item.correctCount,
    wrongCount: item.wrongCount, sectionScores: item.sectionScores,
    evaluation: item.evaluation,
    ...(includeResults && item.results ? { results: item.results } : {}),
  };
}

export function createHskExamService(repository = hskExamRepository) {
  async function contentFor(examId) {
    const sections = await repository.listSections(examId);
    const questions = sections.length
      ? await repository.listQuestionsBySectionIds(sections.map((item) => item._id))
      : [];
    return { sections, questions };
  }

  async function requirePublishable(examId) {
    const content = await contentFor(examId);
    if (!content.sections.length) throw new HskExamServiceError(409, "A published exam requires at least one section");
    if (!content.questions.length) throw new HskExamServiceError(409, "A published exam requires at least one question");
    for (const section of content.sections) {
      if (!content.questions.some((question) => String(question.sectionId) === String(section._id))) {
        throw new HskExamServiceError(409, "Every published exam section requires a question");
      }
    }
    return content;
  }

  async function requireExam(id, filter = {}) {
    requireId(repository, id, "examId");
    const exam = await repository.findExam(id, filter);
    if (!exam) throw new HskExamServiceError(404, "HSK mock exam not found");
    return exam;
  }

  return {
    async listAdmin(filters = {}) {
      const paging = parseAdminPagination(filters);
      const query = { ...parseDateRange(filters) };
      const search = parseSearch(filters.search);
      if (search) Object.assign(query, searchFilter(search, ["title", "description"]));
      if (filters.status) {
        if (!EXAM_STATUSES.includes(filters.status)) throw new HskExamValidationError("Invalid status filter");
        query.status = filters.status;
      }
      if (filters.level) {
        const level = Number(filters.level);
        if (!Number.isInteger(level) || level < 1 || level > 6) throw new HskExamValidationError("level must be from 1 to 6");
        query.level = level;
      }
      const [items, total] = await Promise.all([
        repository.listExams(query, { skip: paging.skip, limit: paging.pageSize }),
        repository.countExams(query),
      ]);
      return { data: items.map(examDto), pagination: paginationResult(paging, total) };
    },
    async listPublished(filters = {}) {
      const paging = parsePagination(filters, { defaultPageSize: 9, maxPageSize: 30 });
      const query = { status: "published" };
      if (filters.level) query.level = Number(filters.level);
      const [items, total] = await Promise.all([
        repository.listExams(query, { skip: paging.skip, limit: paging.pageSize }),
        repository.countExams(query),
      ]);
      return { data: items.map(examDto), pagination: paginationResult(paging, total) };
    },
    async getAdmin(id) {
      const exam = await requireExam(id);
      const { sections, questions } = await contentFor(exam._id);
      return {
        ...examDto(exam),
        sections: sections.map((section) => ({
          ...sectionDto(section),
          questions: questions.filter((question) => String(question.sectionId) === String(section._id)).map(adminQuestionDto),
        })),
      };
    },
    async getPublished(id) {
      const exam = await requireExam(id, { status: "published" });
      const { sections, questions } = await requirePublishable(exam._id);
      return { ...examDto(exam), sections: sections.map((section) => ({ ...sectionDto(section), questionCount: questions.filter((question) => String(question.sectionId) === String(section._id)).length })) };
    },
    async createExam(input) {
      const validated = validateExam(input);
      if (validated.status === "published") throw new HskExamServiceError(409, "Create the exam as draft, then add sections and questions");
      const now = new Date();
      return examDto(await repository.createExam({ ...validated, createdAt: now, updatedAt: now }));
    },
    async updateExam(id, input) {
      const exam = await requireExam(id);
      const validated = validateExam(input, { partial: true });
      if (validated.status === "published" && exam.status !== "published") await requirePublishable(exam._id);
      return examDto(await repository.updateExam(id, { ...validated, updatedAt: new Date() }));
    },
    async deleteExam(id) {
      const exam = await requireExam(id);
      if (exam.status !== "draft") throw new HskExamServiceError(409, "Only draft exams can be deleted; archive published exams");
      if ((await repository.listSections(id)).length) throw new HskExamServiceError(409, "Delete exam sections first");
      if (await repository.countAttempts(id)) throw new HskExamServiceError(409, "Exam with attempts cannot be deleted");
      await repository.deleteExam(id);
    },
    async createSection(examId, input) {
      const exam = await requireExam(examId);
      if (exam.status === "published") throw new HskExamServiceError(409, "Unpublish the exam before changing its structure");
      const now = new Date();
      return sectionDto(await repository.createSection({ ...validateSection(input), examId: exam._id, createdAt: now, updatedAt: now }));
    },
    async updateSection(id, input) {
      const section = await repository.findSection(requireId(repository, id));
      if (!section) throw new HskExamServiceError(404, "Exam section not found");
      const exam = await requireExam(section.examId);
      if (exam.status === "published") throw new HskExamServiceError(409, "Unpublish the exam before changing its structure");
      return sectionDto(await repository.updateSection(id, { ...validateSection(input, { partial: true }), updatedAt: new Date() }));
    },
    async deleteSection(id) {
      const section = await repository.findSection(requireId(repository, id));
      if (!section) throw new HskExamServiceError(404, "Exam section not found");
      const exam = await requireExam(section.examId);
      if (exam.status === "published") throw new HskExamServiceError(409, "Unpublish the exam before changing its structure");
      if (await repository.countQuestions(id)) throw new HskExamServiceError(409, "Delete section questions first");
      await repository.deleteSection(id);
    },
    async createQuestion(sectionId, input) {
      const section = await repository.findSection(requireId(repository, sectionId, "sectionId"));
      if (!section) throw new HskExamServiceError(404, "Exam section not found");
      const exam = await requireExam(section.examId);
      if (exam.status === "published") throw new HskExamServiceError(409, "Unpublish the exam before changing questions");
      const now = new Date();
      return adminQuestionDto(await repository.createQuestion({ ...normalizeQuestion(validateQuestion(input)), sectionId: section._id, createdAt: now, updatedAt: now }));
    },
    async updateQuestion(id, input) {
      const current = await repository.findQuestion(requireId(repository, id));
      if (!current) throw new HskExamServiceError(404, "Exam question not found");
      const section = await repository.findSection(current.sectionId);
      const exam = await requireExam(section.examId);
      if (exam.status === "published") throw new HskExamServiceError(409, "Unpublish the exam before changing questions");
      const merged = { ...adminQuestionDto(current), ...input };
      delete merged.id;
      delete merged.sectionId;
      const update = normalizeQuestion(validateQuestion(merged));
      return adminQuestionDto(await repository.updateQuestion(id, { ...update, updatedAt: new Date() }));
    },
    async deleteQuestion(id) {
      const current = await repository.findQuestion(requireId(repository, id));
      if (!current) throw new HskExamServiceError(404, "Exam question not found");
      const section = await repository.findSection(current.sectionId);
      const exam = await requireExam(section.examId);
      if (exam.status === "published") throw new HskExamServiceError(409, "Unpublish the exam before changing questions");
      await repository.deleteQuestion(id);
    },
    async startAttempt(user, examId) {
      const userId = requireStudent(user);
      const exam = await requireExam(examId, { status: "published" });
      const content = await requirePublishable(exam._id);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + exam.durationMinutes * 60_000);
      const snapshot = {
        exam: examDto(exam),
        sections: content.sections,
        questions: content.questions,
      };
      const attempt = await repository.createAttempt({ userId: repository.toObjectId(userId), examId: exam._id, status: "in_progress", startedAt: now, expiresAt, snapshot, createdAt: now, updatedAt: now });
      return {
        ...attemptDto(attempt, { includeResults: false }),
        exam: snapshot.exam,
        sections: snapshot.sections.map(sectionDto),
        questions: snapshot.questions.map(safeQuestion),
      };
    },
    async submitAttempt(user, attemptId, input) {
      const userId = requireStudent(user);
      const attempt = await repository.findOwnAttempt(userId, requireId(repository, attemptId, "attemptId"));
      if (!attempt) throw new HskExamServiceError(404, "Exam attempt not found");
      if (attempt.status !== "in_progress") throw new HskExamServiceError(409, "This exam attempt has already been submitted");
      const questions = attempt.snapshot.questions;
      const answers = validateSubmission(input);
      const expected = new Set(questions.map((question) => String(question._id)));
      const submitted = new Set();
      for (const answer of answers) {
        if (!expected.has(answer.questionId)) throw new HskExamServiceError(400, "Submitted question does not belong to this exam");
        if (submitted.has(answer.questionId)) throw new HskExamServiceError(400, "Each question may be answered once");
        submitted.add(answer.questionId);
      }
      if (submitted.size !== expected.size) throw new HskExamServiceError(400, "Every exam question requires an answer");
      const answerMap = new Map(answers.map((answer) => [answer.questionId, answer.answer]));
      const results = questions.map((question) => gradeQuestion(question, answerMap.get(String(question._id))));
      const totalPoints = results.reduce((sum, item) => sum + item.possiblePoints, 0);
      const earnedPoints = results.reduce((sum, item) => sum + item.earnedPoints, 0);
      const score = Math.round((earnedPoints / totalPoints) * 10_000) / 100;
      const sectionScores = attempt.snapshot.sections.map((section) => {
        const rows = results.filter((item) => item.sectionId === String(section._id));
        const possible = rows.reduce((sum, item) => sum + item.possiblePoints, 0);
        const earned = rows.reduce((sum, item) => sum + item.earnedPoints, 0);
        const sectionScore = possible ? Math.round((earned / possible) * 10_000) / 100 : 0;
        return { sectionId: String(section._id), title: section.title, type: section.type, score: sectionScore, earnedPoints: earned, totalPoints: possible };
      });
      const now = new Date();
      const update = {
        status: "submitted", submittedAt: now, updatedAt: now, late: now > attempt.expiresAt,
        score, earnedPoints, totalPoints, passed: score >= attempt.snapshot.exam.passingScore,
        correctCount: results.filter((item) => item.correct).length,
        wrongCount: results.filter((item) => !item.correct).length,
        sectionScores,
        evaluation: [evaluation(score, "Tổng thể"), ...sectionScores.map((item) => evaluation(item.score, item.title))],
        results,
      };
      const saved = await repository.updateOwnAttempt(userId, attempt._id, "in_progress", update);
      if (!saved) throw new HskExamServiceError(409, "This exam attempt has already been submitted");
      return attemptDto(saved);
    },
    async listOwnAttempts(user, examId, filters = {}) {
      const userId = requireStudent(user);
      await requireExam(examId);
      const paging = parsePagination(filters, { defaultPageSize: 10, maxPageSize: 50 });
      const [items, total] = await Promise.all([
        repository.listOwnAttempts(userId, examId, { skip: paging.skip, limit: paging.pageSize }),
        repository.countOwnAttempts(userId, examId),
      ]);
      return { data: items.map((item) => attemptDto(item, { includeResults: false })), pagination: paginationResult(paging, total) };
    },
    async getOwnAttempt(user, attemptId) {
      const userId = requireStudent(user);
      const attempt = await repository.findOwnAttempt(userId, requireId(repository, attemptId, "attemptId"));
      if (!attempt) throw new HskExamServiceError(404, "Exam attempt not found");
      if (attempt.status === "in_progress") {
        return {
          ...attemptDto(attempt, { includeResults: false }),
          exam: attempt.snapshot.exam,
          sections: attempt.snapshot.sections.map(sectionDto),
          questions: attempt.snapshot.questions.map(safeQuestion),
        };
      }
      return { ...attemptDto(attempt), exam: attempt.snapshot.exam };
    },
  };
}

export const hskExamService = createHskExamService();
