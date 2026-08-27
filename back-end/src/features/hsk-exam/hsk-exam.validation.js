import { QUESTION_TYPES } from "../quiz/quiz.validation.js";

export const HSK_LEVELS = Object.freeze([1, 2, 3, 4, 5, 6]);
export const EXAM_STATUSES = Object.freeze(["draft", "published", "archived"]);
export const SECTION_TYPES = Object.freeze(["listening", "reading", "writing"]);

export class HskExamValidationError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

function rejectUnknown(input, allowed) {
  const unknown = Object.keys(input || {}).filter((key) => !allowed.includes(key));
  if (unknown.length) throw new HskExamValidationError(`Unknown fields: ${unknown.join(", ")}`);
}

function text(value, field, { required = false, max = 5000 } = {}) {
  if (value == null) {
    if (required) throw new HskExamValidationError(`${field} is required`);
    return undefined;
  }
  const normalized = String(value).trim();
  if (required && !normalized) throw new HskExamValidationError(`${field} is required`);
  if (normalized.length > max) throw new HskExamValidationError(`${field} is too long`);
  return normalized;
}

function integer(value, field, { required = false, min = 0, max = 10000 } = {}) {
  if (value == null || value === "") {
    if (required) throw new HskExamValidationError(`${field} is required`);
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new HskExamValidationError(`${field} must be an integer from ${min} to ${max}`);
  }
  return parsed;
}

function enumValue(value, field, allowed, required) {
  const normalized = text(value, field, { required, max: 40 });
  if (normalized == null) return undefined;
  if (!allowed.includes(normalized)) {
    throw new HskExamValidationError(`${field} must be one of: ${allowed.join(", ")}`);
  }
  return normalized;
}

function requireUpdate(result) {
  if (!Object.keys(result).length) throw new HskExamValidationError("At least one supported field is required");
  return result;
}

export function validateExam(input = {}, { partial = false } = {}) {
  rejectUnknown(input, ["level", "title", "description", "durationMinutes", "passingScore", "status", "featured"]);
  const result = {};
  const level = integer(input.level, "level", { required: !partial, min: 1, max: 6 });
  if (level !== undefined) result.level = level;
  const title = text(input.title, "title", { required: !partial, max: 160 });
  if (title !== undefined) result.title = title;
  const description = text(input.description, "description", { required: !partial, max: 5000 });
  if (description !== undefined) result.description = description;
  const durationMinutes = integer(input.durationMinutes, "durationMinutes", { required: !partial, min: 1, max: 300 });
  if (durationMinutes !== undefined) result.durationMinutes = durationMinutes;
  const passingScore = integer(input.passingScore, "passingScore", { required: !partial, min: 1, max: 100 });
  if (passingScore !== undefined) result.passingScore = passingScore;
  const status = enumValue(input.status, "status", EXAM_STATUSES, !partial);
  if (status !== undefined) result.status = status;
  if (input.featured !== undefined) {
    if (typeof input.featured !== "boolean") throw new HskExamValidationError("featured must be boolean");
    result.featured = input.featured;
  }
  return partial ? requireUpdate(result) : result;
}

export function validateSection(input = {}, { partial = false } = {}) {
  rejectUnknown(input, ["title", "type", "description", "order"]);
  const result = {};
  const title = text(input.title, "title", { required: !partial, max: 160 });
  if (title !== undefined) result.title = title;
  const type = enumValue(input.type, "type", SECTION_TYPES, !partial);
  if (type !== undefined) result.type = type;
  const description = text(input.description, "description", { max: 2000 });
  if (description !== undefined) result.description = description;
  const order = integer(input.order, "order", { required: !partial, min: 0, max: 1000 });
  if (order !== undefined) result.order = order;
  return partial ? requireUpdate(result) : result;
}

function stringList(value, field, { min = 1, max = 30 } = {}) {
  if (!Array.isArray(value) || value.length < min || value.length > max) {
    throw new HskExamValidationError(`${field} must contain ${min}-${max} items`);
  }
  return value.map((item, index) => text(item, `${field}[${index}]`, { required: true, max: 500 }));
}

export function validateQuestion(input = {}, { partial = false } = {}) {
  rejectUnknown(input, ["question", "type", "explanation", "points", "order", "audioUrl", "imageUrl", "options", "acceptedAnswers", "tokens"]);
  const result = {};
  const question = text(input.question, "question", { required: !partial, max: 2000 });
  if (question !== undefined) result.question = question;
  const type = enumValue(input.type, "type", QUESTION_TYPES, !partial);
  if (type !== undefined) result.type = type;
  for (const field of ["explanation", "audioUrl", "imageUrl"]) {
    const value = text(input[field], field, { max: field === "explanation" ? 5000 : 2000 });
    if (value !== undefined) result[field] = value;
  }
  const points = integer(input.points, "points", { required: !partial, min: 1, max: 1000 });
  if (points !== undefined) result.points = points;
  const order = integer(input.order, "order", { required: !partial, min: 0, max: 10000 });
  if (order !== undefined) result.order = order;
  if (!partial) {
    if (["multiple_choice", "true_false"].includes(type)) {
      const options = input.options;
      if (!Array.isArray(options) || options.length < 2 || options.length > 10) throw new HskExamValidationError("options must contain 2-10 items");
      result.options = options.map((option, index) => ({
        id: text(option.id || `option-${index + 1}`, `options[${index}].id`, { required: true, max: 80 }),
        content: text(option.content, `options[${index}].content`, { required: true, max: 500 }),
        isCorrect: Boolean(option.isCorrect),
        order: integer(option.order ?? index, `options[${index}].order`, { min: 0, max: 100 }),
      }));
      if (result.options.filter((option) => option.isCorrect).length !== 1) throw new HskExamValidationError("options must contain exactly one correct answer");
    } else if (type === "fill_blank") {
      result.acceptedAnswers = stringList(input.acceptedAnswers, "acceptedAnswers", { max: 10 });
    } else if (type === "arrange_sentence") {
      result.tokens = stringList(input.tokens, "tokens", { min: 2, max: 30 });
    }
  }
  return partial ? requireUpdate(result) : result;
}

export function validateSubmission(input = {}) {
  rejectUnknown(input, ["answers"]);
  if (!Array.isArray(input.answers)) throw new HskExamValidationError("answers must be an array");
  return input.answers.map((item, index) => {
    rejectUnknown(item, ["questionId", "answer"]);
    const questionId = text(item.questionId, `answers[${index}].questionId`, { required: true, max: 24 });
    if (!/^[a-f\d]{24}$/i.test(questionId)) throw new HskExamValidationError(`answers[${index}].questionId must be a valid id`);
    if (typeof item.answer !== "string" && !Array.isArray(item.answer)) throw new HskExamValidationError(`answers[${index}].answer must be text or an array`);
    return { questionId, answer: item.answer };
  });
}
