import { getCollection } from "../../config/db.js";
import { toObjectId } from "../../utils/objectId.js";
import { LEARNING_COLLECTIONS } from "../learning/learning.constants.js";
import { ensureLearningIndexes } from "../learning/learning.repository.js";

export const CHARACTER_COLLECTIONS = Object.freeze({
  characters: "characters",
  attempts: "character_practice_attempts",
});

let indexPromise;

export async function ensureCharacterIndexes() {
  if (!indexPromise) {
    indexPromise = Promise.all([
      getCollection(CHARACTER_COLLECTIONS.characters).then((collection) =>
        Promise.all([
          collection.createIndex({ simplified: 1 }, { unique: true }),
          collection.createIndex({ status: 1, hskLevel: 1, simplified: 1 }),
          collection.createIndex({ lessonId: 1, status: 1 }),
        ]),
      ),
      getCollection(CHARACTER_COLLECTIONS.attempts).then((collection) =>
        Promise.all([
          collection.createIndex({ userId: 1, characterId: 1, createdAt: -1 }),
          collection.createIndex({ characterId: 1 }),
        ]),
      ),
      ensureLearningIndexes(),
    ]).catch((error) => {
      indexPromise = undefined;
      throw error;
    });
  }
  return indexPromise;
}

async function collection(name) {
  await ensureCharacterIndexes();
  return getCollection(name);
}

function idFilter(id) {
  const value = toObjectId(id);
  return value ? { _id: value } : { _id: null };
}

function identifierFilter(identifier) {
  const value = String(identifier || "").trim();
  const id = toObjectId(value);
  return id
    ? { $or: [{ _id: id }, { simplified: value }, { traditional: value }] }
    : { $or: [{ simplified: value }, { traditional: value }] };
}

export const characterRepository = {
  async listPage(filter, { skip, limit }) {
    return (await collection(CHARACTER_COLLECTIONS.characters))
      .find(filter)
      .sort({ hskLevel: 1, simplified: 1 })
      .skip(skip)
      .limit(limit)
      .toArray();
  },
  async count(filter) {
    return (await collection(CHARACTER_COLLECTIONS.characters)).countDocuments(
      filter,
    );
  },
  async find(id, filter = {}) {
    return (await collection(CHARACTER_COLLECTIONS.characters)).findOne({
      ...idFilter(id),
      ...filter,
    });
  },
  async findByIdentifier(identifier, filter = {}) {
    return (await collection(CHARACTER_COLLECTIONS.characters)).findOne({
      ...identifierFilter(identifier),
      ...filter,
    });
  },
  async create(document) {
    const result = await (
      await collection(CHARACTER_COLLECTIONS.characters)
    ).insertOne(document);
    return { ...document, _id: result.insertedId };
  },
  async update(id, update) {
    return (
      await collection(CHARACTER_COLLECTIONS.characters)
    ).findOneAndUpdate(
      idFilter(id),
      { $set: update },
      { returnDocument: "after" },
    );
  },
  async delete(id) {
    return (await collection(CHARACTER_COLLECTIONS.characters)).deleteOne(
      idFilter(id),
    );
  },
  async findLesson(id) {
    return (await collection(LEARNING_COLLECTIONS.lessons)).findOne(
      idFilter(id),
    );
  },
  async countAttempts(characterId) {
    return (await collection(CHARACTER_COLLECTIONS.attempts)).countDocuments({
      characterId: toObjectId(characterId),
    });
  },
  async createAttempt(document) {
    const result = await (
      await collection(CHARACTER_COLLECTIONS.attempts)
    ).insertOne(document);
    return { ...document, _id: result.insertedId };
  },
  async findOwnAttempt(userId, attemptId) {
    return (await collection(CHARACTER_COLLECTIONS.attempts)).findOne({
      ...idFilter(attemptId),
      userId: toObjectId(userId),
    });
  },
  async listOwnAttempts(userId, characterId) {
    return (await collection(CHARACTER_COLLECTIONS.attempts))
      .find({
        userId: toObjectId(userId),
        characterId: toObjectId(characterId),
      })
      .sort({ createdAt: -1 })
      .toArray();
  },
  toObjectId,
};
