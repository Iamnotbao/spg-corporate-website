import { getCollection } from "../../config/db.js";
import { toObjectId } from "../../utils/objectId.js";
import { LEARNING_COLLECTIONS } from "../learning/learning.constants.js";
import { ensureLearningIndexes } from "../learning/learning.repository.js";

export const VOCABULARY_COLLECTIONS = Object.freeze({
  vocabulary: "vocabularies",
  progress: "vocabulary_progress",
});

let indexPromise;

export async function ensureVocabularyIndexes() {
  if (!indexPromise) {
    indexPromise = Promise.all([
      getCollection(VOCABULARY_COLLECTIONS.vocabulary).then((collection) =>
        Promise.all([
          collection.createIndex({ lessonId: 1, status: 1 }),
          collection.createIndex({ status: 1, hskLevel: 1 }),
        ]),
      ),
      getCollection(VOCABULARY_COLLECTIONS.progress).then((collection) =>
        Promise.all([
          collection.createIndex(
            { userId: 1, vocabularyId: 1 },
            { unique: true },
          ),
          collection.createIndex({ userId: 1, saved: 1, updatedAt: -1 }),
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
  await ensureVocabularyIndexes();
  return getCollection(name);
}

function idFilter(id) {
  const value = toObjectId(id);
  return value ? { _id: value } : { _id: null };
}

export const vocabularyRepository = {
  async list(filter = {}) {
    return (await collection(VOCABULARY_COLLECTIONS.vocabulary))
      .find(filter)
      .sort({ hskLevel: 1, simplified: 1 })
      .toArray();
  },
  async find(id, filter = {}) {
    return (await collection(VOCABULARY_COLLECTIONS.vocabulary)).findOne({
      ...idFilter(id),
      ...filter,
    });
  },
  async create(document) {
    const result = await (
      await collection(VOCABULARY_COLLECTIONS.vocabulary)
    ).insertOne(document);
    return { ...document, _id: result.insertedId };
  },
  async update(id, update) {
    return (
      await collection(VOCABULARY_COLLECTIONS.vocabulary)
    ).findOneAndUpdate(
      idFilter(id),
      { $set: update },
      { returnDocument: "after" },
    );
  },
  async delete(id) {
    return (await collection(VOCABULARY_COLLECTIONS.vocabulary)).deleteOne(
      idFilter(id),
    );
  },
  async countProgress(vocabularyId) {
    return (await collection(VOCABULARY_COLLECTIONS.progress)).countDocuments({
      vocabularyId: toObjectId(vocabularyId),
    });
  },
  async findLesson(id) {
    return (await collection(LEARNING_COLLECTIONS.lessons)).findOne(
      idFilter(id),
    );
  },
  async listPublishedLessons(ids) {
    return (await collection(LEARNING_COLLECTIONS.lessons))
      .find({ _id: { $in: ids }, status: "published" })
      .toArray();
  },
  async listUnits(ids) {
    return (await collection(LEARNING_COLLECTIONS.units))
      .find({ _id: { $in: ids } })
      .toArray();
  },
  async listPublishedCourses(ids) {
    return (await collection(LEARNING_COLLECTIONS.courses))
      .find({ _id: { $in: ids }, status: "published" })
      .toArray();
  },
  async save(userId, vocabularyId, now) {
    const filter = {
      userId: toObjectId(userId),
      vocabularyId: toObjectId(vocabularyId),
    };
    return (await collection(VOCABULARY_COLLECTIONS.progress)).findOneAndUpdate(
      filter,
      {
        $setOnInsert: { ...filter, createdAt: now },
        $set: { saved: true, updatedAt: now },
      },
      { upsert: true, returnDocument: "after" },
    );
  },
  async unsave(userId, vocabularyId) {
    return (await collection(VOCABULARY_COLLECTIONS.progress)).deleteOne({
      userId: toObjectId(userId),
      vocabularyId: toObjectId(vocabularyId),
    });
  },
  async listSavedProgress(userId) {
    return (await collection(VOCABULARY_COLLECTIONS.progress))
      .find({ userId: toObjectId(userId), saved: true })
      .sort({ updatedAt: -1 })
      .toArray();
  },
  toObjectId,
};
