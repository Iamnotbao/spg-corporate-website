import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import { createProgressService } from "./progress.service.js";

const ids = Object.fromEntries(
  ["student", "course", "archivedCourse", "unit", "lesson1", "lesson2", "enrollment", "archivedEnrollment", "attempt"].map(
    (key, index) => [
      key,
      new ObjectId(`907f1f77bcf86cd799439${String(index + 1).padStart(3, "0")}`),
    ],
  ),
);

function repository(overrides = {}) {
  const enrollments = [
    {
      _id: ids.enrollment,
      userId: ids.student,
      courseId: ids.course,
      status: "active",
      enrolledAt: new Date("2026-01-01"),
    },
    {
      _id: ids.archivedEnrollment,
      userId: ids.student,
      courseId: ids.archivedCourse,
      status: "archived",
      enrolledAt: new Date("2025-01-01"),
      archivedAt: new Date("2025-06-01"),
    },
  ];
  const courses = [
    { _id: ids.course, title: "HSK 1", slug: "hsk-1", status: "published" },
    {
      _id: ids.archivedCourse,
      title: "HSK Starter",
      slug: "hsk-starter",
      status: "published",
    },
  ];
  const units = [
    { _id: ids.unit, courseId: ids.course },
    { _id: new ObjectId(), courseId: ids.archivedCourse },
  ];
  const lessons = [
    { _id: ids.lesson1, unitId: units[0]._id, title: "One", slug: "one" },
    { _id: ids.lesson2, unitId: units[0]._id, title: "Two", slug: "two" },
  ];
  return {
    toObjectId(value) {
      return ObjectId.isValid(value) ? new ObjectId(value) : null;
    },
    async listStudentEnrollments(userId) {
      return String(userId) === String(ids.student) ? enrollments : [];
    },
    async listPublishedCoursesByIds(courseIds) {
      return courses.filter((course) =>
        courseIds.some((id) => String(id) === String(course._id)),
      );
    },
    async listUnitsByCourseIds() {
      return units;
    },
    async listPublishedLessonsByUnitIds() {
      return lessons;
    },
    async listCompletedProgress(userId) {
      return String(userId) === String(ids.student)
        ? [{ lessonId: ids.lesson1, completed: true, completedAt: new Date() }]
        : [];
    },
    async countQuizAttempts(userId) {
      return String(userId) === String(ids.student) ? 3 : 0;
    },
    async countSavedVocabulary(userId) {
      return String(userId) === String(ids.student) ? 4 : 0;
    },
    async listRecentQuizAttempts(userId) {
      return String(userId) === String(ids.student)
        ? [
            {
              _id: ids.attempt,
              quizId: new ObjectId(),
              quizTitle: "Checkpoint",
              score: 80,
              passed: true,
              submittedAt: new Date(),
            },
          ]
        : [];
    },
    async getAdminCounts() {
      return {
        students: 2,
        courses: 2,
        activeEnrollments: 1,
        totalEnrollments: 2,
        completedLessons: 1,
        quizAttempts: 3,
      };
    },
    async listCoursesForReporting() {
      return courses;
    },
    async aggregateCourseMetrics() {
      return [
        {
          _id: ids.course,
          totalEnrollments: 1,
          activeEnrollments: 1,
          completedCourses: 0,
          averageProgress: 50,
        },
      ];
    },
    async listEnrollmentProgress() {
      return { data: [{ id: "row" }], total: 1 };
    },
    ...overrides,
  };
}

test("student aggregate progress is owner-scoped and uses published lessons", async () => {
  const service = createProgressService(repository());
  const mine = await service.getStudentProgress({
    _id: ids.student,
    role: "student",
  });
  assert.equal(mine.overview.activeCourses, 1);
  assert.equal(mine.overview.archivedCourses, 1);
  assert.equal(mine.overview.completedLessons, 1);
  assert.equal(mine.overview.totalPublishedLessons, 2);
  assert.equal(mine.overview.quizAttempts, 3);
  assert.equal(mine.overview.savedVocabulary, 4);
  assert.equal(mine.courses[0].progressPercentage, 50);
  assert.equal(mine.courses[0].continueLesson.slug, "two");

  const other = await service.getStudentProgress({
    _id: new ObjectId(),
    role: "student",
  });
  assert.equal(other.overview.activeCourses, 0);
  assert.equal(other.overview.completedLessons, 0);
  assert.deepEqual(other.recentQuizResults, []);
});

test("course completion requires every current published lesson and excludes zero lessons", async () => {
  const completeRepository = repository({
    async listCompletedProgress() {
      return [
        { lessonId: ids.lesson1, completed: true },
        { lessonId: ids.lesson2, completed: true },
      ];
    },
  });
  const result = await createProgressService(completeRepository).getStudentProgress({
    _id: ids.student,
    role: "student",
  });
  assert.equal(result.courses[0].completed, true);
  assert.equal(result.courses[1].completed, false);
  assert.equal(result.overview.completedCourses, 1);
});

test("admin reporting returns real aggregate counts and paginated rows", async () => {
  const service = createProgressService(repository());
  const summary = await service.getAdminSummary();
  assert.equal(summary.students, 2);
  assert.equal(summary.completedCourses, 0);
  assert.equal(summary.courseMetrics[1].totalEnrollments, 0);
  const report = await service.listAdminProgress({ page: 1, pageSize: 10 });
  assert.equal(report.data.length, 1);
  assert.equal(report.pagination.total, 1);
});

test("admin progress rejects invalid filters before repository access", async () => {
  const service = createProgressService(repository());
  await assert.rejects(() => service.listAdminProgress({ status: "deleted" }), {
    status: 400,
  });
  await assert.rejects(() => service.listAdminProgress({ courseId: "not-an-id" }), {
    status: 400,
  });
});
