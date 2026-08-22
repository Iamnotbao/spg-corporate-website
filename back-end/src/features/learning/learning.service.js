import { learningRepository } from "./learning.repository.js";
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

export function createLearningService(repository = learningRepository) {
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

  return {
    async listPublishedCourses() {
      return (await repository.listCourses({ status: "published" })).map(
        serializeCourse,
      );
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

    async listCourses() {
      return (await repository.listCourses()).map(serializeCourse);
    },

    async getCourse(id) {
      requireId(repository, id);
      const course = await repository.findCourse(id);
      if (!course) throw new LearningServiceError(404, "Course not found");
      return serializeCourse(course);
    },

    async createCourse(input) {
      const document = {
        ...validateCourse(input),
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
      const update = {
        ...validateCourse(input, { partial: true }),
        updatedAt: new Date(),
      };
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
      if (await repository.countUnits({ courseId })) {
        throw new LearningServiceError(
          409,
          "Delete the course units before deleting the course",
        );
      }
      const result = await repository.deleteCourse(id);
      if (!result.deletedCount)
        throw new LearningServiceError(404, "Course not found");
    },

    async listUnits(filters = {}) {
      const query = {};
      if (filters.courseId)
        query.courseId = requireId(repository, filters.courseId, "courseId");
      return (await repository.listUnits(query)).map(serializeUnit);
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
      requireId(repository, id);
      const validated = validateUnit(input, { partial: true });
      if (validated.courseId) {
        await requireCourse(validated.courseId);
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
      const query = {};
      if (filters.unitId)
        query.unitId = requireId(repository, filters.unitId, "unitId");
      return (await repository.listLessons(query)).map(serializeLesson);
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
      const validated = validateLesson(input, { partial: true });
      if (validated.unitId) {
        await requireUnit(validated.unitId);
        validated.unitId = repository.toObjectId(validated.unitId);
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
      requireId(repository, id);
      const result = await repository.deleteLesson(id);
      if (!result.deletedCount)
        throw new LearningServiceError(404, "Lesson not found");
    },
  };
}

export const learningService = createLearningService();
