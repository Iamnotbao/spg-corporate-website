const STATUSES = ["draft", "published"];
const DUPLICATE_MODES = ["skip", "allow"];

export const MAX_VOCABULARY_IMPORT_ROWS = 500;

export class VocabularyValidationError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

function text(value, field, { required = false, max = 1000 } = {}) {
  if (value == null) {
    if (required) throw new VocabularyValidationError(`${field} is required`);
    return undefined;
  }
  const normalized = String(value).trim();
  if (required && !normalized) {
    throw new VocabularyValidationError(`${field} is required`);
  }
  if (!required && !normalized) return undefined;
  if (normalized.length > max) {
    throw new VocabularyValidationError(
      `${field} must be at most ${max} characters`,
    );
  }
  return normalized;
}

export function validateVocabulary(input = {}, { partial = false } = {}) {
  const fields = [
    "simplified",
    "traditional",
    "pinyin",
    "meaningVietnamese",
    "meaningEnglish",
    "audioUrl",
    "exampleChinese",
    "examplePinyin",
    "exampleVietnamese",
    "hskLevel",
    "lessonId",
    "status",
  ];
  const unknown = Object.keys(input).filter((key) => !fields.includes(key));
  if (unknown.length) {
    throw new VocabularyValidationError(
      `Unknown fields: ${unknown.join(", ")}`,
    );
  }

  const result = {};
  for (const field of fields) {
    const requiredFields = [
      "simplified",
      "pinyin",
      "meaningVietnamese",
      "hskLevel",
      "status",
    ];
    const suppliedRequired =
      requiredFields.includes(field) &&
      (!partial || input[field] !== undefined);
    const value = text(input[field], field, {
      required: suppliedRequired,
      max: ["audioUrl"].includes(field)
        ? 2000
        : ["exampleChinese", "exampleVietnamese"].includes(field)
          ? 2000
          : 500,
    });
    if (value !== undefined) result[field] = value;
  }

  if (result.lessonId && !/^[a-f\d]{24}$/i.test(result.lessonId)) {
    throw new VocabularyValidationError("lessonId must be a valid id");
  }
  if (result.status && !STATUSES.includes(result.status)) {
    throw new VocabularyValidationError(
      `status must be one of: ${STATUSES.join(", ")}`,
    );
  }
  if (partial && !Object.keys(result).length) {
    throw new VocabularyValidationError(
      "At least one supported field is required",
    );
  }
  return result;
}

export function validateVocabularyImport(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new VocabularyValidationError("Import payload must be an object");
  }

  const fields = ["lessonId", "status", "duplicateMode", "rows"];
  const unknown = Object.keys(input).filter((key) => !fields.includes(key));
  if (unknown.length) {
    throw new VocabularyValidationError(
      `Unknown import fields: ${unknown.join(", ")}`,
    );
  }

  const lessonId = text(input.lessonId, "lessonId", { required: false, max: 24 });
  const status = text(input.status, "status", { required: true, max: 20 });
  const duplicateMode = text(input.duplicateMode, "duplicateMode", {
    required: true,
    max: 20,
  });

  if (lessonId && !/^[a-f\d]{24}$/i.test(lessonId)) {
    throw new VocabularyValidationError("lessonId must be a valid id");
  }
  if (!STATUSES.includes(status)) {
    throw new VocabularyValidationError(
      `status must be one of: ${STATUSES.join(", ")}`,
    );
  }
  if (!DUPLICATE_MODES.includes(duplicateMode)) {
    throw new VocabularyValidationError(
      `duplicateMode must be one of: ${DUPLICATE_MODES.join(", ")}`,
    );
  }
  if (!Array.isArray(input.rows) || !input.rows.length) {
    throw new VocabularyValidationError("rows must be a non-empty array");
  }
  if (input.rows.length > MAX_VOCABULARY_IMPORT_ROWS) {
    throw new VocabularyValidationError(
      `rows must contain at most ${MAX_VOCABULARY_IMPORT_ROWS} items`,
    );
  }

  return { lessonId, status, duplicateMode, rows: input.rows };
}
