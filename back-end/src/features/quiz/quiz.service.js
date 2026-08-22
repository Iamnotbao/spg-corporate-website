import { randomUUID } from "node:crypto";
import { studentLearningService } from "../student-learning/student-learning.service.js";
import { quizRepository } from "./quiz.repository.js";
import {
  QuizValidationError,
  validateQuestion,
  validateQuiz,
  validateSubmission,
} from "./quiz.validation.js";

export class QuizServiceError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function requireId(repository, value, field = "id") {
  const id = repository.toObjectId(value);
  if (!id) throw new QuizValidationError(`${field} must be a valid id`);
  return id;
}

function requireStudent(user) {
  if (!user || user.role !== "student") {
    throw new QuizServiceError(403, "Student access required");
  }
  return user._id;
}

function serializeQuiz(quiz) {
  return {
    id: String(quiz._id),
    lessonId: String(quiz.lessonId),
    title: quiz.title,
    description: quiz.description,
    passingScore: quiz.passingScore,
    status: quiz.status,
    createdAt: quiz.createdAt,
    updatedAt: quiz.updatedAt,
  };
}

function adminQuestionInput(question) {
  return {
    quizId: String(question.quizId),
    question: question.question,
    type: question.type,
    explanation: question.explanation,
    points: question.points,
    order: question.order,
    ...(question.options ? { options: question.options } : {}),
    ...(question.acceptedAnswers
      ? { acceptedAnswers: question.acceptedAnswers }
      : {}),
    ...(question.tokens
      ? {
          tokens: question.correctOrder.map(
            (id) => question.tokens.find((token) => token.id === id)?.content,
          ),
        }
      : {}),
  };
}

function normalizeQuestionDocument(validated, repository) {
  const base = {
    ...validated,
    quizId: repository.toObjectId(validated.quizId),
  };
  if (validated.options) {
    base.options = validated.options.map((option) => ({
      ...option,
      id: option.id || randomUUID(),
    }));
  }
  if (validated.tokens) {
    base.tokens = validated.tokens.map((content) => ({
      id: randomUUID(),
      content,
    }));
    base.correctOrder = base.tokens.map((token) => token.id);
  }
  return base;
}

function serializeQuestionAdmin(question) {
  const result = {
    id: String(question._id),
    quizId: String(question.quizId),
    question: question.question,
    type: question.type,
    explanation: question.explanation,
    points: question.points,
    order: question.order,
    createdAt: question.createdAt,
    updatedAt: question.updatedAt,
  };
  if (question.options) result.options = question.options;
  if (question.acceptedAnswers)
    result.acceptedAnswers = question.acceptedAnswers;
  if (question.tokens) {
    result.tokens = question.correctOrder.map(
      (id) => question.tokens.find((token) => token.id === id)?.content,
    );
  }
  return result;
}

function serializeQuestionStudent(question) {
  const result = {
    id: String(question._id),
    question: question.question,
    type: question.type,
    points: question.points,
    order: question.order,
  };
  if (question.options) {
    result.options = question.options
      .map(({ id, content, order }) => ({ id, content, order }))
      .sort((left, right) => left.order - right.order);
  }
  if (question.tokens) {
    const stableTokens = question.tokens
      .map(({ id, content }) => ({ id, content }))
      .sort((left, right) => left.id.localeCompare(right.id));
    const matchesAnswer = stableTokens.every(
      (token, index) => token.id === question.correctOrder[index],
    );
    result.tokens = matchesAnswer
      ? [...stableTokens.slice(1), stableTokens[0]]
      : stableTokens;
  }
  return result;
}

function validatePublishable(questions) {
  if (!questions.length) {
    throw new QuizServiceError(
      409,
      "A published quiz requires at least one question",
    );
  }
  const totalPoints = questions.reduce(
    (sum, question) => sum + Number(question.points || 0),
    0,
  );
  if (totalPoints <= 0) {
    throw new QuizServiceError(
      409,
      "A published quiz requires positive total points",
    );
  }
  for (const question of questions) {
    if (["multiple_choice", "true_false"].includes(question.type)) {
      if (
        !question.options?.length ||
        question.options.filter((option) => option.isCorrect).length !== 1
      ) {
        throw new QuizServiceError(
          409,
          "Every choice question requires one correct option",
        );
      }
    } else if (
      question.type === "fill_blank" &&
      !question.acceptedAnswers?.length
    ) {
      throw new QuizServiceError(
        409,
        "Every fill-blank question requires an accepted answer",
      );
    } else if (
      question.type === "arrange_sentence" &&
      (!question.tokens?.length ||
        question.correctOrder?.length !== question.tokens.length)
    ) {
      throw new QuizServiceError(
        409,
        "Every arrangement question requires a complete answer order",
      );
    }
  }
}

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .normalize("NFC")
    .toLocaleLowerCase("vi");
}

function gradeQuestion(question, submitted) {
  let correct = false;
  let correctAnswer;
  if (["multiple_choice", "true_false"].includes(question.type)) {
    const option = question.options.find((item) => item.isCorrect);
    correct = typeof submitted === "string" && submitted === option.id;
    correctAnswer = { optionId: option.id, content: option.content };
  } else if (question.type === "fill_blank") {
    correct =
      typeof submitted === "string" &&
      question.acceptedAnswers.some(
        (answer) => normalizeText(answer) === normalizeText(submitted),
      );
    correctAnswer = { acceptedAnswers: question.acceptedAnswers };
  } else {
    correct =
      Array.isArray(submitted) &&
      submitted.length === question.correctOrder.length &&
      submitted.every((value, index) => value === question.correctOrder[index]);
    correctAnswer = {
      tokens: question.correctOrder.map((id) =>
        question.tokens.find((token) => token.id === id),
      ),
    };
  }
  return {
    questionId: String(question._id),
    question: question.question,
    type: question.type,
    submittedAnswer: submitted,
    correct,
    earnedPoints: correct ? question.points : 0,
    possiblePoints: question.points,
    explanation: question.explanation,
    correctAnswer,
  };
}

function serializeAttempt(attempt) {
  return {
    id: String(attempt._id),
    quizId: String(attempt.quizId),
    score: attempt.score,
    earnedPoints: attempt.earnedPoints,
    totalPoints: attempt.totalPoints,
    passed: attempt.passed,
    submittedAt: attempt.submittedAt,
    results: attempt.results,
  };
}

export function createQuizService(
  repository = quizRepository,
  progressService = studentLearningService,
) {
  async function requireQuizLesson(identifier, { published = false } = {}) {
    const lesson = await repository.findLesson(
      identifier,
      published ? { status: "published" } : {},
    );
    if (!lesson) throw new QuizServiceError(404, "Quiz lesson not found");
    if (lesson.type !== "quiz") {
      throw new QuizServiceError(
        409,
        "Quiz must belong to a lesson with type quiz",
      );
    }
    return lesson;
  }

  async function requirePublicHierarchy(lesson) {
    const unit = await repository.findUnit(lesson.unitId);
    if (!unit) throw new QuizServiceError(404, "Quiz not found");
    const course = await repository.findCourse(unit.courseId, {
      status: "published",
    });
    if (!course) throw new QuizServiceError(404, "Quiz not found");
    return { unit, course };
  }

  async function publicQuizByLesson(identifier) {
    const lesson = await requireQuizLesson(identifier, { published: true });
    await requirePublicHierarchy(lesson);
    const quiz = await repository.findQuizByLessonId(lesson._id, {
      status: "published",
    });
    if (!quiz) throw new QuizServiceError(404, "Quiz not found");
    const questions = await repository.listQuestions({ quizId: quiz._id });
    validatePublishable(questions);
    return { quiz, lesson, questions };
  }

  return {
    async listAdmin() {
      const quizzes = await repository.listQuizzes();
      const questions = quizzes.length
        ? await repository.listQuestions({
            quizId: { $in: quizzes.map((quiz) => quiz._id) },
          })
        : [];
      return quizzes.map((quiz) => ({
        ...serializeQuiz(quiz),
        questionCount: questions.filter(
          (question) => String(question.quizId) === String(quiz._id),
        ).length,
      }));
    },

    async getAdmin(id) {
      requireId(repository, id);
      const quiz = await repository.findQuiz(id);
      if (!quiz) throw new QuizServiceError(404, "Quiz not found");
      const questions = await repository.listQuestions({ quizId: quiz._id });
      return {
        ...serializeQuiz(quiz),
        questions: questions.map(serializeQuestionAdmin),
      };
    },

    async createQuiz(input) {
      const validated = validateQuiz(input);
      const lesson = await requireQuizLesson(validated.lessonId);
      if (validated.status === "published") validatePublishable([]);
      const now = new Date();
      try {
        return serializeQuiz(
          await repository.createQuiz({
            ...validated,
            lessonId: lesson._id,
            createdAt: now,
            updatedAt: now,
          }),
        );
      } catch (error) {
        if (error?.code === 11000) {
          throw new QuizServiceError(409, "This lesson already has a quiz");
        }
        throw error;
      }
    },

    async updateQuiz(id, input) {
      requireId(repository, id);
      const current = await repository.findQuiz(id);
      if (!current) throw new QuizServiceError(404, "Quiz not found");
      const validated = validateQuiz(input, { partial: true });
      if (validated.lessonId) {
        const lesson = await requireQuizLesson(validated.lessonId);
        validated.lessonId = lesson._id;
      }
      const nextStatus = validated.status || current.status;
      if (nextStatus === "published") {
        validatePublishable(
          await repository.listQuestions({ quizId: current._id }),
        );
      }
      try {
        const quiz = await repository.updateQuiz(id, {
          ...validated,
          updatedAt: new Date(),
        });
        return serializeQuiz(quiz);
      } catch (error) {
        if (error?.code === 11000) {
          throw new QuizServiceError(409, "This lesson already has a quiz");
        }
        throw error;
      }
    },

    async deleteQuiz(id) {
      requireId(repository, id);
      if (await repository.countAttempts(id)) {
        throw new QuizServiceError(409, "Quiz with attempts cannot be deleted");
      }
      if (await repository.countQuestions(id)) {
        throw new QuizServiceError(
          409,
          "Delete quiz questions before deleting the quiz",
        );
      }
      const result = await repository.deleteQuiz(id);
      if (!result.deletedCount)
        throw new QuizServiceError(404, "Quiz not found");
    },

    async createQuestion(quizId, input) {
      requireId(repository, quizId, "quizId");
      const quiz = await repository.findQuiz(quizId);
      if (!quiz) throw new QuizServiceError(404, "Quiz not found");
      const validated = validateQuestion({
        ...input,
        quizId: String(quiz._id),
      });
      const now = new Date();
      const document = normalizeQuestionDocument(validated, repository);
      return serializeQuestionAdmin(
        await repository.createQuestion({
          ...document,
          createdAt: now,
          updatedAt: now,
        }),
      );
    },

    async updateQuestion(id, input) {
      requireId(repository, id);
      const current = await repository.findQuestion(id);
      if (!current) throw new QuizServiceError(404, "Question not found");
      const merged = {
        ...adminQuestionInput(current),
        ...input,
        quizId: String(current.quizId),
      };
      const effectiveType = merged.type;
      if (["multiple_choice", "true_false"].includes(effectiveType)) {
        delete merged.acceptedAnswers;
        delete merged.tokens;
      } else if (effectiveType === "fill_blank") {
        delete merged.options;
        delete merged.tokens;
      } else if (effectiveType === "arrange_sentence") {
        delete merged.options;
        delete merged.acceptedAnswers;
      }
      const validated = validateQuestion(merged);
      const document = normalizeQuestionDocument(validated, repository);
      const question = await repository.updateQuestion(id, {
        ...document,
        updatedAt: new Date(),
      });
      return serializeQuestionAdmin(question);
    },

    async deleteQuestion(id) {
      requireId(repository, id);
      const question = await repository.findQuestion(id);
      if (!question) throw new QuizServiceError(404, "Question not found");
      if (await repository.countAttempts(question.quizId)) {
        throw new QuizServiceError(
          409,
          "Question with quiz attempts cannot be deleted",
        );
      }
      const quiz = await repository.findQuiz(question.quizId);
      if (
        quiz?.status === "published" &&
        (await repository.countQuestions(quiz._id)) <= 1
      ) {
        throw new QuizServiceError(
          409,
          "A published quiz must keep at least one question",
        );
      }
      await repository.deleteQuestion(id);
    },

    async getPublicByLesson(identifier) {
      const { quiz, questions } = await publicQuizByLesson(identifier);
      return {
        ...serializeQuiz(quiz),
        questions: questions.map(serializeQuestionStudent),
      };
    },

    async submit(user, quizId, input) {
      const userId = requireStudent(user);
      requireId(repository, quizId, "quizId");
      const quiz = await repository.findQuiz(quizId, { status: "published" });
      if (!quiz) throw new QuizServiceError(404, "Quiz not found");
      const lesson = await requireQuizLesson(quiz.lessonId, {
        published: true,
      });
      const { course } = await requirePublicHierarchy(lesson);
      if (!(await repository.findEnrollment(userId, course._id))) {
        throw new QuizServiceError(
          403,
          "Enrollment is required to attempt this quiz",
        );
      }
      const questions = await repository.listQuestions({ quizId: quiz._id });
      validatePublishable(questions);
      const answers = validateSubmission(input);
      const expectedIds = new Set(
        questions.map((question) => String(question._id)),
      );
      const submittedIds = new Set();
      for (const answer of answers) {
        if (!expectedIds.has(answer.questionId)) {
          throw new QuizServiceError(
            400,
            "Submitted question does not belong to this quiz",
          );
        }
        if (submittedIds.has(answer.questionId)) {
          throw new QuizServiceError(400, "Each question may be answered once");
        }
        submittedIds.add(answer.questionId);
      }
      if (submittedIds.size !== expectedIds.size) {
        throw new QuizServiceError(
          400,
          "Every quiz question requires an answer",
        );
      }
      const answerByQuestion = new Map(
        answers.map((answer) => [answer.questionId, answer.answer]),
      );
      const results = questions.map((question) =>
        gradeQuestion(question, answerByQuestion.get(String(question._id))),
      );
      const earnedPoints = results.reduce(
        (sum, result) => sum + result.earnedPoints,
        0,
      );
      const totalPoints = results.reduce(
        (sum, result) => sum + result.possiblePoints,
        0,
      );
      if (totalPoints <= 0)
        throw new QuizServiceError(409, "Quiz has no gradable points");
      const score = Math.round((earnedPoints / totalPoints) * 10_000) / 100;
      const passed = score >= quiz.passingScore;
      const now = new Date();
      const attempt = await repository.createAttempt({
        userId: repository.toObjectId(userId),
        quizId: quiz._id,
        lessonId: lesson._id,
        score,
        earnedPoints,
        totalPoints,
        passed,
        results,
        submittedAt: now,
        createdAt: now,
        updatedAt: now,
      });
      const courseState = passed
        ? (await progressService.completeQuizLesson(user, lesson._id))
            .courseState
        : await progressService.getCourseState(user, course._id);
      return { attempt: serializeAttempt(attempt), courseState };
    },

    async listOwnAttempts(user, quizId) {
      const userId = requireStudent(user);
      requireId(repository, quizId, "quizId");
      const attempts = await repository.listAttempts(userId, quizId);
      return attempts.map(serializeAttempt);
    },
  };
}

export const quizService = createQuizService();
