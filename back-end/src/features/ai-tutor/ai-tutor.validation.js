const CONTEXT_TYPES = new Set([
  "general",
  "lesson",
  "vocabulary",
  "quizAttempt",
]);

export class AiTutorValidationError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
    this.code = "AI_INVALID_REQUEST";
  }
}

function rejectUnknownFields(input, allowed, label) {
  const unknown = Object.keys(input || {}).filter(
    (key) => !allowed.includes(key),
  );
  if (unknown.length) {
    throw new AiTutorValidationError(
      `Unknown ${label} fields: ${unknown.join(", ")}`,
    );
  }
}

function objectId(value, field, { required = false } = {}) {
  const normalized = String(value || "").trim();
  if (!normalized && !required) return "";
  if (!/^[a-f\d]{24}$/i.test(normalized)) {
    throw new AiTutorValidationError(`${field} must be a valid id`);
  }
  return normalized;
}

export function validateAiChatInput(input = {}, maxInputChars = 3000) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new AiTutorValidationError("Request body must be an object");
  }
  rejectUnknownFields(
    input,
    ["message", "context", "conversationId"],
    "request",
  );

  const message = String(input.message || "")
    .replace(/\0/g, "")
    .trim();
  if (!message) throw new AiTutorValidationError("message is required");
  if (message.length > maxInputChars) {
    throw new AiTutorValidationError(
      `message must contain at most ${maxInputChars} characters`,
    );
  }

  const rawContext = input.context ?? { type: "general" };
  if (
    !rawContext ||
    typeof rawContext !== "object" ||
    Array.isArray(rawContext)
  ) {
    throw new AiTutorValidationError("context must be an object");
  }
  rejectUnknownFields(rawContext, ["type", "id"], "context");
  const type = String(rawContext.type || "general").trim();
  if (!CONTEXT_TYPES.has(type)) {
    throw new AiTutorValidationError("Unsupported AI context type");
  }
  const id = objectId(rawContext.id, "context.id", {
    required: type !== "general",
  });
  if (type === "general" && id) {
    throw new AiTutorValidationError("General context must not include an id");
  }

  return {
    message,
    context: id ? { type, id } : { type },
    conversationId: objectId(input.conversationId, "conversationId"),
  };
}

export function validateConversationId(value) {
  return objectId(value, "conversationId", { required: true });
}
