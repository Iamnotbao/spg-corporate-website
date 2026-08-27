import { learningRepository } from "./learning.repository.js";
import { learningIntegrityRepository } from "./learning-integrity.repository.js";
import {
  paginationResult,
  ADMIN_DEFAULT_PAGE_SIZE,
  parseDateRange,
  parsePagination,
  parseSearch,
  searchFilter,
} from "../../utils/pagination.js";
import {
  COURSE_STATUSES,
  LESSON_STATUSES,
  LESSON_TYPES,
} from "./learning.constants.js";
import {
  LearningValidationError,
  validateCourse,
  validateLesson,
  validateUnit,
} from "./learning.validation.js";

export class LearningServiceError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function serialize(document, fields) {
  if (!document) return null;
  return fields.reduce(
    (result, field) => {
      if (document[field] !== undefined) {
        result[field] = ["courseId", "unitId"].includes(field)
          ? String(document[field])
          : document[field];
      }
      return result;
    },
    { id: String(document._id) },
  );
}

const serializeCourse = (document) =>
  serialize(document, [
    "title",
    "slug",
    "description",
    "thumbnail",
    "level",
    "estimatedDuration",
    "status",
    "order",
    "createdAt",
    "updatedAt",
  ]);
const serializeUnit = (document) =>
  serialize(document, [
    "courseId",
    "title",
    "description",
    "order",
    "createdAt",
    "updatedAt",
  ]);
const serializeLesson = (document) =>
  serialize(document, [
    "unitId",
    "title",
    "slug",
    "description",
    "content",
    "type",
    "duration",
    "order",
    "status",
    "createdAt",
    "updatedAt",
  ]);

function duplicateSlug(error, resource) {
  if (error?.code === 11000) {
    throw new LearningServiceError(409, `${resource} slug already exists`);
  }
  throw error;
}

function requireId(repository, value, field = "id") {
  const id = repository.toObjectId(value);
  if (!id) throw new LearningValidationError(`${field} must be a valid id`);
  return id;
}

export function createLearningService(
  repository = learningRepository,
  integrity = learningIntegrityRepository,
) {
  async function requireCourse(id) {
    requireId(repository, id, "courseId");
    const course = await repository.findCourse(id);
    if (!course) throw new LearningServiceError(404, "Course not found");
    return course;
  }

  async function requireUnit(id) {
    requireId(repository, id, "unitId");
    const unit = await repository.findUnit(id);
    if (!unit) throw new LearningServiceError(404, "Unit not found");
    return unit;
  }

  async function requirePublishableCourse(courseId) {
    const state = await integrity.getCoursePublishState(courseId);
    if (!state.publishedLessons) {
      throw new LearningServiceError(
        409,
        "A published course requires at least one published lesson",
      );
    }
    if (state.incompleteQuizLessons) {
      throw new LearningServiceError(
        409,
        "Every published quiz lesson requires a published quiz",
      );
    }
  }

  async function requirePublishableLesson(lesson) {
    if (lesson.type === "quiz" && !(await integrity.hasPublishedQuiz(lesson._id))) {
      throw new LearningServiceError(
        409,
        "A published quiz lesson requires a published quiz",
      );
    }
  }

  function hasDependencies(dependencies) {
    return Object.values(dependencies).some(Boolean);
  }

  function enumFilter(value, allowed, field) {
    const normalized = String(value || "").trim();
    if (!normalized) return "";
    if (!allowed.includes(normalized)) {
      throw new LearningValidationError(
        `${field} must be one of: ${allowed.join(", ")}`,
      );
    }
    return normalized;
  }

  async function listPage({ input, query, list, count, serializer, defaultPageSize = ADMIN_DEFAULT_PAGE_SIZE }) {
    const paging = parsePagination(input, { defaultPageSize, maxPageSize: 100 });
    const [items, total] = await Promise.all([
      list(query, { skip: paging.skip, limit: paging.pageSize }),
      count(query),
    ]);
    return {
      data: items.map(serializer),
      pagination: paginationResult(paging, total),
    };
  }

  return {
    async listPublishedCourses(filters = {}) {
      const query = { status: "published" };
      const search = parseSearch(filters.search);
      if (search) Object.assign(query, searchFilter(search, ["title", "slug", "description", "level"]));
      if (filters.level) query.level = parseSearch(filters.level, 80);
      return listPage({
        input: filters,
        query,
        list: repository.listCoursesPage,
        count: repository.countCourses,
        serializer: serializeCourse,
        defaultPageSize: 9,
      });
    },

    async getPublishedCourse(identifier) {
      const course = await repository.findCourse(identifier, {
        status: "published",
      });
      if (!course) throw new LearningServiceError(404, "Course not found");

      const units = await repository.listUnits({ courseId: course._id });
      const unitIds = units.map((unit) => unit._id);
      const lessons = unitIds.length
        ? await repository.listLessons({
            unitId: { $in: unitIds },
            status: "published",
          })
        : [];
      const lessonsByUnit = new Map();
      lessons.forEach((lesson) => {
        const key = String(lesson.unitId);
        lessonsByUnit.set(key, [
          ...(lessonsByUnit.get(key) || []),
          serializeLesson(lesson),
        ]);
      });

      return {
        ...serializeCourse(course),
        units: units.map((unit) => ({
          ...serializeUnit(unit),
          lessons: lessonsByUnit.get(String(unit._id)) || [],
        })),
      };
    },

    async getPublishedLesson(identifier) {
      const lesson = await repository.findLesson(identifier, {
        status: "published",
      });
      if (!lesson) throw new LearningServiceError(404, "Lesson not found");
      const unit = await repository.findUnit(lesson.unitId);
      if (!unit) throw new LearningServiceError(404, "Lesson not found");
      const course = await repository.findCourse(unit.courseId, {
        status: "published",
      });
      if (!course) throw new LearningServiceError(404, "Lesson not found");
      return {
        ...serializeLesson(lesson),
        unit: serializeUnit(unit),
        course: serializeCourse(course),
      };
    },

    async listCourses(filters = {}) {
      const query = { ...parseDateRange(filters) };
      const search = parseSearch(filters.search);
      const status = enumFilter(filters.status, COURSE_STATUSES, "status");
      if (search) Object.assign(query, searchFilter(search, ["title", "slug", "description", "level"]));
      if (status) query.status = status;
      return listPage({
        input: filters,
        query,
        list: repository.listCoursesPage,
        count: repository.countCourses,
        serializer: serializeCourse,
      });
    },

    async getCourse(id) {
      requireId(repository, id);
      const course = await repository.findCourse(id);
      if (!course) throw new LearningServiceError(404, "Course not found");
      return serializeCourse(course);
    },

    async createCourse(input) {
      const validated = validateCourse(input);
      if (validated.status === "published") {
        throw new LearningServiceError(
          409,
          "Create the course as draft and publish it after adding lessons",
        );
      }
      const document = {
        ...validated,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      try {
        return serializeCourse(await repository.createCourse(document));
      } catch (error) {
        return duplicateSlug(error, "Course");
      }
    },

    async updateCourse(id, input) {
      requireId(repository, id);
      const current = await repository.findCourse(id);
      if (!current) throw new LearningServiceError(404, "Course not found");
      const update = {
        ...validateCourse(input, { partial: true }),
        updatedAt: new Date(),
      };
      if (update.status === "published" && current.status !== "published") {
        await requirePublishableCourse(current._id);
      }
      try {
        const course = await repository.updateCourse(id, update);
        if (!course) throw new LearningServiceError(404, "Course not found");
        return serializeCourse(course);
      } catch (error) {
        return duplicateSlug(error, "Course");
      }
    },

    async deleteCourse(id) {
      const courseId = requireId(repository, id);
      const course = await repository.findCourse(id);
      if (!course) throw new LearningServiceError(404, "Course not found");
      if (course.status === "published") {
        throw new LearningServiceError(409, "Unpublish the course before deleting it");
      }
      if (await repository.countUnits({ courseId })) {
        throw new LearningServiceError(
          409,
          "Delete the course units before deleting the course",
        );
      }
      if (await integrity.countCourseHistory(courseId)) {
        throw new LearningServiceError(
          409,
          "Course with enrollment history cannot be deleted; keep it as draft",
        );
      }
      const result = await repository.deleteCourse(id);
      if (!result.deletedCount)
        throw new LearningServiceError(404, "Course not found");
    },

    async listUnits(filters = {}) {
      const query = { ...parseDateRange(filters) };
      if (filters.courseId)
        query.courseId = requireId(repository, filters.courseId, "courseId");
      const search = parseSearch(filters.search);
      if (search) Object.assign(query, searchFilter(search, ["title", "description"]));
      return listPage({
        input: filters,
        query,
        list: repository.listUnitsPage,
        count: repository.countUnits,
        serializer: serializeUnit,
      });
    },

    async getUnit(id) {
      requireId(repository, id);
      const unit = await repository.findUnit(id);
      if (!unit) throw new LearningServiceError(404, "Unit not found");
      return serializeUnit(unit);
    },

    async createUnit(input) {
      const validated = validateUnit(input);
      await requireCourse(validated.courseId);
      const document = {
        ...validated,
        courseId: repository.toObjectId(validated.courseId),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return serializeUnit(await repository.createUnit(document));
    },

    async updateUnit(id, input) {
      const unitId = requireId(repository, id);
      const current = await repository.findUnit(id);
      if (!current) throw new LearningServiceError(404, "Unit not found");
      const validated = validateUnit(input, { partial: true });
      if (validated.courseId) {
        await requireCourse(validated.courseId);
        if (
          String(validated.courseId) !== String(current.courseId) &&
          (await repository.countLessons({ unitId }))
        ) {
          throw new LearningServiceError(
            409,
            "Unit with lessons cannot be moved to another course",
          );
        }
        validated.courseId = repository.toObjectId(validated.courseId);
      }
      const unit = await repository.updateUnit(id, {
        ...validated,
        updatedAt: new Date(),
      });
      if (!unit) throw new LearningServiceError(404, "Unit not found");
      return serializeUnit(unit);
    },

    async deleteUnit(id) {
      const unitId = requireId(repository, id);
      if (await repository.countLessons({ unitId })) {
        throw new LearningServiceError(
          409,
          "Delete the unit lessons before deleting the unit",
        );
      }
      const result = await repository.deleteUnit(id);
      if (!result.deletedCount)
        throw new LearningServiceError(404, "Unit not found");
    },

    async listLessons(filters = {}) {
      const query = { ...parseDateRange(filters) };
      if (filters.unitId)
        query.unitId = requireId(repository, filters.unitId, "unitId");
      const search = parseSearch(filters.search);
      const type = enumFilter(filters.type, LESSON_TYPES, "type");
      const status = enumFilter(filters.status, LESSON_STATUSES, "status");
      if (search) Object.assign(query, searchFilter(search, ["title", "slug", "description", "content", "type"]));
      if (type) query.type = type;
      if (status) query.status = status;
      return listPage({
        input: filters,
        query,
        list: repository.listLessonsPage,
        count: repository.countLessons,
        serializer: serializeLesson,
      });
    },

    async getLesson(id) {
      requireId(repository, id);
      const lesson = await repository.findLesson(id);
      if (!lesson) throw new LearningServiceError(404, "Lesson not found");
      return serializeLesson(lesson);
    },

    async createLesson(input) {
      const validated = validateLesson(input);
      await requireUnit(validated.unitId);
      if (validated.status === "published" && validated.type === "quiz") {
        throw new LearningServiceError(
          409,
          "Create the quiz lesson as draft and publish it after its quiz",
        );
      }
      const document = {
        ...validated,
        unitId: repository.toObjectId(validated.unitId),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      try {
        return serializeLesson(await repository.createLesson(document));
      } catch (error) {
        return duplicateSlug(error, "Lesson");
      }
    },

    async updateLesson(id, input) {
      requireId(repository, id);
      const current = await repository.findLesson(id);
      if (!current) throw new LearningServiceError(404, "Lesson not found");
      const validated = validateLesson(input, { partial: true });
      const dependencies =
        validated.unitId || validated.type
          ? await integrity.getLessonDependencies(current._id)
          : { progress: 0, vocabulary: 0, quizzes: 0 };
      if (validated.unitId) {
        await requireUnit(validated.unitId);
        if (
          String(validated.unitId) !== String(current.unitId) &&
          hasDependencies(dependencies)
        ) {
          throw new LearningServiceError(
            409,
            "Lesson with content or learning history cannot be moved",
          );
        }
        validated.unitId = repository.toObjectId(validated.unitId);
      }
      if (
        validated.type &&
        validated.type !== current.type &&
        dependencies.quizzes
      ) {
        throw new LearningServiceError(
          409,
          "Lesson type cannot change while a quiz is attached",
        );
      }
      const nextLesson = { ...current, ...validated };
      if (nextLesson.status === "published") {
        await requirePublishableLesson(nextLesson);
      }
      try {
        const lesson = await repository.updateLesson(id, {
          ...validated,
          updatedAt: new Date(),
        });
        if (!lesson) throw new LearningServiceError(404, "Lesson not found");
        return serializeLesson(lesson);
      } catch (error) {
        return duplicateSlug(error, "Lesson");
      }
    },

    async deleteLesson(id) {
      const lessonId = requireId(repository, id);
      const lesson = await repository.findLesson(id);
      if (!lesson) throw new LearningServiceError(404, "Lesson not found");
      if (lesson.status === "published") {
        throw new LearningServiceError(409, "Unpublish the lesson before deleting it");
      }
      const dependencies = await integrity.getLessonDependencies(lessonId);
      if (hasDependencies(dependencies)) {
        throw new LearningServiceError(
          409,
          "Lesson with content or learning history cannot be deleted; keep it as draft",
        );
      }
      const result = await repository.deleteLesson(id);
      if (!result.deletedCount)
        throw new LearningServiceError(404, "Lesson not found");
    },
  };
}

export const learningService = createLearningService();
