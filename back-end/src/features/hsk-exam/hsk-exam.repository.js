import { getCollection } from "../../config/db.js";
import { toObjectId } from "../../utils/objectId.js";

export const HSK_EXAM_COLLECTIONS = Object.freeze({
  exams: "hsk_mock_exams",
  sections: "hsk_mock_sections",
  questions: "hsk_mock_questions",
  attempts: "hsk_mock_attempts",
});

let indexPromise;

export async function ensureHskExamIndexes() {
  if (!indexPromise) {
    indexPromise = Promise.all([
      getCollection(HSK_EXAM_COLLECTIONS.exams).then((collection) =>
        Promise.all([
          collection.createIndex({ status: 1, level: 1, createdAt: -1, _id: -1 }),
          collection.createIndex({ featured: 1, status: 1, updatedAt: -1 }),
        ]),
      ),
      getCollection(HSK_EXAM_COLLECTIONS.sections).then((collection) =>
        collection.createIndex({ examId: 1, order: 1, _id: 1 }),
      ),
      getCollection(HSK_EXAM_COLLECTIONS.questions).then((collection) =>
        collection.createIndex({ sectionId: 1, order: 1, _id: 1 }),
      ),
      getCollection(HSK_EXAM_COLLECTIONS.attempts).then((collection) =>
        Promise.all([
          collection.createIndex({ userId: 1, examId: 1, startedAt: -1, _id: -1 }),
          collection.createIndex({ userId: 1, status: 1, expiresAt: 1 }),
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
  await ensureHskExamIndexes();
  return getCollection(name);
}

const idFilter = (id) => ({ _id: toObjectId(id) || null });

export const hskExamRepository = {
  async listExams(filter, { skip, limit }) {
    return (await collection(HSK_EXAM_COLLECTIONS.exams))
      .find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
  },
  async countExams(filter) {
    return (await collection(HSK_EXAM_COLLECTIONS.exams)).countDocuments(filter);
  },
  async findExam(id, filter = {}) {
    return (await collection(HSK_EXAM_COLLECTIONS.exams)).findOne({ ...idFilter(id), ...filter });
  },
  async createExam(document) {
    const result = await (await collection(HSK_EXAM_COLLECTIONS.exams)).insertOne(document);
    return { ...document, _id: result.insertedId };
  },
  async updateExam(id, update) {
    return (await collection(HSK_EXAM_COLLECTIONS.exams)).findOneAndUpdate(idFilter(id), { $set: update }, { returnDocument: "after" });
  },
  async deleteExam(id) {
    return (await collection(HSK_EXAM_COLLECTIONS.exams)).deleteOne(idFilter(id));
  },
  async listSections(examId) {
    return (await collection(HSK_EXAM_COLLECTIONS.sections)).find({ examId: toObjectId(examId) }).sort({ order: 1, _id: 1 }).toArray();
  },
  async findSection(id) {
    return (await collection(HSK_EXAM_COLLECTIONS.sections)).findOne(idFilter(id));
  },
  async createSection(document) {
    const result = await (await collection(HSK_EXAM_COLLECTIONS.sections)).insertOne(document);
    return { ...document, _id: result.insertedId };
  },
  async updateSection(id, update) {
    return (await collection(HSK_EXAM_COLLECTIONS.sections)).findOneAndUpdate(idFilter(id), { $set: update }, { returnDocument: "after" });
  },
  async deleteSection(id) {
    return (await collection(HSK_EXAM_COLLECTIONS.sections)).deleteOne(idFilter(id));
  },
  async listQuestionsBySectionIds(sectionIds) {
    return (await collection(HSK_EXAM_COLLECTIONS.questions)).find({ sectionId: { $in: sectionIds.map(toObjectId) } }).sort({ order: 1, _id: 1 }).toArray();
  },
  async findQuestion(id) {
    return (await collection(HSK_EXAM_COLLECTIONS.questions)).findOne(idFilter(id));
  },
  async createQuestion(document) {
    const result = await (await collection(HSK_EXAM_COLLECTIONS.questions)).insertOne(document);
    return { ...document, _id: result.insertedId };
  },
  async updateQuestion(id, update) {
    return (await collection(HSK_EXAM_COLLECTIONS.questions)).findOneAndUpdate(idFilter(id), { $set: update }, { returnDocument: "after" });
  },
  async deleteQuestion(id) {
    return (await collection(HSK_EXAM_COLLECTIONS.questions)).deleteOne(idFilter(id));
  },
  async countQuestions(sectionId) {
    return (await collection(HSK_EXAM_COLLECTIONS.questions)).countDocuments({ sectionId: toObjectId(sectionId) });
  },
  async countAttempts(examId) {
    return (await collection(HSK_EXAM_COLLECTIONS.attempts)).countDocuments({ examId: toObjectId(examId) });
  },
  async createAttempt(document) {
    const result = await (await collection(HSK_EXAM_COLLECTIONS.attempts)).insertOne(document);
    return { ...document, _id: result.insertedId };
  },
  async findOwnAttempt(userId, attemptId) {
    return (await collection(HSK_EXAM_COLLECTIONS.attempts)).findOne({ _id: toObjectId(attemptId), userId: toObjectId(userId) });
  },
  async updateOwnAttempt(userId, attemptId, status, update) {
    return (await collection(HSK_EXAM_COLLECTIONS.attempts)).findOneAndUpdate(
      { _id: toObjectId(attemptId), userId: toObjectId(userId), status },
      { $set: update },
      { returnDocument: "after" },
    );
  },
  async listOwnAttempts(userId, examId, { skip, limit }) {
    return (await collection(HSK_EXAM_COLLECTIONS.attempts))
      .find({ userId: toObjectId(userId), examId: toObjectId(examId), status: "submitted" })
      .sort({ submittedAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
  },
  async countOwnAttempts(userId, examId) {
    return (await collection(HSK_EXAM_COLLECTIONS.attempts)).countDocuments({ userId: toObjectId(userId), examId: toObjectId(examId), status: "submitted" });
  },
  toObjectId,
};
