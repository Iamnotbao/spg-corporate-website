export const QUIZ_STATUSES = Object.freeze(["draft", "published"]);
export const QUESTION_TYPES = Object.freeze([
  "multiple_choice",
  "true_false",
  "fill_blank",
  "arrange_sentence",
]);

export class QuizValidationError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

function rejectUnknown(input, allowed) {
  const unknown = Object.keys(input || {}).filter(
    (key) => !allowed.includes(key),
  );
  if (unknown.length)
    throw new QuizValidationError(`Unknown fields: ${unknown.join(", ")}`);
}

function text(value, field, { required = false, max = 5000 } = {}) {
  if (value == null) {
    if (required) throw new QuizValidationError(`${field} is required`);
    return undefined;
  }
  const normalized = String(value).trim();
  if (required && !normalized)
    throw new QuizValidationError(`${field} is required`);
  if (normalized.length > max) {
    throw new QuizValidationError(`${field} must be at most ${max} characters`);
  }
  return normalized;
}

function integer(value, field, { required = false, min = 0, max } = {}) {
  if (value == null || value === "") {
    if (required) throw new QuizValidationError(`${field} is required`);
    return undefined;
  }
  const normalized = Number(value);
  if (
    !Number.isInteger(normalized) ||
    normalized < min ||
    (max != null && normalized > max)
  ) {
    throw new QuizValidationError(
      `${field} must be an integer between ${min} and ${max ?? "the supported maximum"}`,
    );
  }
  return normalized;
}

function objectId(value, field, required) {
  const normalized = text(value, field, { required, max: 50 });
  if (normalized === undefined) return undefined;
  if (!/^[a-f\d]{24}$/i.test(normalized)) {
    throw new QuizValidationError(`${field} must be a valid id`);
  }
  return normalized;
}

function requireUpdate(result) {
  if (!Object.keys(result).length) {
    throw new QuizValidationError("At least one supported field is required");
  }
  return result;
}

export function validateQuiz(input = {}, { partial = false } = {}) {
  rejectUnknown(input, [
    "lessonId",
    "title",
    "description",
    "passingScore",
    "status",
  ]);
  const result = {};
  const lessonId = objectId(input.lessonId, "lessonId", !partial);
  if (lessonId !== undefined) result.lessonId = lessonId;
  const title = text(input.title, "title", {
    required: !partial || input.title !== undefined,
    max: 160,
  });
  if (title !== undefined) result.title = title;
  const description = text(input.description, "description", { max: 5000 });
  if (description !== undefined) result.description = description;
  const passingScore = integer(input.passingScore, "passingScore", {
    required: !partial || input.passingScore !== undefined,
    min: 1,
    max: 100,
  });
  if (passingScore !== undefined) result.passingScore = passingScore;
  if (!partial || input.status !== undefined) {
    const status = text(input.status, "status", { required: true, max: 20 });
    if (!QUIZ_STATUSES.includes(status)) {
      throw new QuizValidationError(
        `status must be one of: ${QUIZ_STATUSES.join(", ")}`,
      );
    }
    result.status = status;
  }
  return partial ? requireUpdate(result) : result;
}

function validateOptions(value, type) {
  if (!Array.isArray(value))
    throw new QuizValidationError("options must be an array");
  const minimum = 2;
  const maximum = type === "true_false" ? 2 : 10;
  if (value.length < minimum || value.length > maximum) {
    throw new QuizValidationError(
      `options must contain ${minimum}-${maximum} items`,
    );
  }
  const options = value.map((option, index) => {
    rejectUnknown(option, ["id", "content", "isCorrect", "order"]);
    if (typeof option.isCorrect !== "boolean") {
      throw new QuizValidationError(
        `options[${index}].isCorrect must be boolean`,
      );
    }
    return {
      ...(option.id
        ? { id: text(option.id, `options[${index}].id`, { max: 80 }) }
        : {}),
      content: text(option.content, `options[${index}].content`, {
        required: true,
        max: 500,
      }),
      isCorrect: option.isCorrect,
      order: integer(option.order ?? index, `options[${index}].order`, {
        min: 0,
      }),
    };
  });
  const optionIds = options
    .filter((option) => option.id)
    .map((option) => option.id);
  if (new Set(optionIds).size !== optionIds.length) {
    throw new QuizValidationError(
      "option ids must be unique within a question",
    );
  }
  if (options.filter((option) => option.isCorrect).length !== 1) {
    throw new QuizValidationError(
      "options must contain exactly one correct answer",
    );
  }
  return options;
}

function validateStringList(value, field, { min = 1, max = 30 } = {}) {
  if (!Array.isArray(value) || value.length < min || value.length > max) {
    throw new QuizValidationError(`${field} must contain ${min}-${max} items`);
  }
  return value.map((item, index) =>
    text(item, `${field}[${index}]`, { required: true, max: 500 }),
  );
}

export function validateQuestion(input = {}, { partial = false } = {}) {
  rejectUnknown(input, [
    "quizId",
    "question",
    "type",
    "explanation",
    "points",
    "order",
    "options",
    "acceptedAnswers",
    "tokens",
  ]);
  const result = {};
  const quizId = objectId(input.quizId, "quizId", !partial);
  if (quizId !== undefined) result.quizId = quizId;
  const question = text(input.question, "question", {
    required: !partial || input.question !== undefined,
    max: 2000,
  });
  if (question !== undefined) result.question = question;
  const type = text(input.type, "type", {
    required: !partial || input.type !== undefined,
    max: 40,
  });
  if (type !== undefined && !QUESTION_TYPES.includes(type)) {
    throw new QuizValidationError(
      `type must be one of: ${QUESTION_TYPES.join(", ")}`,
    );
  }
  if (type !== undefined) result.type = type;
  const explanation = text(input.explanation, "explanation", { max: 5000 });
  if (explanation !== undefined) result.explanation = explanation;
  const points = integer(input.points, "points", {
    required: !partial || input.points !== undefined,
    min: 1,
    max: 1000,
  });
  if (points !== undefined) result.points = points;
  const order = integer(input.order, "order", {
    required: !partial || input.order !== undefined,
    min: 0,
  });
  if (order !== undefined) result.order = order;

  const effectiveType = type;
  if (!partial || effectiveType) {
    if (["multiple_choice", "true_false"].includes(effectiveType)) {
      result.options = validateOptions(input.options, effectiveType);
      if (input.acceptedAnswers !== undefined || input.tokens !== undefined) {
        throw new QuizValidationError(
          `${effectiveType} does not accept text answers or tokens`,
        );
      }
    } else if (effectiveType === "fill_blank") {
      result.acceptedAnswers = validateStringList(
        input.acceptedAnswers,
        "acceptedAnswers",
        {
          min: 1,
          max: 10,
        },
      );
      if (input.options !== undefined || input.tokens !== undefined) {
        throw new QuizValidationError(
          "fill_blank does not accept options or tokens",
        );
      }
    } else if (effectiveType === "arrange_sentence") {
      result.tokens = validateStringList(input.tokens, "tokens", {
        min: 2,
        max: 30,
      });
      if (input.options !== undefined || input.acceptedAnswers !== undefined) {
        throw new QuizValidationError(
          "arrange_sentence does not accept options or text answers",
        );
      }
    }
  } else if (
    input.options !== undefined ||
    input.acceptedAnswers !== undefined ||
    input.tokens !== undefined
  ) {
    throw new QuizValidationError(
      "type is required when changing answer configuration",
    );
  }

  return partial ? requireUpdate(result) : result;
}

export function validateSubmission(input = {}) {
  rejectUnknown(input, ["answers"]);
  if (!Array.isArray(input.answers))
    throw new QuizValidationError("answers must be an array");
  return input.answers.map((item, index) => {
    rejectUnknown(item, ["questionId", "answer"]);
    const questionId = objectId(
      item.questionId,
      `answers[${index}].questionId`,
      true,
    );
    const answer = item.answer;
    if (typeof answer !== "string" && !Array.isArray(answer)) {
      throw new QuizValidationError(
        `answers[${index}].answer must be text or an array`,
      );
    }
    return { questionId, answer };
  });
}
