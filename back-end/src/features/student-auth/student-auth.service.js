import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { hashPassword, verifyPassword } from "../../utils/password.js";
import { studentAuthRepository } from "./student-auth.repository.js";

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

function validateRegistration(input = {}) {
  const allowed = new Set(["username", "email", "displayName", "password"]);
  const unknown = Object.keys(input).filter((key) => !allowed.has(key));
  if (unknown.length) {
    throw new StudentAuthError(400, `Unknown fields: ${unknown.join(", ")}`);
  }

  const username = normalizeUsername(input.username);
  const email = normalizeEmail(input.email);
  const displayName = String(input.displayName || username).trim();
  const password = String(input.password || "");

  if (!/^[a-z0-9._-]{3,40}$/.test(username)) {
    throw new StudentAuthError(
      400,
      "Username must contain 3-40 lowercase letters, numbers, dots, underscores, or hyphens",
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new StudentAuthError(400, "A valid email is required");
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
    displayName: user.displayName || user.username,
    role: "student",
    active: user.active !== false,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function defaultSignToken(user) {
  return jwt.sign(
    { sub: String(user._id), username: user.username },
    env.jwtSecret,
    { expiresIn: "8h" },
  );
}

export function createStudentAuthService(
  repository = studentAuthRepository,
  signToken = defaultSignToken,
) {
  return {
    async register(input) {
      const validated = validateRegistration(input);
      const now = new Date();
      const document = {
        ...validated,
        role: "student",
        permissions: [],
        active: true,
        createdAt: now,
        updatedAt: now,
      };
      try {
        const user = await repository.create(document);
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
  };
}

export const studentAuthService = createStudentAuthService();
