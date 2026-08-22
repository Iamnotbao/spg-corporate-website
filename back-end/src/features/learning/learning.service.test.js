import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import { createLearningService } from "./learning.service.js";

const ids = {
  course: new ObjectId("507f1f77bcf86cd799439011"),
  draftCourse: new ObjectId("507f1f77bcf86cd799439012"),
  unit: new ObjectId("507f1f77bcf86cd799439013"),
  lesson: new ObjectId("507f1f77bcf86cd799439014"),
  draftLesson: new ObjectId("507f1f77bcf86cd799439015"),
};

function matches(document, filter = {}) {
  return Object.entries(filter).every(([field, expected]) => {
    if (field === "$or")
      return expected.some((condition) => matches(document, condition));
    if (expected?.$in) {
      return expected.$in.some(
        (value) => String(value) === String(document[field]),
      );
    }
    return String(document[field]) === String(expected);
  });
}

function fakeRepository(overrides = {}) {
  const courses = [
    {
      _id: ids.course,
      title: "HSK 1",
      slug: "hsk-1",
      status: "published",
      order: 1,
    },
    {
      _id: ids.draftCourse,
      title: "Draft",
      slug: "draft-course",
      status: "draft",
      order: 2,
    },
  ];
  const units = [
    { _id: ids.unit, courseId: ids.course, title: "Unit 1", order: 1 },
  ];
  const lessons = [
    {
      _id: ids.lesson,
      unitId: ids.unit,
      title: "Published lesson",
      slug: "published-lesson",
      content: "Content",
      type: "grammar",
      status: "published",
      order: 1,
    },
    {
      _id: ids.draftLesson,
      unitId: ids.unit,
      title: "Draft lesson",
      slug: "draft-lesson",
      content: "Draft",
      type: "grammar",
      status: "draft",
      order: 2,
    },
  ];

  return {
    toObjectId(value) {
      return ObjectId.isValid(value) ? new ObjectId(value) : null;
    },
    async listCourses(filter) {
      return courses.filter((item) => matches(item, filter));
    },
    async findCourse(identifier, filter = {}) {
      return courses.find(
        (item) =>
          (String(item._id) === String(identifier) ||
            item.slug === identifier) &&
          matches(item, filter),
      );
    },
    async listUnits(filter) {
      return units.filter((item) => matches(item, filter));
    },
    async findUnit(id) {
      return units.find((item) => String(item._id) === String(id));
    },
    async listLessons(filter) {
      return lessons.filter((item) => matches(item, filter));
    },
    async findLesson(identifier, filter = {}) {
      return lessons.find(
        (item) =>
          (String(item._id) === String(identifier) ||
            item.slug === identifier) &&
          matches(item, filter),
      );
    },
    ...overrides,
  };
}

test("public course list exposes published courses only", async () => {
  const service = createLearningService(fakeRepository());
  const result = await service.listPublishedCourses();
  assert.deepEqual(
    result.map((course) => course.slug),
    ["hsk-1"],
  );
});

test("published course structure loads units and published lessons without per-unit queries", async () => {
  let lessonQueries = 0;
  const repository = fakeRepository();
  const originalListLessons = repository.listLessons;
  repository.listLessons = async (filter) => {
    lessonQueries += 1;
    return originalListLessons(filter);
  };
  const service = createLearningService(repository);
  const result = await service.getPublishedCourse("hsk-1");
  assert.equal(lessonQueries, 1);
  assert.equal(result.units.length, 1);
  assert.deepEqual(
    result.units[0].lessons.map((lesson) => lesson.slug),
    ["published-lesson"],
  );
});

test("a published lesson remains private when its parent course is draft", async () => {
  const repository = fakeRepository({
    async findUnit(id) {
      return {
        _id: id,
        courseId: ids.draftCourse,
        title: "Draft unit",
        order: 1,
      };
    },
  });
  const service = createLearningService(repository);
  await assert.rejects(() => service.getPublishedLesson("published-lesson"), {
    status: 404,
    message: "Lesson not found",
  });
});

test("a draft lesson is not publicly readable", async () => {
  const service = createLearningService(fakeRepository());
  await assert.rejects(() => service.getPublishedLesson("draft-lesson"), {
    status: 404,
    message: "Lesson not found",
  });
});

test("unit creation rejects a missing parent course", async () => {
  const service = createLearningService(
    fakeRepository({
      async findCourse() {
        return null;
      },
    }),
  );
  await assert.rejects(
    () =>
      service.createUnit({
        courseId: String(ids.course),
        title: "Unit",
        description: "",
        order: 1,
      }),
    { status: 404, message: "Course not found" },
  );
});

test("lesson validation rejects unsupported lesson types", async () => {
  const service = createLearningService(fakeRepository());
  await assert.rejects(
    () =>
      service.createLesson({
        unitId: String(ids.unit),
        title: "Lesson",
        slug: "lesson",
        content: "Content",
        type: "video",
        order: 1,
        status: "published",
      }),
    { status: 400 },
  );
});

test("lesson creation rejects a missing parent unit", async () => {
  const service = createLearningService(
    fakeRepository({
      async findUnit() {
        return null;
      },
    }),
  );
  await assert.rejects(
    () =>
      service.createLesson({
        unitId: String(ids.unit),
        title: "Lesson",
        slug: "lesson",
        content: "Content",
        type: "grammar",
        order: 1,
        status: "draft",
      }),
    { status: 404, message: "Unit not found" },
  );
});

test("duplicate course slugs produce a conflict response", async () => {
  const service = createLearningService(
    fakeRepository({
      async createCourse() {
        const error = new Error("duplicate key");
        error.code = 11000;
        throw error;
      },
    }),
  );
  await assert.rejects(
    () =>
      service.createCourse({
        title: "HSK 1",
        slug: "hsk-1",
        description: "Description",
        level: "HSK 1",
        status: "draft",
        order: 1,
      }),
    { status: 409, message: "Course slug already exists" },
  );
});

test("updates cannot clear required learning fields", async () => {
  const service = createLearningService(fakeRepository());
  await assert.rejects(
    () => service.updateCourse(String(ids.course), { title: "" }),
    { status: 400, message: "title is required" },
  );
});
