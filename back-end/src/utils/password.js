import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

export function hashPassword(password) {
  const value = String(password || "");
  if (value.length < 8) {
    throw new Error("Mật khẩu phải có ít nhất 8 ký tự.");
  }

  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(value, salt, KEY_LENGTH).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password, encoded) {
  const [algorithm, salt, expectedHex] = String(encoded || "").split("$");
  if (algorithm !== "scrypt" || !salt || !expectedHex) return false;

  try {
    const actual = scryptSync(String(password || ""), salt, KEY_LENGTH);
    const expected = Buffer.from(expectedHex, "hex");
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}
