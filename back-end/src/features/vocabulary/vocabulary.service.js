import { vocabularyRepository } from "./vocabulary.repository.js";
import {
  validateVocabulary,
  validateVocabularyImport,
  VocabularyValidationError,
} from "./vocabulary.validation.js";

export class VocabularyServiceError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function serialize(item) {
  return {
    id: String(item._id),
    simplified: item.simplified,
    traditional: item.traditional,
    pinyin: item.pinyin,
    meaningVietnamese: item.meaningVietnamese,
    meaningEnglish: item.meaningEnglish,
    audioUrl: item.audioUrl,
    exampleChinese: item.exampleChinese,
    examplePinyin: item.examplePinyin,
    exampleVietnamese: item.exampleVietnamese,
    hskLevel: item.hskLevel,
    lessonId: String(item.lessonId),
    status: item.status,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function requireId(repository, value, field = "id") {
  const id = repository.toObjectId(value);
  if (!id) throw new VocabularyValidationError(`${field} must be a valid id`);
  return id;
}

export function vocabularyDuplicateKey(item, lessonId = item?.lessonId) {
  const simplified = String(item?.simplified ?? "").trim();
  const pinyin = String(item?.pinyin ?? "")
    .trim()
    .toLocaleLowerCase("vi");
  return `${String(lessonId)}::${simplified}::${pinyin}`;
}

function importRowNumber(row, index) {
  const value = Number(row?.rowNumber);
  return Number.isInteger(value) && value > 0 ? value : index + 1;
}

async function filterPublicHierarchy(repository, items) {
  if (!items.length) return [];
  const lessonIds = [
    ...new Set(items.map((item) => String(item.lessonId))),
  ].map((id) => repository.toObjectId(id));
  const lessons = await repository.listPublishedLessons(lessonIds);
  const units = await repository.listUnits(
    [...new Set(lessons.map((lesson) => String(lesson.unitId)))].map((id) =>
      repository.toObjectId(id),
    ),
  );
  const courses = await repository.listPublishedCourses(
    [...new Set(units.map((unit) => String(unit.courseId)))].map((id) =>
      repository.toObjectId(id),
    ),
  );
  const publicCourseIds = new Set(courses.map((course) => String(course._id)));
  const publicUnitIds = new Set(
    units
      .filter((unit) => publicCourseIds.has(String(unit.courseId)))
      .map((unit) => String(unit._id)),
  );
  const publicLessonIds = new Set(
    lessons
      .filter((lesson) => publicUnitIds.has(String(lesson.unitId)))
      .map((lesson) => String(lesson._id)),
  );
  return items.filter((item) => publicLessonIds.has(String(item.lessonId)));
}

export function createVocabularyService(repository = vocabularyRepository) {
  async function requireLesson(lessonId) {
    requireId(repository, lessonId, "lessonId");
    const lesson = await repository.findLesson(lessonId);
    if (!lesson) throw new VocabularyServiceError(404, "Lesson not found");
    return lesson;
  }

  async function requirePublicVocabulary(id) {
    requireId(repository, id);
    const item = await repository.find(id, { status: "published" });
    if (!item) throw new VocabularyServiceError(404, "Vocabulary not found");
    const visible = await filterPublicHierarchy(repository, [item]);
    if (!visible.length)
      throw new VocabularyServiceError(404, "Vocabulary not found");
    return item;
  }

  return {
    async listPublic(filters = {}) {
      const query = { status: "published" };
      if (filters.hskLevel) query.hskLevel = String(filters.hskLevel).trim();
      if (filters.lessonId)
        query.lessonId = requireId(repository, filters.lessonId, "lessonId");
      const items = await repository.list(query);
      return (await filterPublicHierarchy(repository, items)).map(serialize);
    },
    async listAdmin() {
      return (await repository.list()).map(serialize);
    },
    async getAdmin(id) {
      requireId(repository, id);
      const item = await repository.find(id);
      if (!item) throw new VocabularyServiceError(404, "Vocabulary not found");
      return serialize(item);
    },
    async create(input) {
      const validated = validateVocabulary(input);
      await requireLesson(validated.lessonId);
      const now = new Date();
      return serialize(
        await repository.create({
          ...validated,
          lessonId: repository.toObjectId(validated.lessonId),
          createdAt: now,
          updatedAt: now,
        }),
      );
    },
    async importBatch(input) {
      const request = validateVocabularyImport(input);
      const lesson = await requireLesson(request.lessonId);
      const lessonId = repository.toObjectId(lesson._id || request.lessonId);
      const existing = await repository.listLessonIdentities(lessonId);
      const existingKeys = new Set(
        existing.map((item) => vocabularyDuplicateKey(item, lessonId)),
      );
      const seenKeys = new Set();
      const documents = [];
      const documentRows = [];
      const rowErrors = [];
      let invalid = 0;
      let skippedDuplicates = 0;
      const now = new Date();

      request.rows.forEach((row, index) => {
        const rowNumber = importRowNumber(row, index);
        if (!row || typeof row !== "object" || Array.isArray(row)) {
          invalid += 1;
          rowErrors.push({
            index,
            rowNumber,
            type: "invalid",
            message: "Vocabulary row must be an object",
          });
          return;
        }
        if (
          Object.prototype.hasOwnProperty.call(row, "lessonId") ||
          Object.prototype.hasOwnProperty.call(row, "status")
        ) {
          invalid += 1;
          rowErrors.push({
            index,
            rowNumber,
            type: "invalid",
            message: "lessonId and status must be selected outside the import file",
          });
          return;
        }

        const { rowNumber: _rowNumber, ...rowInput } = row;
        let validated;
        try {
          validated = validateVocabulary({
            ...rowInput,
            lessonId: String(lessonId),
            status: request.status,
          });
        } catch (error) {
          invalid += 1;
          rowErrors.push({
            index,
            rowNumber,
            type: "invalid",
            message: error.message,
          });
          return;
        }

        const key = vocabularyDuplicateKey(validated, lessonId);
        const duplicate = existingKeys.has(key) || seenKeys.has(key);
        if (duplicate && request.duplicateMode === "skip") {
          skippedDuplicates += 1;
          rowErrors.push({
            index,
            rowNumber,
            type: "duplicate",
            message: "Duplicate vocabulary skipped",
          });
          return;
        }

        seenKeys.add(key);
        documents.push({
          ...validated,
          lessonId,
          createdAt: now,
          updatedAt: now,
        });
        documentRows.push({ index, rowNumber });
      });

      const insertResult = await repository.insertMany(documents);
      for (const failure of insertResult.failures || []) {
        const source = documentRows[failure.index] || {
          index: failure.index,
          rowNumber: failure.index + 1,
        };
        rowErrors.push({
          ...source,
          type: "failure",
          message: failure.message,
        });
      }

      return {
        total: request.rows.length,
        selected: request.rows.length,
        inserted: insertResult.insertedCount,
        skippedDuplicates,
        invalid,
        failures: (insertResult.failures || []).length,
        rowErrors,
      };
    },
    async update(id, input) {
      requireId(repository, id);
      const current = await repository.find(id);
      if (!current) throw new VocabularyServiceError(404, "Vocabulary not found");
      const validated = validateVocabulary(input, { partial: true });
      if (validated.lessonId) {
        await requireLesson(validated.lessonId);
        if (
          String(validated.lessonId) !== String(current.lessonId) &&
          (await repository.countProgress(id))
        ) {
          throw new VocabularyServiceError(
            409,
            "Saved vocabulary cannot be moved to another lesson",
          );
        }
        validated.lessonId = repository.toObjectId(validated.lessonId);
      }
      const item = await repository.update(id, {
        ...validated,
        updatedAt: new Date(),
      });
      if (!item) throw new VocabularyServiceError(404, "Vocabulary not found");
      return serialize(item);
    },
    async delete(id) {
      requireId(repository, id);
      const item = await repository.find(id);
      if (!item) throw new VocabularyServiceError(404, "Vocabulary not found");
      if (item.status === "published") {
        throw new VocabularyServiceError(
          409,
          "Unpublish vocabulary before deleting it",
        );
      }
      if (await repository.countProgress(id)) {
        throw new VocabularyServiceError(
          409,
          "Remove saved vocabulary references before deleting",
        );
      }
      const result = await repository.delete(id);
      if (!result.deletedCount)
        throw new VocabularyServiceError(404, "Vocabulary not found");
    },
    async save(user, id) {
      if (user?.role !== "student")
        throw new VocabularyServiceError(403, "Student access required");
      const item = await requirePublicVocabulary(id);
      const progress = await repository.save(user._id, item._id, new Date());
      return {
        vocabulary: serialize(item),
        saved: progress.saved,
        savedAt: progress.updatedAt,
      };
    },
    async unsave(user, id) {
      if (user?.role !== "student")
        throw new VocabularyServiceError(403, "Student access required");
      requireId(repository, id);
      await repository.unsave(user._id, id);
      return { vocabularyId: String(id), saved: false };
    },
    async listSaved(user) {
      if (user?.role !== "student")
        throw new VocabularyServiceError(403, "Student access required");
      const progress = await repository.listSavedProgress(user._id);
      const items = await repository.list({
        _id: { $in: progress.map((item) => item.vocabularyId) },
        status: "published",
      });
      const visible = await filterPublicHierarchy(repository, items);
      const savedAt = new Map(
        progress.map((item) => [String(item.vocabularyId), item.updatedAt]),
      );
      return visible.map((item) => ({
        ...serialize(item),
        saved: true,
        savedAt: savedAt.get(String(item._id)),
      }));
    },
  };
}

export const vocabularyService = createVocabularyService();
