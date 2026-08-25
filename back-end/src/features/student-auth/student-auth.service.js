import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { mailService } from "../../services/mail.service.js";
import { hashPassword, verifyPassword } from "../../utils/password.js";
import { createAuthToken, hashAuthToken } from "./auth-token.js";
import { studentAuthRepository } from "./student-auth.repository.js";

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export const PASSWORD_RESET_RESPONSE =
  "If an account exists for this email, reset instructions have been sent.";
export const VERIFICATION_SEND_RESPONSE =
  "If email verification is needed, verification instructions have been sent.";

export class StudentAuthError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function normalizeUsername(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizeEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function validateEmail(value) {
  const email = normalizeEmail(value);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new StudentAuthError(400, "A valid email is required");
  }
  return email;
}

function passwordHashFor(password, confirmPassword) {
  if (String(password || "") !== String(confirmPassword || "")) {
    throw new StudentAuthError(400, "Passwords do not match");
  }
  try {
    return hashPassword(password);
  } catch (error) {
    throw new StudentAuthError(400, error.message);
  }
}

function validateRegistration(input = {}) {
  const allowed = new Set(["username", "email", "displayName", "password"]);
  const unknown = Object.keys(input).filter((key) => !allowed.has(key));
  if (unknown.length) {
    throw new StudentAuthError(400, `Unknown fields: ${unknown.join(", ")}`);
  }

  const username = normalizeUsername(input.username);
  const email = validateEmail(input.email);
  const displayName = String(input.displayName || username).trim();
  const password = String(input.password || "");

  if (!/^[a-z0-9._-]{3,40}$/.test(username)) {
    throw new StudentAuthError(
      400,
      "Username must contain 3-40 lowercase letters, numbers, dots, underscores, or hyphens",
    );
  }
  if (!displayName || displayName.length > 100) {
    throw new StudentAuthError(400, "Display name must be 1-100 characters");
  }

  let passwordHash;
  try {
    passwordHash = hashPassword(password);
  } catch (error) {
    throw new StudentAuthError(400, error.message);
  }

  return { username, email, displayName, passwordHash };
}

export function serializeStudent(user) {
  if (!user) return null;
  return {
    id: String(user._id),
    username: user.username,
    email: user.email,
    emailVerified: Boolean(user.emailVerifiedAt),
    emailVerifiedAt: user.emailVerifiedAt || null,
    displayName: user.displayName || user.username,
    role: "student",
    active: user.active !== false,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function defaultSignToken(user) {
  return jwt.sign(
    {
      sub: String(user._id),
      username: user.username,
      ver: Number(user.authVersion) || 0,
    },
    env.jwtSecret,
    { expiresIn: "8h" },
  );
}

function validOpaqueToken(value) {
  const token = String(value || "").trim();
  if (!/^[A-Za-z0-9_-]{40,200}$/.test(token)) {
    throw new StudentAuthError(400, "Invalid or expired token");
  }
  return token;
}

export function createStudentAuthService({
  repository = studentAuthRepository,
  signToken = defaultSignToken,
  mailer = mailService,
  tokenFactory = createAuthToken,
  clock = () => new Date(),
  logger = console,
} = {}) {
  async function deliverVerification(user, now) {
    const generated = tokenFactory();
    await repository.setEmailVerificationToken(
      user._id,
      generated.tokenHash,
      new Date(now.getTime() + VERIFICATION_TOKEN_TTL_MS),
      now,
    );
    await mailer.sendEmailVerification({
      to: user.email,
      token: generated.token,
    });
  }

  return {
    async register(input) {
      const validated = validateRegistration(input);
      const now = clock();
      const generated = tokenFactory();
      const document = {
        ...validated,
        role: "student",
        permissions: [],
        active: true,
        authVersion: 0,
        emailVerificationTokenHash: generated.tokenHash,
        emailVerificationExpiresAt: new Date(
          now.getTime() + VERIFICATION_TOKEN_TTL_MS,
        ),
        createdAt: now,
        updatedAt: now,
      };
      try {
        const user = await repository.create(document);
        try {
          await mailer.sendEmailVerification({
            to: user.email,
            token: generated.token,
          });
        } catch (error) {
          logger.error("Unable to deliver registration verification email", {
            message: error.message,
          });
        }
        return { token: signToken(user), user: serializeStudent(user) };
      } catch (error) {
        if (error?.code === 11000) {
          const field = error.keyPattern?.email ? "Email" : "Username";
          throw new StudentAuthError(409, `${field} already exists`);
        }
        throw error;
      }
    },

    async login(input = {}) {
      const identifier = normalizeUsername(
        input.identifier || input.username || input.email,
      );
      const password = String(input.password || "");
      if (!identifier || !password) {
        throw new StudentAuthError(400, "Identifier and password are required");
      }
      const user = await repository.findByIdentifier(identifier);
      if (
        !user ||
        user.role !== "student" ||
        user.active === false ||
        !verifyPassword(password, user.passwordHash)
      ) {
        throw new StudentAuthError(401, "Invalid username/email or password");
      }
      return { token: signToken(user), user: serializeStudent(user) };
    },

    async forgotPassword(input = {}) {
      const email = validateEmail(input.email);
      const generated = tokenFactory();
      const user = await repository.findByEmail(email);
      if (user?.role === "student" && user.active !== false) {
        const now = clock();
        await repository.setPasswordResetToken(
          user._id,
          generated.tokenHash,
          new Date(now.getTime() + RESET_TOKEN_TTL_MS),
          now,
        );
        try {
          await mailer.sendPasswordReset({
            to: user.email,
            token: generated.token,
          });
        } catch (error) {
          logger.error("Unable to deliver password reset email", {
            message: error.message,
          });
        }
      }
      return { message: PASSWORD_RESET_RESPONSE };
    },

    async resetPassword(input = {}) {
      const token = validOpaqueToken(input.token);
      const passwordHash = passwordHashFor(
        input.password,
        input.confirmPassword,
      );
      const user = await repository.resetPassword(
        hashAuthToken(token),
        clock(),
        passwordHash,
      );
      if (!user) {
        throw new StudentAuthError(400, "Invalid or expired token");
      }
      return { message: "Password changed successfully." };
    },

    async sendVerification(user) {
      if (!user?._id || user.role !== "student") {
        throw new StudentAuthError(403, "Student access required");
      }
      if (!user.emailVerifiedAt) {
        try {
          await deliverVerification(user, clock());
        } catch (error) {
          logger.error("Unable to deliver email verification", {
            message: error.message,
          });
        }
      }
      return { message: VERIFICATION_SEND_RESPONSE };
    },

    async verifyEmail(input = {}) {
      const token = validOpaqueToken(input.token);
      const user = await repository.verifyEmail(hashAuthToken(token), clock());
      if (!user) {
        throw new StudentAuthError(400, "Invalid or expired token");
      }
      return {
        message: "Email verified successfully.",
        user: serializeStudent(user),
      };
    },
  };
}

export const studentAuthService = createStudentAuthService();
