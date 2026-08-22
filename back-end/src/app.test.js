import assert from "node:assert/strict";
import { after, before, test } from "node:test";
process.env.JWT_SECRET ||= "test-only-jwt-secret-not-for-deployment";
process.env.ADMIN_PASSWORD ||= "test-only-admin-password";

const { default: app } = await import("./app.js");
const { env } = await import("./config/env.js");

let baseUrl;
let server;

before(async () => {
  server = app.listen(0, "127.0.0.1");

  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (!server) return;

  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test("GET /health returns the lightweight service status", async () => {
  const response = await fetch(`${baseUrl}/health`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
});

test("CORS exposes the filename header used by authenticated downloads", async () => {
  const allowedOrigin = String(env.frontendUrl)
    .split(",", 1)[0]
    .trim()
    .replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/health`, {
    headers: { Origin: allowedOrigin },
  });

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("access-control-expose-headers") || "",
    /\bContent-Disposition\b/i,
  );
});

test("unknown routes return a JSON 404 response", async () => {
  const response = await fetch(`${baseUrl}/does-not-exist`);

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "Route not found" });
});

test("admin image upload requires authentication", async () => {
  const response = await fetch(`${baseUrl}/api/admin/uploads/images`, {
    method: "POST",
  });

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Missing access token" });
});

test("learning administration routes require authentication", async () => {
  const response = await fetch(`${baseUrl}/api/admin/courses`);

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Missing access token" });
});

test("student enrollment and owned learning routes require authentication", async () => {
  for (const [path, method] of [
    ["/api/student/enrollments", "POST"],
    ["/api/student/courses", "GET"],
    ["/api/student/lessons/lesson-1/complete", "PUT"],
    ["/api/student/vocabulary", "GET"],
    ["/api/student/quizzes/507f1f77bcf86cd799439011/attempts", "POST"],
    ["/api/student/progress", "GET"],
    ["/api/student/enrollments/507f1f77bcf86cd799439011", "DELETE"],
  ]) {
    const response = await fetch(`${baseUrl}${path}`, { method });
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "Missing access token" });
  }
});

test("Quiz administration routes require authentication", async () => {
  const response = await fetch(`${baseUrl}/api/admin/quizzes`);
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Missing access token" });
});

test("learning reporting routes require admin authentication", async () => {
  for (const path of [
    "/api/admin/reports/learning-summary",
    "/api/admin/reports/progress",
  ]) {
    const response = await fetch(`${baseUrl}${path}`);
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "Missing access token" });
  }
});

test("public registration cannot supply an admin role", async () => {
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "learner",
      email: "learner@example.com",
      password: "password1",
      role: "admin",
    }),
  });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Unknown fields: role" });
});

test("admin session rejects an invalid bearer token before database access", async () => {
  const response = await fetch(`${baseUrl}/api/admin/session`, {
    headers: { Authorization: "Bearer invalid-token" },
  });

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    error: "Invalid or expired access token",
  });
});

test("invalid applications are rejected before database access", async () => {
  const form = new FormData();
  form.append("name", "Ứng viên");
  form.append("email", "not-an-email");
  form.append("position", "Nhân viên logistics");

  const response = await fetch(`${baseUrl}/api/applications`, {
    method: "POST",
    body: form,
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Email không hợp lệ." });
});

test("unsupported CV types return a JSON 415 response before database access", async () => {
  const form = new FormData();
  form.append(
    "cv",
    new Blob(["not a CV"], { type: "text/plain" }),
    "resume.txt",
  );

  const response = await fetch(`${baseUrl}/api/applications`, {
    method: "POST",
    body: form,
  });

  assert.equal(response.status, 415);
  assert.deepEqual(await response.json(), {
    error: "Unsupported CV file type",
  });
});

test("spoofed PDF files are rejected before Cloudinary upload", async () => {
  const form = new FormData();
  form.append("name", "Ứng viên");
  form.append("email", "candidate@example.com");
  form.append("position", "Nhân viên logistics");
  form.append(
    "cv",
    new Blob(["not really a PDF"], { type: "application/pdf" }),
    "resume.pdf",
  );

  const response = await fetch(`${baseUrl}/api/applications`, {
    method: "POST",
    body: form,
  });

  assert.equal(response.status, 415);
  assert.deepEqual(await response.json(), {
    error: "CV file content does not match its declared type",
  });
});

test("oversized CVs return a JSON 413 response before database access", async () => {
  const form = new FormData();
  const oversizedPdf = new Uint8Array(5 * 1024 * 1024 + 1);
  form.append(
    "cv",
    new Blob([oversizedPdf], { type: "application/pdf" }),
    "resume.pdf",
  );

  const response = await fetch(`${baseUrl}/api/applications`, {
    method: "POST",
    body: form,
  });

  assert.equal(response.status, 413);
  assert.deepEqual(await response.json(), {
    error: "File must be 5 MB or smaller",
  });
});
