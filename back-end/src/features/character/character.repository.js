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
          collection.createIndex({ deletedAt: 1, trashRoot: 1 }),
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

function active(filter = {}) {
  return { ...filter, deletedAt: { $exists: false } };
}

export const characterRepository = {
  async listPage(filter = {}, { skip, limit }) {
    return (await collection(CHARACTER_COLLECTIONS.characters))
      .find(active(filter))
      .sort({ hskLevel: 1, simplified: 1 })
      .skip(skip)
      .limit(limit)
      .toArray();
  },
  async count(filter = {}) {
    return (await collection(CHARACTER_COLLECTIONS.characters)).countDocuments(
      active(filter),
    );
  },
  async find(id, filter = {}) {
    return (await collection(CHARACTER_COLLECTIONS.characters)).findOne(
      active({ ...idFilter(id), ...filter }),
    );
  },
  async findByIdentifier(identifier, filter = {}) {
    return (await collection(CHARACTER_COLLECTIONS.characters)).findOne(
      active({ ...identifierFilter(identifier), ...filter }),
    );
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
      active(idFilter(id)),
      { $set: update },
      { returnDocument: "after" },
    );
  },
  async delete(id) {
    return (await collection(CHARACTER_COLLECTIONS.characters)).deleteOne(
      active(idFilter(id)),
    );
  },
  async findLesson(id) {
    return (await collection(LEARNING_COLLECTIONS.lessons)).findOne(
      active(idFilter(id)),
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
  async getOwnAttemptSummary(userId, characterId) {
    const [result = { count: [], latest: [], best: [] }] = await (
      await collection(CHARACTER_COLLECTIONS.attempts)
    )
      .aggregate([
        {
          $match: {
            userId: toObjectId(userId),
            characterId: toObjectId(characterId),
          },
        },
        {
          $facet: {
            count: [{ $count: "total" }],
            latest: [{ $sort: { createdAt: -1, _id: -1 } }, { $limit: 1 }],
            best: [{ $sort: { score: -1, createdAt: -1, _id: -1 } }, { $limit: 1 }],
          },
        },
      ])
      .toArray();
    return {
      count: result.count[0]?.total || 0,
      latest: result.latest[0] || null,
      best: result.best[0] || null,
    };
  },
  toObjectId,
};
