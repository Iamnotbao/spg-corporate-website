import { vocabularyRepository } from "./vocabulary.repository.js";
import {
  calculateNextReview,
  initialSrsState,
  serializeSrs,
} from "./vocabulary.srs.js";

export class VocabularyReviewError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function requireStudent(user) {
  if (user?.role !== "student")
    throw new VocabularyReviewError(403, "Student access required");
  return user._id;
}

function serializeVocabulary(item) {
  return {
    id: String(item._id),
    simplified: item.simplified,
    traditional: item.traditional || "",
    pinyin: item.pinyin,
    meaningVietnamese: item.meaningVietnamese,
    meaningEnglish: item.meaningEnglish || "",
    audioUrl: item.audioUrl || "",
    exampleChinese: item.exampleChinese || "",
    examplePinyin: item.examplePinyin || "",
    exampleVietnamese: item.exampleVietnamese || "",
    hskLevel: item.hskLevel,
    lessonId: String(item.lessonId),
  };
}

async function publicVocabularyByIds(repository, ids) {
  if (!ids.length) return [];
  const items = await repository.list({
    _id: { $in: ids.map((id) => repository.toObjectId(id)) },
    status: "published",
  });
  if (!items.length) return [];
  const lessonIds = [...new Set(items.map((item) => String(item.lessonId)))].map(
    (id) => repository.toObjectId(id),
  );
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
  const courseIds = new Set(courses.map((course) => String(course._id)));
  const unitIds = new Set(
    units
      .filter((unit) => courseIds.has(String(unit.courseId)))
      .map((unit) => String(unit._id)),
  );
  const visibleLessonIds = new Set(
    lessons
      .filter((lesson) => unitIds.has(String(lesson.unitId)))
      .map((lesson) => String(lesson._id)),
  );
  return items.filter((item) => visibleLessonIds.has(String(item.lessonId)));
}

export function createVocabularyReviewService(repository = vocabularyRepository) {
  return {
    async queue(user, options = {}) {
      const userId = requireStudent(user);
      const now = new Date();
      const limit = Math.min(50, Math.max(1, Number(options.limit) || 20));
      const [progressRows, due, saved] = await Promise.all([
        repository.listDueProgress(userId, now, limit),
        repository.countDueProgress(userId, now),
        repository.countSavedProgress(userId),
      ]);
      const vocabulary = await publicVocabularyByIds(
        repository,
        progressRows.map((row) => row.vocabularyId),
      );
      const vocabularyById = new Map(
        vocabulary.map((item) => [String(item._id), item]),
      );
      return {
        data: progressRows
          .map((progress) => {
            const item = vocabularyById.get(String(progress.vocabularyId));
            return item
              ? {
                  vocabulary: serializeVocabulary(item),
                  srs: serializeSrs(progress),
                }
              : null;
          })
          .filter(Boolean),
        summary: { due, saved },
      };
    },

    async review(user, vocabularyId, input = {}) {
      const userId = requireStudent(user);
      const id = repository.toObjectId(vocabularyId);
      if (!id) throw new VocabularyReviewError(400, "Invalid vocabulary id");
      const progress = await repository.findProgress(userId, id);
      if (!progress?.saved) {
        throw new VocabularyReviewError(
          409,
          "Save this vocabulary before reviewing it",
        );
      }
      const visible = await publicVocabularyByIds(repository, [id]);
      if (!visible.length)
        throw new VocabularyReviewError(404, "Vocabulary not found");
      const rating = String(input.rating || "").trim().toLowerCase();
      const now = new Date();
      const update = calculateNextReview(
        { ...initialSrsState(now), ...progress },
        rating,
        now,
      );
      const next = await repository.updateProgress(userId, id, update);
      return {
        vocabulary: serializeVocabulary(visible[0]),
        srs: serializeSrs(next),
      };
    },
  };
}

export const vocabularyReviewService = createVocabularyReviewService();
