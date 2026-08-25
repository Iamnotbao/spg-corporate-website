import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import { verifyPassword } from "../../utils/password.js";
import { hashAuthToken } from "./auth-token.js";
import {
  PASSWORD_RESET_RESPONSE,
  createStudentAuthService,
} from "./student-auth.service.js";

const now = new Date("2026-08-25T04:00:00.000Z");
const resetToken = "reset_token_abcdefghijklmnopqrstuvwxyz0123456789ABCDE";
const verificationToken =
  "verify_token_abcdefghijklmnopqrstuvwxyz0123456789ABC";

function tokenFactory(token) {
  return () => ({ token, tokenHash: hashAuthToken(token) });
}

function accountRepository(account) {
  return {
    account,
    async findByEmail(email) {
      return account?.email === email ? account : null;
    },
    async findByIdentifier(identifier) {
      return [account?.email, account?.username].includes(identifier)
        ? account
        : null;
    },
    async setPasswordResetToken(_id, tokenHash, expiresAt) {
      account.passwordResetTokenHash = tokenHash;
      account.passwordResetExpiresAt = expiresAt;
    },
    async resetPassword(tokenHash, at, passwordHash) {
      if (
        account.passwordResetTokenHash !== tokenHash ||
        account.passwordResetExpiresAt <= at
      ) {
        return null;
      }
      account.passwordHash = passwordHash;
      account.authVersion += 1;
      delete account.passwordResetTokenHash;
      delete account.passwordResetExpiresAt;
      return account;
    },
    async setEmailVerificationToken(_id, tokenHash, expiresAt) {
      account.emailVerificationTokenHash = tokenHash;
      account.emailVerificationExpiresAt = expiresAt;
    },
    async verifyEmail(tokenHash, at) {
      if (
        account.emailVerificationTokenHash !== tokenHash ||
        account.emailVerificationExpiresAt <= at
      ) {
        return null;
      }
      account.emailVerifiedAt = at;
      delete account.emailVerificationTokenHash;
      delete account.emailVerificationExpiresAt;
      return account;
    },
  };
}

function student() {
  return {
    _id: new ObjectId(),
    username: "learner",
    email: "learner@example.com",
    role: "student",
    active: true,
    authVersion: 0,
  };
}

test("forgot password returns the same response and stores only a secure token hash", async () => {
  const account = student();
  const repository = accountRepository(account);
  let deliveredToken;
  const service = createStudentAuthService({
    repository,
    tokenFactory: tokenFactory(resetToken),
    clock: () => now,
    mailer: {
      async sendPasswordReset(message) {
        deliveredToken = message.token;
      },
    },
  });
  const existing = await service.forgotPassword({ email: account.email });
  assert.equal(existing.message, PASSWORD_RESET_RESPONSE);
  assert.equal(deliveredToken, resetToken);
  assert.equal(account.passwordResetTokenHash, hashAuthToken(resetToken));
  assert.notEqual(account.passwordResetTokenHash, resetToken);
  assert.equal(
    account.passwordResetExpiresAt.toISOString(),
    "2026-08-25T04:30:00.000Z",
  );

  const unknownService = createStudentAuthService({
    repository: accountRepository(null),
    tokenFactory: tokenFactory(resetToken),
    clock: () => now,
  });
  const unknown = await unknownService.forgotPassword({
    email: "missing@example.com",
  });
  assert.equal(unknown.message, existing.message);
});

test("valid reset changes the password, invalidates sessions, and cannot be reused", async () => {
  const account = student();
  const repository = accountRepository(account);
  account.passwordResetTokenHash = hashAuthToken(resetToken);
  account.passwordResetExpiresAt = new Date(now.getTime() + 1000);
  const service = createStudentAuthService({
    repository,
    clock: () => now,
    signToken: () => "token",
  });

  await service.resetPassword({
    token: resetToken,
    password: "new-password-123",
    confirmPassword: "new-password-123",
  });
  assert.equal(account.authVersion, 1);
  assert.equal(verifyPassword("new-password-123", account.passwordHash), true);
  await assert.rejects(
    () =>
      service.resetPassword({
        token: resetToken,
        password: "another-password",
        confirmPassword: "another-password",
      }),
    { status: 400, message: "Invalid or expired token" },
  );
  const login = await service.login({
    identifier: account.email,
    password: "new-password-123",
  });
  assert.equal(login.user.email, account.email);
});

test("reset rejects expired tokens and mismatched passwords", async () => {
  const account = student();
  const repository = accountRepository(account);
  account.passwordResetTokenHash = hashAuthToken(resetToken);
  account.passwordResetExpiresAt = new Date(now.getTime() - 1);
  const service = createStudentAuthService({ repository, clock: () => now });
  await assert.rejects(
    () =>
      service.resetPassword({
        token: resetToken,
        password: "new-password-123",
        confirmPassword: "new-password-123",
      }),
    { status: 400, message: "Invalid or expired token" },
  );
  await assert.rejects(
    () =>
      service.resetPassword({
        token: resetToken,
        password: "new-password-123",
        confirmPassword: "different-password",
      }),
    { status: 400, message: "Passwords do not match" },
  );
});

test("email verification tokens are hashed, expiring, and single-use", async () => {
  const account = student();
  const repository = accountRepository(account);
  let delivered;
  const service = createStudentAuthService({
    repository,
    tokenFactory: tokenFactory(verificationToken),
    clock: () => now,
    mailer: {
      async sendEmailVerification(message) {
        delivered = message.token;
      },
    },
  });
  await service.sendVerification(account);
  assert.equal(delivered, verificationToken);
  assert.equal(
    account.emailVerificationTokenHash,
    hashAuthToken(verificationToken),
  );
  const verified = await service.verifyEmail({ token: verificationToken });
  assert.equal(verified.user.emailVerified, true);
  await assert.rejects(
    () => service.verifyEmail({ token: verificationToken }),
    {
      status: 400,
    },
  );

  account.emailVerifiedAt = undefined;
  account.emailVerificationTokenHash = hashAuthToken(verificationToken);
  account.emailVerificationExpiresAt = new Date(now.getTime() - 1);
  await assert.rejects(
    () => service.verifyEmail({ token: verificationToken }),
    {
      status: 400,
    },
  );
  await assert.rejects(() => service.verifyEmail({ token: "invalid" }), {
    status: 400,
  });
});
