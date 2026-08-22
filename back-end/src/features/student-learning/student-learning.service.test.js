import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import { createStudentLearningService } from "./student-learning.service.js";

const ids = Object.fromEntries(
  [
    "studentA",
    "studentB",
    "course",
    "draftCourse",
    "unit1",
    "unit2",
    "lesson1",
    "lesson2",
    "draftLesson",
    "progress",
    "enrollment",
  ].map((key, index) => [
    key,
    new ObjectId(`607f1f77bcf86cd799439${String(index + 1).padStart(3, "0")}`),
  ]),
);
const course = {
  _id: ids.course,
  title: "HSK 1",
  slug: "hsk-1",
  status: "published",
  order: 1,
};
const units = [
  { _id: ids.unit1, courseId: ids.course, title: "Unit 1", order: 1 },
  { _id: ids.unit2, courseId: ids.course, title: "Unit 2", order: 2 },
];
const lessons = [
  {
    _id: ids.lesson1,
    unitId: ids.unit1,
    title: "Lesson 1",
    slug: "lesson-1",
    status: "published",
    order: 1,
  },
  {
    _id: ids.lesson2,
    unitId: ids.unit2,
    title: "Lesson 2",
    slug: "lesson-2",
    status: "published",
    order: 1,
  },
];

function repository(overrides = {}) {
  const enrollment = {
    _id: ids.enrollment,
    userId: ids.studentA,
    courseId: ids.course,
    status: "active",
    enrolledAt: new Date(),
  };
  return {
    async findPublishedCourse(identifier) {
      return String(identifier) === String(ids.draftCourse) ? null : course;
    },
    async enroll(userId) {
      return { created: true, enrollment: { ...enrollment, userId } };
    },
    async findEnrollment(userId) {
      return String(userId) === String(ids.studentA) ? enrollment : null;
    },
    async listEnrollments(userId) {
      return String(userId) === String(ids.studentA) ? [enrollment] : [];
    },
    async listPublishedCoursesByIds(courseIds) {
      return courseIds.length ? [course] : [];
    },
    async listUnitsByCourseIds() {
      return units;
    },
    async listPublishedLessonsByUnitIds() {
      return lessons;
    },
    async listCompletedProgress(userId) {
      return String(userId) === String(ids.studentA)
        ? [{ lessonId: ids.lesson1, completed: true }]
        : [];
    },
    async findPublishedLesson(identifier) {
      return lessons.find((item) => item.slug === identifier) || null;
    },
    async findUnit(id) {
      return units.find((item) => String(item._id) === String(id));
    },
    async completeLesson(userId, lessonId) {
      return {
        _id: ids.progress,
        userId,
        lessonId,
        completed: true,
        completedAt: new Date(),
      };
    },
    ...overrides,
  };
}

test("enrollment is student-owned, published-only, and idempotency is passed through", async () => {
  let owner;
  const service = createStudentLearningService(
    repository({
      async enroll(userId) {
        owner = userId;
        return {
          created: false,
          enrollment: {
            _id: ids.enrollment,
            userId,
            courseId: ids.course,
            status: "active",
          },
        };
      },
    }),
  );
  const result = await service.enroll(
    { _id: ids.studentA, role: "student" },
    { courseId: String(ids.course) },
  );
  assert.equal(String(owner), String(ids.studentA));
  assert.equal(result.created, false);
  await assert.rejects(
    () =>
      service.enroll(
        { _id: ids.studentA, role: "student" },
        { courseId: String(ids.draftCourse) },
      ),
    { status: 404 },
  );
  await assert.rejects(
    () =>
      service.enroll(
        { _id: ids.studentA, role: "student" },
        { courseId: String(ids.course), userId: String(ids.studentB) },
      ),
    { status: 400 },
  );
});

test("My Courses and progress are scoped to the authenticated student", async () => {
  const service = createStudentLearningService(repository());
  const mine = await service.listMyCourses({
    _id: ids.studentA,
    role: "student",
  });
  const theirs = await service.listMyCourses({
    _id: ids.studentB,
    role: "student",
  });
  assert.equal(mine[0].progressPercentage, 50);
  assert.equal(mine[0].completedLessons, 1);
  assert.equal(mine[0].continueLesson.slug, "lesson-2");
  assert.deepEqual(theirs, []);
});

test("lesson completion requires the authenticated student's enrollment", async () => {
  let completedOwner;
  const service = createStudentLearningService(
    repository({
      async completeLesson(userId, lessonId) {
        completedOwner = userId;
        return { _id: ids.progress, userId, lessonId, completed: true };
      },
    }),
  );
  await service.completeLesson(
    { _id: ids.studentA, role: "student" },
    "lesson-2",
  );
  assert.equal(String(completedOwner), String(ids.studentA));
  await assert.rejects(
    () =>
      service.completeLesson(
        { _id: ids.studentB, role: "student" },
        "lesson-2",
      ),
    { status: 403, message: "Enrollment is required to complete lessons" },
  );
});

test("draft lessons stay outside the progress denominator", async () => {
  const service = createStudentLearningService(
    repository({
      async listPublishedLessonsByUnitIds() {
        return lessons;
      },
      async listCompletedProgress() {
        return [
          { lessonId: ids.lesson1, completed: true },
          { lessonId: ids.draftLesson, completed: true },
        ];
      },
    }),
  );
  const state = await service.getCourseState(
    { _id: ids.studentA, role: "student" },
    "hsk-1",
  );
  assert.equal(state.totalLessons, 2);
  assert.equal(state.completedLessons, 1);
  assert.equal(state.progressPercentage, 50);
});

test("quiz lessons cannot bypass scoring through manual completion", async () => {
  const service = createStudentLearningService(
    repository({
      async findPublishedLesson() {
        return { ...lessons[1], type: "quiz" };
      },
    }),
  );
  await assert.rejects(
    () =>
      service.completeLesson(
        { _id: ids.studentA, role: "student" },
        "lesson-2",
      ),
    { status: 409, message: "Pass the published quiz to complete this lesson" },
  );
});

test("repeated passing completions keep one logical LessonProgress record", async () => {
  const progressKeys = new Set();
  const service = createStudentLearningService(
    repository({
      async findPublishedLesson() {
        return { ...lessons[1], type: "quiz" };
      },
      async completeLesson(userId, lessonId) {
        const key = `${userId}:${lessonId}`;
        progressKeys.add(key);
        return {
          _id: ids.progress,
          userId,
          lessonId,
          completed: true,
          completedAt: new Date(),
        };
      },
    }),
  );
  const user = { _id: ids.studentA, role: "student" };
  await service.completeQuizLesson(user, "lesson-2");
  await service.completeQuizLesson(user, "lesson-2");
  assert.equal(progressKeys.size, 1);
});
