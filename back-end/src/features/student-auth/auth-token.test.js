import assert from "node:assert/strict";
import { test } from "node:test";
import { createAuthToken, hashAuthToken } from "./auth-token.js";

test("auth tokens use independent 256-bit random values and stable hashes", () => {
  const first = createAuthToken();
  const second = createAuthToken();
  assert.match(first.token, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(first.token, second.token);
  assert.equal(first.tokenHash, hashAuthToken(first.token));
  assert.equal(first.tokenHash.length, 64);
  assert.notEqual(first.tokenHash, first.token);
});
