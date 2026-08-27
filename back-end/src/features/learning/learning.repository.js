import { getCollection } from "../../config/db.js";
import { toObjectId } from "../../utils/objectId.js";
import { LEARNING_COLLECTIONS } from "./learning.constants.js";

let indexPromise;

export async function ensureLearningIndexes() {
  if (!indexPromise) {
    indexPromise = Promise.all([
      getCollection(LEARNING_COLLECTIONS.courses).then((collection) =>
        Promise.all([
          collection.createIndex({ slug: 1 }, { unique: true }),
          collection.createIndex({ status: 1, order: 1, _id: 1 }),
        ]),
      ),
      getCollection(LEARNING_COLLECTIONS.units).then((collection) =>
        collection.createIndex({ courseId: 1, order: 1, _id: 1 }),
      ),
      getCollection(LEARNING_COLLECTIONS.lessons).then((collection) =>
        Promise.all([
          collection.createIndex({ slug: 1 }, { unique: true }),
          collection.createIndex({ unitId: 1, status: 1, order: 1, _id: 1 }),
        ]),
      ),
    ]).catch((error) => {
      indexPromise = undefined;
      throw error;
    });
  }
  return indexPromise;
}

async function collection(name) {
  await ensureLearningIndexes();
  return getCollection(name);
}

function identifierFilter(identifier) {
  const id = toObjectId(identifier);
  return id
    ? { $or: [{ _id: id }, { slug: String(identifier) }] }
    : { slug: String(identifier) };
}

function idFilter(id) {
  const value = toObjectId(id);
  return value ? { _id: value } : { _id: null };
}

export const learningRepository = {
  async listCourses(filter = {}) {
    return (await collection(LEARNING_COLLECTIONS.courses))
      .find(filter)
      .sort({ order: 1, title: 1, _id: 1 })
      .toArray();
  },
  async listCoursesPage(filter = {}, { skip = 0, limit = 10 } = {}) {
    return (await collection(LEARNING_COLLECTIONS.courses))
      .find(filter)
      .sort({ order: 1, title: 1, _id: 1 })
      .skip(skip)
      .limit(limit)
      .toArray();
  },
  async countCourses(filter = {}) {
    return (await collection(LEARNING_COLLECTIONS.courses)).countDocuments(filter);
  },
  async findCourse(identifier, filter = {}) {
    return (await collection(LEARNING_COLLECTIONS.courses)).findOne({
      ...identifierFilter(identifier),
      ...filter,
    });
  },
  async createCourse(document) {
    const result = await (
      await collection(LEARNING_COLLECTIONS.courses)
    ).insertOne(document);
    return { ...document, _id: result.insertedId };
  },
  async updateCourse(id, update) {
    return (await collection(LEARNING_COLLECTIONS.courses)).findOneAndUpdate(
      idFilter(id),
      { $set: update },
      { returnDocument: "after" },
    );
  },
  async deleteCourse(id) {
    return (await collection(LEARNING_COLLECTIONS.courses)).deleteOne(
      idFilter(id),
    );
  },
  async listUnits(filter = {}) {
    return (await collection(LEARNING_COLLECTIONS.units))
      .find(filter)
      .sort({ order: 1, title: 1, _id: 1 })
      .toArray();
  },
  async listUnitsPage(filter = {}, { skip = 0, limit = 10 } = {}) {
    return (await collection(LEARNING_COLLECTIONS.units))
      .find(filter)
      .sort({ order: 1, title: 1, _id: 1 })
      .skip(skip)
      .limit(limit)
      .toArray();
  },
  async findUnit(id) {
    return (await collection(LEARNING_COLLECTIONS.units)).findOne(idFilter(id));
  },
  async createUnit(document) {
    const result = await (
      await collection(LEARNING_COLLECTIONS.units)
    ).insertOne(document);
    return { ...document, _id: result.insertedId };
  },
  async updateUnit(id, update) {
    return (await collection(LEARNING_COLLECTIONS.units)).findOneAndUpdate(
      idFilter(id),
      { $set: update },
      { returnDocument: "after" },
    );
  },
  async deleteUnit(id) {
    return (await collection(LEARNING_COLLECTIONS.units)).deleteOne(
      idFilter(id),
    );
  },
  async countUnits(filter = {}) {
    return (await collection(LEARNING_COLLECTIONS.units)).countDocuments(
      filter,
    );
  },
  async listLessons(filter = {}) {
    return (await collection(LEARNING_COLLECTIONS.lessons))
      .find(filter)
      .sort({ order: 1, title: 1, _id: 1 })
      .toArray();
  },
  async listLessonsPage(filter = {}, { skip = 0, limit = 10 } = {}) {
    return (await collection(LEARNING_COLLECTIONS.lessons))
      .find(filter)
      .sort({ order: 1, title: 1, _id: 1 })
      .skip(skip)
      .limit(limit)
      .toArray();
  },
  async findLesson(identifier, filter = {}) {
    return (await collection(LEARNING_COLLECTIONS.lessons)).findOne({
      ...identifierFilter(identifier),
      ...filter,
    });
  },
  async createLesson(document) {
    const result = await (
      await collection(LEARNING_COLLECTIONS.lessons)
    ).insertOne(document);
    return { ...document, _id: result.insertedId };
  },
  async updateLesson(id, update) {
    return (await collection(LEARNING_COLLECTIONS.lessons)).findOneAndUpdate(
      idFilter(id),
      { $set: update },
      { returnDocument: "after" },
    );
  },
  async deleteLesson(id) {
    return (await collection(LEARNING_COLLECTIONS.lessons)).deleteOne(
      idFilter(id),
    );
  },
  async countLessons(filter = {}) {
    return (await collection(LEARNING_COLLECTIONS.lessons)).countDocuments(
      filter,
    );
  },
  toObjectId,
};
