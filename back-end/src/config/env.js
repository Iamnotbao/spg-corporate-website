import "dotenv/config";

function positiveInteger(value, fallback, { min = 1, max = 100000 } = {}) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

const openAiApiKey = String(process.env.OPENAI_API_KEY || "").trim();
const openAiModel = String(process.env.OPENAI_MODEL || "gpt-5-mini").trim();
const groqApiKey = String(process.env.GROQ_API_KEY || "").trim();
const groqModel = String(
  process.env.GROQ_MODEL || "openai/gpt-oss-120b",
).trim();
const aiProvider = String(process.env.AI_PROVIDER || "")
  .trim()
  .toLowerCase();
const legacyChatApiKey = aiProvider === "groq" ? groqApiKey : openAiApiKey;
const legacyChatModel = aiProvider === "groq" ? groqModel : openAiModel;

export const env = {
  port: Number(process.env.PORT || 10000),
  mongoUri: process.env.MONGODB_URI,
  mongoDb: process.env.MONGODB_DB || "spg",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  appPublicUrl: String(
    process.env.APP_PUBLIC_URL ||
      String(process.env.FRONTEND_URL || "http://localhost:5173").split(",")[0],
  )
    .trim()
    .replace(/\/$/, ""),
  apiPublicUrl: String(process.env.API_PUBLIC_URL || "").trim().replace(/\/$/, ""),
  adminUsername: String(process.env.ADMIN_USERNAME || "admin")
    .trim()
    .toLowerCase(),
  adminPassword: String(process.env.ADMIN_PASSWORD || "").trim(),
  jwtSecret: process.env.JWT_SECRET || process.env.ADMIN_TOKEN || "",
  logoUrl: process.env.LOGO_URL || "",
  socialAuth: {
    google: {
      clientId: String(process.env.GOOGLE_CLIENT_ID || "").trim(),
      clientSecret: String(process.env.GOOGLE_CLIENT_SECRET || "").trim(),
    },
    facebook: {
      clientId: String(process.env.FACEBOOK_APP_ID || "").trim(),
      clientSecret: String(process.env.FACEBOOK_APP_SECRET || "").trim(),
    },
  },
  openai: {
    apiKey: legacyChatApiKey,
    model: legacyChatModel,
  },
  ai: {
    provider: aiProvider,
    openAiApiKey,
    openAiModel,
    groqApiKey,
    groqModel,
    maxInputChars: positiveInteger(process.env.AI_MAX_INPUT_CHARS, 3000, {
      min: 200,
      max: 12000,
    }),
    maxOutputTokens: positiveInteger(process.env.AI_MAX_OUTPUT_TOKENS, 700, {
      min: 100,
      max: 4000,
    }),
    dailyMessageLimit: positiveInteger(process.env.AI_DAILY_MESSAGE_LIMIT, 30, {
      min: 1,
      max: 500,
    }),
    requestTimeoutMs: positiveInteger(
      process.env.AI_REQUEST_TIMEOUT_MS,
      20000,
      { min: 1000, max: 120000 },
    ),
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET,
  },
  mail: {
    provider: String(process.env.MAIL_PROVIDER || "")
      .trim()
      .toLowerCase(),
    from: String(process.env.MAIL_FROM || "").trim(),
    resendApiKey: String(process.env.RESEND_API_KEY || "").trim(),
  },
};

export function validateEnv() {
  const isProduction = process.env.NODE_ENV === "production";

  if (!env.mongoUri) throw new Error("MONGODB_URI is not configured");
  if (!env.adminPassword) throw new Error("ADMIN_PASSWORD is not configured");

  if (["admin123", "admin000"].includes(env.adminPassword.toLowerCase())) {
    if (isProduction) throw new Error("ADMIN_PASSWORD must be changed before production");
    console.warn("ADMIN_PASSWORD is using an insecure local-only value.");
  }

  if (!env.jwtSecret) throw new Error("JWT_SECRET is not configured");
  if (isProduction && env.jwtSecret.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters in production");
  }
  if (!process.env.JWT_SECRET && process.env.ADMIN_TOKEN) {
    console.warn("JWT_SECRET is not configured; using legacy ADMIN_TOKEN. Migrate before deployment.");
  }

  let publicUrl;
  try {
    publicUrl = new URL(env.appPublicUrl);
  } catch {
    throw new Error("APP_PUBLIC_URL must be a valid absolute URL");
  }
  if (isProduction && publicUrl.protocol !== "https:") {
    throw new Error("APP_PUBLIC_URL must use HTTPS in production");
  }

  if (isProduction && env.apiPublicUrl) {
    const apiUrl = new URL(env.apiPublicUrl);
    if (apiUrl.protocol !== "https:") throw new Error("API_PUBLIC_URL must use HTTPS in production");
  }

  if (isProduction && !env.mail.provider) throw new Error("MAIL_PROVIDER is not configured");
  if (env.mail.provider && env.mail.provider !== "resend") {
    throw new Error("MAIL_PROVIDER must be resend");
  }
  if (env.mail.provider === "resend" && (!env.mail.from || !env.mail.resendApiKey)) {
    throw new Error("MAIL_FROM and RESEND_API_KEY are required for Resend");
  }
}
