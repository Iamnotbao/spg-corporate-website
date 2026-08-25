import { getCollection } from "../../config/db.js";

let indexPromise;

export async function ensureStudentAuthIndexes() {
  const collection = await getCollection("users");
  if (!indexPromise) {
    indexPromise = Promise.all([
      collection.createIndex({ username: 1 }, { unique: true }),
      collection.createIndex(
        { email: 1 },
        {
          unique: true,
          partialFilterExpression: { email: { $type: "string" } },
        },
      ),
      collection.createIndex(
        { passwordResetTokenHash: 1, passwordResetExpiresAt: 1 },
        {
          partialFilterExpression: {
            passwordResetTokenHash: { $type: "string" },
          },
        },
      ),
      collection.createIndex(
        { emailVerificationTokenHash: 1, emailVerificationExpiresAt: 1 },
        {
          partialFilterExpression: {
            emailVerificationTokenHash: { $type: "string" },
          },
        },
      ),
    ]).catch((error) => {
      indexPromise = undefined;
      throw error;
    });
  }
  await indexPromise;
}

async function users() {
  await ensureStudentAuthIndexes();
  const collection = await getCollection("users");
  return collection;
}

export const studentAuthRepository = {
  async findByIdentifier(identifier) {
    return (await users()).findOne({
      $or: [{ username: identifier }, { email: identifier }],
    });
  },
  async findByEmail(email) {
    return (await users()).findOne({ email });
  },
  async setPasswordResetToken(userId, tokenHash, expiresAt, now) {
    return (await users()).updateOne(
      { _id: userId, role: "student", active: { $ne: false } },
      {
        $set: {
          passwordResetTokenHash: tokenHash,
          passwordResetExpiresAt: expiresAt,
          updatedAt: now,
        },
      },
    );
  },
  async resetPassword(tokenHash, now, passwordHash) {
    return (await users()).findOneAndUpdate(
      {
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: { $gt: now },
        role: "student",
        active: { $ne: false },
      },
      {
        $set: { passwordHash, passwordChangedAt: now, updatedAt: now },
        $inc: { authVersion: 1 },
        $unset: { passwordResetTokenHash: "", passwordResetExpiresAt: "" },
      },
      { returnDocument: "after" },
    );
  },
  async setEmailVerificationToken(userId, tokenHash, expiresAt, now) {
    return (await users()).updateOne(
      {
        _id: userId,
        role: "student",
        active: { $ne: false },
        emailVerifiedAt: { $exists: false },
      },
      {
        $set: {
          emailVerificationTokenHash: tokenHash,
          emailVerificationExpiresAt: expiresAt,
          updatedAt: now,
        },
      },
    );
  },
  async verifyEmail(tokenHash, now) {
    return (await users()).findOneAndUpdate(
      {
        emailVerificationTokenHash: tokenHash,
        emailVerificationExpiresAt: { $gt: now },
        role: "student",
        active: { $ne: false },
      },
      {
        $set: { emailVerifiedAt: now, updatedAt: now },
        $unset: {
          emailVerificationTokenHash: "",
          emailVerificationExpiresAt: "",
        },
      },
      { returnDocument: "after" },
    );
  },
  async create(document) {
    const result = await (await users()).insertOne(document);
    return { ...document, _id: result.insertedId };
  },
};
