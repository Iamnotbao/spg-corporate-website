export const CHARACTER_STATUSES = Object.freeze(["draft", "published"]);
export const CHARACTER_HSK_LEVELS = Object.freeze([
  "HSK 1",
  "HSK 2",
  "HSK 3",
  "HSK 4",
  "HSK 5",
  "HSK 6",
  "Ngoài HSK",
]);

export class CharacterValidationError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

function text(value, field, { required = false, max = 500 } = {}) {
  if (value == null) {
    if (required) throw new CharacterValidationError(`${field} is required`);
    return undefined;
  }
  const normalized = String(value).trim();
  if (required && !normalized) {
    throw new CharacterValidationError(`${field} is required`);
  }
  if (normalized.length > max) {
    throw new CharacterValidationError(
      `${field} must be at most ${max} characters`,
    );
  }
  return normalized;
}

function hanCharacter(value, field, { required = false } = {}) {
  const normalized = text(value, field, { required, max: 4 });
  if (
    normalized &&
    (!/^\p{Script=Han}$/u.test(normalized) ||
      Array.from(normalized).length !== 1)
  ) {
    throw new CharacterValidationError(`${field} must be one Han character`);
  }
  return normalized;
}

function examples(value) {
  if (value == null) return undefined;
  if (!Array.isArray(value) || value.length > 8) {
    throw new CharacterValidationError(
      "examples must be an array with at most 8 items",
    );
  }
  return value.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new CharacterValidationError(
        `examples[${index}] must be an object`,
      );
    }
    const allowed = ["chinese", "pinyin", "meaningVietnamese"];
    const unknown = Object.keys(item).filter((key) => !allowed.includes(key));
    if (unknown.length) {
      throw new CharacterValidationError(
        `Unknown examples[${index}] fields: ${unknown.join(", ")}`,
      );
    }
    return {
      chinese: text(item.chinese, `examples[${index}].chinese`, {
        required: true,
        max: 200,
      }),
      pinyin:
        text(item.pinyin, `examples[${index}].pinyin`, { max: 300 }) || "",
      meaningVietnamese:
        text(item.meaningVietnamese, `examples[${index}].meaningVietnamese`, {
          max: 500,
        }) || "",
    };
  });
}

export function validateCharacter(input = {}, { partial = false } = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new CharacterValidationError("Character payload must be an object");
  }
  const fields = [
    "simplified",
    "traditional",
    "pinyin",
    "meaningVietnamese",
    "meaningEnglish",
    "radical",
    "strokeCount",
    "hskLevel",
    "examples",
    "strokeDataKey",
    "lessonId",
    "status",
  ];
  const unknown = Object.keys(input).filter((key) => !fields.includes(key));
  if (unknown.length) {
    throw new CharacterValidationError(`Unknown fields: ${unknown.join(", ")}`);
  }

  const requiredFields = [
    "simplified",
    "pinyin",
    "meaningVietnamese",
    "radical",
    "strokeCount",
    "hskLevel",
    "status",
  ];
  const required = (field) => !partial || input[field] !== undefined;
  const result = {};

  if (input.simplified !== undefined || !partial) {
    result.simplified = hanCharacter(input.simplified, "simplified", {
      required: required("simplified"),
    });
  }
  if (input.traditional !== undefined) {
    result.traditional = hanCharacter(input.traditional, "traditional") || "";
  }
  for (const field of [
    "pinyin",
    "meaningVietnamese",
    "meaningEnglish",
    "radical",
    "hskLevel",
    "lessonId",
    "status",
  ]) {
    if (input[field] === undefined && partial) continue;
    const value = text(input[field], field, {
      required: requiredFields.includes(field) && required(field),
      max:
        field === "meaningEnglish" || field === "meaningVietnamese" ? 500 : 100,
    });
    if (value !== undefined) result[field] = value;
  }
  if (input.strokeDataKey !== undefined) {
    result.strokeDataKey = hanCharacter(input.strokeDataKey, "strokeDataKey", {
      required: true,
    });
  } else if (!partial && result.simplified) {
    result.strokeDataKey = result.simplified;
  }
  if (input.strokeCount !== undefined || !partial) {
    const value = Number(input.strokeCount);
    if (!Number.isInteger(value) || value < 1 || value > 64) {
      throw new CharacterValidationError(
        "strokeCount must be an integer from 1 to 64",
      );
    }
    result.strokeCount = value;
  }
  if (input.examples !== undefined) result.examples = examples(input.examples);
  else if (!partial) result.examples = [];

  if (result.radical && result.radical.length > 4) {
    throw new CharacterValidationError("radical must be at most 4 characters");
  }
  if (result.hskLevel && !CHARACTER_HSK_LEVELS.includes(result.hskLevel)) {
    throw new CharacterValidationError(
      `hskLevel must be one of: ${CHARACTER_HSK_LEVELS.join(", ")}`,
    );
  }
  if (result.status && !CHARACTER_STATUSES.includes(result.status)) {
    throw new CharacterValidationError(
      `status must be one of: ${CHARACTER_STATUSES.join(", ")}`,
    );
  }
  if (result.lessonId && !/^[a-f\d]{24}$/i.test(result.lessonId)) {
    throw new CharacterValidationError("lessonId must be a valid id");
  }
  if (result.lessonId === "") result.lessonId = null;
  if (partial && !Object.keys(result).length) {
    throw new CharacterValidationError(
      "At least one supported field is required",
    );
  }
  return result;
}

function point(value, field) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CharacterValidationError(`${field} must be a point`);
  }
  const unknown = Object.keys(value).filter((key) => !["x", "y"].includes(key));
  if (unknown.length)
    throw new CharacterValidationError(`${field} has unknown fields`);
  const x = Number(value.x);
  const y = Number(value.y);
  if (
    ![x, y].every(
      (number) => Number.isFinite(number) && number >= 0 && number <= 1,
    )
  ) {
    throw new CharacterValidationError(
      `${field} coordinates must be between 0 and 1`,
    );
  }
  return { x, y };
}

export function validateCharacterAttempt(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new CharacterValidationError("Attempt payload must be an object");
  }
  const unknown = Object.keys(input).filter((key) => key !== "strokes");
  if (unknown.length) {
    throw new CharacterValidationError(`Unknown fields: ${unknown.join(", ")}`);
  }
  if (!Array.isArray(input.strokes) || input.strokes.length > 64) {
    throw new CharacterValidationError(
      "strokes must be an array with at most 64 items",
    );
  }
  return {
    strokes: input.strokes.map((stroke, strokeIndex) => {
      if (!Array.isArray(stroke) || stroke.length > 256) {
        throw new CharacterValidationError(
          `strokes[${strokeIndex}] must contain at most 256 points`,
        );
      }
      return stroke.map((value, pointIndex) =>
        point(value, `strokes[${strokeIndex}][${pointIndex}]`),
      );
    }),
  };
}

export function validateCharacterListQuery(
  input = {},
  { defaultPageSize = 12, allowDates = false } = {},
) {
  const allowed = [
    "page",
    "pageSize",
    "search",
    "hskLevel",
    "status",
    "lessonId",
    ...(allowDates ? ["from", "to"] : []),
  ];
  const unknown = Object.keys(input).filter((key) => !allowed.includes(key));
  if (unknown.length) {
    throw new CharacterValidationError(
      `Unknown query fields: ${unknown.join(", ")}`,
    );
  }
  const page = Number(input.page || 1);
  const pageSize = Number(input.pageSize || defaultPageSize);
  if (!Number.isInteger(page) || page < 1) {
    throw new CharacterValidationError("page must be a positive integer");
  }
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) {
    throw new CharacterValidationError("pageSize must be from 1 to 50");
  }
  const search = text(input.search, "search", { max: 100 }) || "";
  const hskLevel = text(input.hskLevel, "hskLevel", { max: 20 }) || "";
  const status = text(input.status, "status", { max: 20 }) || "";
  const lessonId = text(input.lessonId, "lessonId", { max: 24 }) || "";
  if (hskLevel && !CHARACTER_HSK_LEVELS.includes(hskLevel)) {
    throw new CharacterValidationError("Invalid hskLevel filter");
  }
  if (status && !CHARACTER_STATUSES.includes(status)) {
    throw new CharacterValidationError("Invalid status filter");
  }
  if (lessonId && !/^[a-f\d]{24}$/i.test(lessonId)) {
    throw new CharacterValidationError("lessonId must be a valid id");
  }
  return {
    page,
    pageSize,
    search,
    hskLevel,
    status,
    lessonId,
    ...(allowDates ? { from: input.from, to: input.to } : {}),
  };
}
