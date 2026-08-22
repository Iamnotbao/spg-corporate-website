const STATUSES = ["draft", "published"];

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
      "lessonId",
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
