import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import { createStudentLearningService } from "./student-learning.service.js";

const ids = {
  student: new ObjectId("a07f1f77bcf86cd799439011"),
  course: new ObjectId("a07f1f77bcf86cd799439012"),
  enrollment: new ObjectId("a07f1f77bcf86cd799439013"),
  unit: new ObjectId("a07f1f77bcf86cd799439014"),
  lesson: new ObjectId("a07f1f77bcf86cd799439015"),
};

const student = { _id: ids.student, role: "student" };

function lifecycleRepository({ published = true } = {}) {
  const course = {
    _id: ids.course,
    title: "HSK 1",
    slug: "hsk-1",
    status: published ? "published" : "draft",
    order: 1,
  };
  const unit = { _id: ids.unit, courseId: ids.course, title: "Unit 1", order: 1 };
  const lesson = {
    _id: ids.lesson,
    unitId: ids.unit,
    title: "Lesson 1",
    slug: "lesson-1",
    status: "published",
    order: 1,
  };
  const enrollment = {
    _id: ids.enrollment,
    userId: ids.student,
    courseId: ids.course,
    status: "active",
    enrolledAt: new Date("2026-01-01T00:00:00.000Z"),
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
  const learningHistory = [
    {
      userId: ids.student,
      lessonId: ids.lesson,
      completed: true,
      completedAt: new Date("2026-01-02T00:00:00.000Z"),
    },
  ];

  return {
    enrollment,
    learningHistory,
    toObjectId(value) {
      return ObjectId.isValid(value) ? new ObjectId(value) : null;
    },
    async findPublishedCourse(identifier) {
      if (!published) return null;
      return String(identifier) === String(ids.course) || identifier === course.slug
        ? course
        : null;
    },
    async findEnrollment(userId, courseId) {
      return String(userId) === String(ids.student) &&
        String(courseId) === String(ids.course) &&
        enrollment.status === "active"
        ? enrollment
        : null;
    },
    async findEnrollmentRecord(userId, courseId) {
      return String(userId) === String(ids.student) &&
        String(courseId) === String(ids.course)
        ? enrollment
        : null;
    },
    async enroll(userId, courseId, now) {
      assert.equal(String(userId), String(ids.student));
      assert.equal(String(courseId), String(ids.course));
      enrollment.status = "active";
      enrollment.enrolledAt = now;
      enrollment.updatedAt = now;
      delete enrollment.archivedAt;
      return { created: false, enrollment };
    },
    async archiveEnrollment(userId, courseId, now) {
      assert.equal(String(userId), String(ids.student));
      assert.equal(String(courseId), String(ids.course));
      enrollment.status = "archived";
      enrollment.archivedAt = now;
      enrollment.updatedAt = now;
      return enrollment;
    },
    async listEnrollments() {
      return enrollment.status === "active" ? [enrollment] : [];
    },
    async listPublishedCoursesByIds() {
      return published ? [course] : [];
    },
    async listUnitsByCourseIds() {
      return [unit];
    },
    async listPublishedLessonsByUnitIds() {
      return [lesson];
    },
    async listCompletedProgress() {
      return learningHistory;
    },
  };
}

test("unenroll archives and re-enroll reactivates the same record without erasing history", async () => {
  const repository = lifecycleRepository();
  const service = createStudentLearningService(repository);
  const originalEnrollmentId = String(repository.enrollment._id);
  const originalHistory = repository.learningHistory.map((item) => ({ ...item }));

  const archived = await service.archiveEnrollment(student, String(ids.course));
  assert.equal(archived.enrollment.status, "archived");
  assert.equal(String(archived.enrollment.id), originalEnrollmentId);
  assert.deepEqual(repository.learningHistory, originalHistory);

  const reenrolled = await service.enroll(student, { courseId: String(ids.course) });
  assert.equal(reenrolled.created, false);
  assert.equal(reenrolled.enrollment.status, "active");
  assert.equal(String(reenrolled.enrollment.id), originalEnrollmentId);
  assert.equal(reenrolled.completedLessons, 1);
  assert.equal(reenrolled.progressPercentage, 100);
  assert.deepEqual(repository.learningHistory, originalHistory);
});

test("an unpublished course is inaccessible even when an enrollment record still exists", async () => {
  const repository = lifecycleRepository({ published: false });
  const service = createStudentLearningService(repository);

  await assert.rejects(() => service.getCourseState(student, String(ids.course)), {
    status: 404,
    message: "Published course not found",
  });

  const myCourses = await service.listMyCourses(student);
  assert.deepEqual(myCourses, []);
  assert.equal(repository.enrollment.status, "active");
  assert.equal(repository.learningHistory.length, 1);
});
