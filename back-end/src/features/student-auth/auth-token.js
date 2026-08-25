import { createHash, randomBytes } from "node:crypto";

export function hashAuthToken(token) {
  return createHash("sha256")
    .update(String(token || ""))
    .digest("hex");
}

export function createAuthToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashAuthToken(token) };
}
