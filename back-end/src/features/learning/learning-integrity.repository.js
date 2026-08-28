import { getCollection } from "../../config/db.js";
import { toObjectId } from "../../utils/objectId.js";
import { LEARNING_COLLECTIONS } from "./learning.constants.js";

const RELATED_COLLECTIONS = Object.freeze({
  enrollments: "enrollments",
  lessonProgress: "lesson_progress",
  quizzes: "quizzes",
  vocabulary: "vocabularies",
  lessonVocabulary: "lesson_vocabulary",
});

export const learningIntegrityRepository = {
  async countCourseHistory(courseId) {
    return getCollection(RELATED_COLLECTIONS.enrollments).then((collection) =>
      collection.countDocuments({ courseId: toObjectId(courseId) }),
    );
  },

  async getLessonDependencies(lessonId) {
    const id = toObjectId(lessonId);
    const [progress, legacyVocabulary, linkedVocabulary, quizzes] = await Promise.all([
      getCollection(RELATED_COLLECTIONS.lessonProgress).then((collection) =>
        collection.countDocuments({ lessonId: id }),
      ),
      getCollection(RELATED_COLLECTIONS.vocabulary).then((collection) =>
        collection.countDocuments({ lessonId: id }),
      ),
      getCollection(RELATED_COLLECTIONS.lessonVocabulary).then((collection) =>
        collection.countDocuments({ lessonId: id }),
      ),
      getCollection(RELATED_COLLECTIONS.quizzes).then((collection) =>
        collection.countDocuments({ lessonId: id }),
      ),
    ]);
    return {
      progress,
      vocabulary: legacyVocabulary + linkedVocabulary,
      quizzes,
    };
  },

  async hasPublishedQuiz(lessonId) {
    return Boolean(
      await getCollection(RELATED_COLLECTIONS.quizzes).then((collection) =>
        collection.findOne({ lessonId: toObjectId(lessonId), status: "published" }),
      ),
    );
  },

  async getCoursePublishState(courseId) {
    const id = toObjectId(courseId);
    const units = await getCollection(LEARNING_COLLECTIONS.units).then((collection) =>
      collection.find({ courseId: id }, { projection: { _id: 1 } }).toArray(),
    );
    if (!units.length) return { publishedLessons: 0, incompleteQuizLessons: 0 };
    const lessons = await getCollection(LEARNING_COLLECTIONS.lessons).then((collection) =>
      collection
        .find(
          { unitId: { $in: units.map((unit) => unit._id) }, status: "published" },
          { projection: { _id: 1, type: 1 } },
        )
        .toArray(),
    );
    const quizLessons = lessons.filter((lesson) => lesson.type === "quiz");
    const publishedQuizCount = quizLessons.length
      ? await getCollection(RELATED_COLLECTIONS.quizzes).then((collection) =>
          collection.countDocuments({
            lessonId: { $in: quizLessons.map((lesson) => lesson._id) },
            status: "published",
          }),
        )
      : 0;
    return {
      publishedLessons: lessons.length,
      incompleteQuizLessons: quizLessons.length - publishedQuizCount,
    };
  },
};
