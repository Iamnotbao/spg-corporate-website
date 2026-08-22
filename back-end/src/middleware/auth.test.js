import assert from "node:assert/strict";
import { test } from "node:test";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET ||= "test-only-jwt-secret-not-for-deployment";

const { env } = await import("../config/env.js");
const { createAuthMiddleware, requireAdmin } = await import("./auth.js");
const { createUser } = await import("../controllers/account.controller.js");

function responseRecorder() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

async function authenticateAs(user) {
  const middleware = createAuthMiddleware({ findUserById: async () => user });
  const token = jwt.sign({ sub: "507f1f77bcf86cd799439011" }, env.jwtSecret);
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = responseRecorder();
  let nextCalled = false;
  await middleware(req, res, () => {
    nextCalled = true;
  });
  return { req, res, nextCalled };
}

test("authentication reloads and accepts active admin and student accounts", async () => {
  for (const role of ["admin", "student"]) {
    const result = await authenticateAs({
      _id: "507f1f77bcf86cd799439011",
      role,
      active: true,
      permissions: ["posts.read"],
    });
    assert.equal(result.nextCalled, true);
    assert.equal(result.req.user.role, role);
    assert.deepEqual(
      result.req.user.permissions,
      role === "admin" ? ["*"] : [],
    );
  }
});

test("learning administration rejects authenticated students", async () => {
  const { req } = await authenticateAs({
    _id: "507f1f77bcf86cd799439011",
    role: "student",
    active: true,
  });
  const res = responseRecorder();
  let nextCalled = false;
  requireAdmin(req, res, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
});

test("authentication rejects unsupported roles", async () => {
  const result = await authenticateAs({
    _id: "507f1f77bcf86cd799439011",
    role: "visitor",
    active: true,
  });
  assert.equal(result.nextCalled, false);
  assert.equal(result.res.statusCode, 401);
});

test("new accounts cannot receive a missing or legacy role default", async () => {
  for (const role of [undefined, "employee"]) {
    const req = {
      body: {
        username: "new.student",
        password: "test-password",
        ...(role ? { role } : {}),
      },
    };
    const res = responseRecorder();
    await createUser(req, res);
    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, { error: "Invalid role" });
  }
});
