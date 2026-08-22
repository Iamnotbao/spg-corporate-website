import {
  COURSE_STATUSES,
  LESSON_STATUSES,
  LESSON_TYPES,
} from "./learning.constants.js";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class LearningValidationError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

function text(value, field, { required = false, max = 5000 } = {}) {
  if (value == null) {
    if (required) throw new LearningValidationError(`${field} is required`);
    return undefined;
  }

  const normalized = String(value).trim();
  if (required && !normalized) {
    throw new LearningValidationError(`${field} is required`);
  }
  if (normalized.length > max) {
    throw new LearningValidationError(
      `${field} must be at most ${max} characters`,
    );
  }
  return normalized;
}

function integer(value, field, { required = false, min = 0 } = {}) {
  if (value == null || value === "") {
    if (required) throw new LearningValidationError(`${field} is required`);
    return undefined;
  }
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized < min) {
    throw new LearningValidationError(
      `${field} must be an integer of at least ${min}`,
    );
  }
  return normalized;
}

function enumValue(value, field, allowed, { required = false } = {}) {
  const normalized = text(value, field, { required, max: 50 });
  if (normalized == null) return undefined;
  if (!allowed.includes(normalized)) {
    throw new LearningValidationError(
      `${field} must be one of: ${allowed.join(", ")}`,
    );
  }
  return normalized;
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function slug(value, title, required) {
  const normalized = slugify(value || title);
  if (!normalized && required) {
    throw new LearningValidationError(
      "slug is required when the title cannot form a URL slug",
    );
  }
  if (
    normalized &&
    (!SLUG_PATTERN.test(normalized) || normalized.length > 120)
  ) {
    throw new LearningValidationError(
      "slug must use lowercase letters, numbers, and hyphens",
    );
  }
  return normalized || undefined;
}

function objectIdText(value, field, required) {
  const normalized = text(value, field, { required, max: 50 });
  if (normalized === undefined) return undefined;
  if (!/^[a-f\d]{24}$/i.test(normalized)) {
    throw new LearningValidationError(`${field} must be a valid id`);
  }
  return normalized;
}

function rejectUnknownFields(input, allowed) {
  const unknown = Object.keys(input || {}).filter(
    (key) => !allowed.includes(key),
  );
  if (unknown.length) {
    throw new LearningValidationError(`Unknown fields: ${unknown.join(", ")}`);
  }
}

function requireUpdateFields(result) {
  if (!Object.keys(result).length) {
    throw new LearningValidationError(
      "At least one supported field is required",
    );
  }
  return result;
}

export function validateCourse(input = {}, { partial = false } = {}) {
  const allowed = [
    "title",
    "slug",
    "description",
    "thumbnail",
    "level",
    "estimatedDuration",
    "status",
    "order",
  ];
  rejectUnknownFields(input, allowed);
  const result = {};
  const title = text(input.title, "title", {
    required: !partial || input.title !== undefined,
    max: 160,
  });
  if (title !== undefined) result.title = title;
  if (!partial || input.slug !== undefined) {
    const nextSlug = slug(input.slug, title, !partial);
    if (nextSlug !== undefined) result.slug = nextSlug;
  }
  const description = text(input.description, "description", {
    required: !partial,
    max: 5000,
  });
  if (description !== undefined) result.description = description;
  const thumbnail = text(input.thumbnail, "thumbnail", { max: 2000 });
  if (thumbnail !== undefined) result.thumbnail = thumbnail;
  const level = text(input.level, "level", {
    required: !partial || input.level !== undefined,
    max: 50,
  });
  if (level !== undefined) result.level = level;
  const estimatedDuration = integer(
    input.estimatedDuration,
    "estimatedDuration",
    { min: 0 },
  );
  if (estimatedDuration !== undefined)
    result.estimatedDuration = estimatedDuration;
  const status = enumValue(input.status, "status", COURSE_STATUSES, {
    required: !partial,
  });
  if (status !== undefined) result.status = status;
  const order = integer(input.order, "order", { required: !partial, min: 0 });
  if (order !== undefined) result.order = order;
  return partial ? requireUpdateFields(result) : result;
}

export function validateUnit(input = {}, { partial = false } = {}) {
  const allowed = ["courseId", "title", "description", "order"];
  rejectUnknownFields(input, allowed);
  const result = {};
  const courseId = objectIdText(input.courseId, "courseId", !partial);
  if (courseId !== undefined) result.courseId = courseId;
  const title = text(input.title, "title", {
    required: !partial || input.title !== undefined,
    max: 160,
  });
  if (title !== undefined) result.title = title;
  const description = text(input.description, "description", { max: 5000 });
  if (description !== undefined) result.description = description;
  const order = integer(input.order, "order", { required: !partial, min: 0 });
  if (order !== undefined) result.order = order;
  return partial ? requireUpdateFields(result) : result;
}

export function validateLesson(input = {}, { partial = false } = {}) {
  const allowed = [
    "unitId",
    "title",
    "slug",
    "description",
    "content",
    "type",
    "duration",
    "order",
    "status",
  ];
  rejectUnknownFields(input, allowed);
  const result = {};
  const unitId = objectIdText(input.unitId, "unitId", !partial);
  if (unitId !== undefined) result.unitId = unitId;
  const title = text(input.title, "title", {
    required: !partial || input.title !== undefined,
    max: 160,
  });
  if (title !== undefined) result.title = title;
  if (!partial || input.slug !== undefined) {
    const nextSlug = slug(input.slug, title, !partial);
    if (nextSlug !== undefined) result.slug = nextSlug;
  }
  const description = text(input.description, "description", { max: 5000 });
  if (description !== undefined) result.description = description;
  const content = text(input.content, "content", {
    required: !partial || input.content !== undefined,
    max: 100000,
  });
  if (content !== undefined) result.content = content;
  const type = enumValue(input.type, "type", LESSON_TYPES, {
    required: !partial,
  });
  if (type !== undefined) result.type = type;
  const duration = integer(input.duration, "duration", { min: 0 });
  if (duration !== undefined) result.duration = duration;
  const order = integer(input.order, "order", { required: !partial, min: 0 });
  if (order !== undefined) result.order = order;
  const status = enumValue(input.status, "status", LESSON_STATUSES, {
    required: !partial,
  });
  if (status !== undefined) result.status = status;
  return partial ? requireUpdateFields(result) : result;
}
