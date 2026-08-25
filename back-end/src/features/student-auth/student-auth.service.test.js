import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import { createStudentAuthService } from "./student-auth.service.js";

test("public registration always creates a student and never accepts an admin role", async () => {
  let created;
  const service = createStudentAuthService({
    repository: {
      async create(document) {
        created = document;
        return { ...document, _id: new ObjectId() };
      },
    },
    signToken: () => "token",
    mailer: { async sendEmailVerification() {} },
  });
  await assert.rejects(
    () =>
      service.register({
        username: "learner",
        email: "a@example.com",
        password: "password1",
        role: "admin",
      }),
    { status: 400 },
  );
  const result = await service.register({
    username: "learner",
    email: "a@example.com",
    displayName: "Learner",
    password: "password1",
  });
  assert.equal(created.role, "student");
  assert.deepEqual(created.permissions, []);
  assert.equal(result.user.role, "student");
  assert.equal("passwordHash" in result.user, false);
});

test("registration reports duplicate username and email conflicts", async () => {
  const duplicate = (field) => ({
    async create() {
      const error = new Error("duplicate");
      error.code = 11000;
      error.keyPattern = { [field]: 1 };
      throw error;
    },
  });
  for (const [field, message] of [
    ["email", "Email already exists"],
    ["username", "Username already exists"],
  ]) {
    const service = createStudentAuthService({
      repository: duplicate(field),
      mailer: { async sendEmailVerification() {} },
    });
    await assert.rejects(
      () =>
        service.register({
          username: "learner",
          email: "a@example.com",
          password: "password1",
        }),
      { status: 409, message },
    );
  }
});
