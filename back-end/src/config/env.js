import "dotenv/config";

export const env = {
  port: Number(process.env.PORT || 10000),
  mongoUri: process.env.MONGODB_URI,
  mongoDb: process.env.MONGODB_DB || "spg",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  adminUsername: String(process.env.ADMIN_USERNAME || "admin").trim().toLowerCase(),
  adminPassword: String(process.env.ADMIN_PASSWORD || "").trim(),
  // ADMIN_TOKEN is a backwards-compatible migration path only. New
  // environments should always configure JWT_SECRET.
  jwtSecret: process.env.JWT_SECRET || process.env.ADMIN_TOKEN || "",
  logoUrl: process.env.LOGO_URL || "",
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET,
  },
};

export function validateEnv() {
  const isProduction = process.env.NODE_ENV === "production";

  if (!env.mongoUri) {
    throw new Error("MONGODB_URI is not configured");
  }

  if (!env.adminPassword) {
    throw new Error("ADMIN_PASSWORD is not configured");
  }

  if (["admin123", "admin000"].includes(env.adminPassword.toLowerCase())) {
    if (isProduction) {
      throw new Error("ADMIN_PASSWORD must be changed before production");
    }
    console.warn("ADMIN_PASSWORD is using an insecure local-only value.");
  }

  if (!env.jwtSecret) {
    throw new Error("JWT_SECRET is not configured");
  }

  if (isProduction && env.jwtSecret.length < 32) {
    throw new Error(
      "JWT_SECRET must contain at least 32 characters in production",
    );
  }

  if (!process.env.JWT_SECRET && process.env.ADMIN_TOKEN) {
    console.warn(
      "JWT_SECRET is not configured; using legacy ADMIN_TOKEN. Migrate before deployment.",
    );
  }
}
