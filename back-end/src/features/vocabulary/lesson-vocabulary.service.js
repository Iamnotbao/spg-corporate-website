import {
  paginationResult,
  parsePagination,
  parseSearch,
  searchFilter,
} from "../../utils/pagination.js";
import { VocabularyValidationError } from "./vocabulary.validation.js";
import { lessonVocabularyRepository } from "./lesson-vocabulary.repository.js";

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
    lessonId: item.lessonId ? String(item.lessonId) : "",
    characterIds: (item.characterIds || []).map(String),
    status: item.status,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function requireObjectId(repository, value, field) {
  const id = repository.toObjectId(value);
  if (!id) throw new VocabularyValidationError(`${field} must be a valid id`);
  return id;
}

export function createLessonVocabularyService(repository = lessonVocabularyRepository) {
  async function requireLesson(lessonId, { published = false } = {}) {
    requireObjectId(repository, lessonId, "lessonId");
    const lesson = await repository.findLesson(lessonId, { published });
    if (!lesson) {
      const error = new Error("Lesson not found");
      error.status = 404;
      throw error;
    }
    return lesson;
  }

  async function requirePublicHierarchy(lessonId) {
    const lesson = await requireLesson(lessonId, { published: true });
    const unit = await repository.findUnit(lesson.unitId);
    if (!unit) {
      const error = new Error("Lesson not found");
      error.status = 404;
      throw error;
    }
    const course = await repository.findPublishedCourse(unit.courseId);
    if (!course) {
      const error = new Error("Lesson not found");
      error.status = 404;
      throw error;
    }
    return lesson;
  }

  return {
    async listAdminLinks(lessonId) {
      await requireLesson(lessonId);
      const ids = await repository.listLinkedIds(lessonId);
      return ids.map(String);
    },

    async replaceAdminLinks(lessonId, input = {}) {
      await requireLesson(lessonId);
      if (!Array.isArray(input.vocabularyIds)) {
        throw new VocabularyValidationError("vocabularyIds must be an array");
      }
      const normalized = [...new Set(input.vocabularyIds.map(String))];
      if (normalized.length > 500) {
        throw new VocabularyValidationError("vocabularyIds must contain at most 500 items");
      }
      normalized.forEach((id) => requireObjectId(repository, id, "vocabularyIds"));
      const existingCount = await repository.countVocabulary(normalized);
      if (existingCount !== normalized.length) {
        throw new VocabularyValidationError("One or more vocabularyIds do not exist");
      }
      await repository.replaceLinks(lessonId, normalized);
      return normalized;
    },

    async listPublicForLesson(lessonId, filters = {}) {
      await requirePublicHierarchy(lessonId);
      const paging = parsePagination(filters, { defaultPageSize: 12, maxPageSize: 100 });
      const query = {};
      const search = parseSearch(filters.search);
      if (filters.hskLevel) query.hskLevel = parseSearch(filters.hskLevel, 40);
      if (search) {
        Object.assign(
          query,
          searchFilter(search, [
            "simplified",
            "traditional",
            "pinyin",
            "meaningVietnamese",
            "meaningEnglish",
            "exampleChinese",
          ]),
        );
      }
      const linkedIds = await repository.listLinkedIds(lessonId);
      if (linkedIds.length) query._id = { $in: linkedIds };
      const { items, total } = await repository.listLessonVocabularyPage(
        lessonId,
        linkedIds,
        query,
        { skip: paging.skip, limit: paging.pageSize },
      );
      return {
        data: items.map(serialize),
        pagination: paginationResult(paging, total),
      };
    },
  };
}

export const lessonVocabularyService = createLessonVocabularyService();
