import { progressRepository } from "./progress.repository.js";

export class ProgressServiceError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function requireStudent(user) {
  if (!user || user.role !== "student") {
    throw new ProgressServiceError(403, "Student access required");
  }
  return user._id;
}

function serializeCourse(course) {
  return {
    id: String(course._id),
    title: course.title,
    slug: course.slug,
    description: course.description,
    thumbnail: course.thumbnail,
    level: course.level,
  };
}

function buildCourseState(course, enrollment, units, lessons, progress) {
  const unitIds = new Set(
    units
      .filter((unit) => String(unit.courseId) === String(course._id))
      .map((unit) => String(unit._id)),
  );
  const courseLessons = lessons.filter((lesson) => unitIds.has(String(lesson.unitId)));
  const lessonIds = new Set(courseLessons.map((lesson) => String(lesson._id)));
  const completed = progress.filter((item) => lessonIds.has(String(item.lessonId)));
  const completedIds = new Set(completed.map((item) => String(item.lessonId)));
  const totalLessons = courseLessons.length;
  const completedLessons = completedIds.size;
  const nextLesson = courseLessons.find((lesson) => !completedIds.has(String(lesson._id)));
  const activityTimes = [enrollment.updatedAt, enrollment.enrolledAt, ...completed.map((item) => item.completedAt)]
    .filter(Boolean)
    .map((value) => new Date(value).getTime())
    .filter(Number.isFinite);
  return {
    course: serializeCourse(course),
    enrollment: {
      id: String(enrollment._id),
      status: enrollment.status,
      enrolledAt: enrollment.enrolledAt,
      archivedAt: enrollment.archivedAt,
    },
    totalLessons,
    completedLessons,
    progressPercentage: totalLessons
      ? Math.round((completedLessons / totalLessons) * 100)
      : 0,
    completed: totalLessons > 0 && completedLessons === totalLessons,
    continueLesson:
      enrollment.status === "active" && nextLesson
        ? {
            id: String(nextLesson._id),
            slug: nextLesson.slug,
            title: nextLesson.title,
            courseSlug: course.slug,
          }
        : null,
    latestActivity: activityTimes.length ? new Date(Math.max(...activityTimes)) : null,
  };
}

function serializeAttempt(attempt) {
  return {
    id: String(attempt._id),
    quizId: String(attempt.quizId),
    quizTitle: attempt.quizTitle || "Quiz",
    score: attempt.score,
    earnedPoints: attempt.earnedPoints,
    totalPoints: attempt.totalPoints,
    passed: attempt.passed,
    submittedAt: attempt.submittedAt,
  };
}

function paginationFilters(repository, query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(query.pageSize) || 10));
  const status = String(query.status || "").trim();
  if (status && !["active", "archived"].includes(status)) {
    throw new ProgressServiceError(400, "status must be active or archived");
  }
  const courseId = String(query.courseId || "").trim();
  if (courseId && !repository.toObjectId(courseId)) {
    throw new ProgressServiceError(400, "courseId must be a valid id");
  }
  const rawSearch = String(query.search || "").trim().slice(0, 100);
  return {
    page,
    pageSize,
    status,
    courseId,
    search: rawSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  };
}

export function createProgressService(repository = progressRepository) {
  return {
    async getStudentProgress(user) {
      const userId = requireStudent(user);
      const enrollments = await repository.listStudentEnrollments(userId);
      const courses = await repository.listPublishedCoursesByIds(
        enrollments.map((item) => item.courseId),
      );
      const units = await repository.listUnitsByCourseIds(
        courses.map((course) => course._id),
      );
      const lessons = await repository.listPublishedLessonsByUnitIds(
        units.map((unit) => unit._id),
      );
      const lessonProgress = await repository.listCompletedProgress(
        userId,
        lessons.map((lesson) => lesson._id),
      );
      const enrollmentByCourse = new Map(
        enrollments.map((item) => [String(item.courseId), item]),
      );
      const courseStates = courses.map((course) =>
        buildCourseState(
          course,
          enrollmentByCourse.get(String(course._id)),
          units,
          lessons,
          lessonProgress,
        ),
      );
      const [quizAttempts, savedVocabulary, recentAttempts] = await Promise.all([
        repository.countQuizAttempts(userId),
        repository.countSavedVocabulary(userId),
        repository.listRecentQuizAttempts(userId, 5),
      ]);
      const activeCourses = courseStates.filter(
        (item) => item.enrollment.status === "active",
      );
      return {
        overview: {
          activeCourses: activeCourses.length,
          archivedCourses: courseStates.length - activeCourses.length,
          completedCourses: courseStates.filter((item) => item.completed).length,
          completedLessons: courseStates.reduce(
            (total, item) => total + item.completedLessons,
            0,
          ),
          totalPublishedLessons: courseStates.reduce(
            (total, item) => total + item.totalLessons,
            0,
          ),
          quizAttempts,
          savedVocabulary,
        },
        courses: courseStates,
        recentQuizResults: recentAttempts.map(serializeAttempt),
      };
    },

    async getAdminSummary() {
      const [counts, courses, metrics] = await Promise.all([
        repository.getAdminCounts(),
        repository.listCoursesForReporting(),
        repository.aggregateCourseMetrics(),
      ]);
      const metricsByCourse = new Map(
        metrics.map((item) => [String(item._id), item]),
      );
      const courseMetrics = courses.map((course) => {
        const metric = metricsByCourse.get(String(course._id));
        return {
          course: {
            id: String(course._id),
            title: course.title,
            slug: course.slug,
            status: course.status,
          },
          totalEnrollments: metric?.totalEnrollments || 0,
          activeEnrollments: metric?.activeEnrollments || 0,
          completedCourses: metric?.completedCourses || 0,
          averageProgress: Math.round(metric?.averageProgress || 0),
        };
      });
      return {
        ...counts,
        completedCourses: courseMetrics.reduce(
          (total, item) => total + item.completedCourses,
          0,
        ),
        courseMetrics,
      };
    },

    async listAdminProgress(query) {
      const filters = paginationFilters(repository, query);
      const result = await repository.listEnrollmentProgress(filters);
      const totalPages = Math.max(1, Math.ceil(result.total / filters.pageSize));
      return {
        data: result.data,
        pagination: {
          page: filters.page,
          pageSize: filters.pageSize,
          total: result.total,
          totalPages,
        },
      };
    },
  };
}

export const progressService = createProgressService();
