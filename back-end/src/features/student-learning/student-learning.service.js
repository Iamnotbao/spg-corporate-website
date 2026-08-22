import { studentLearningRepository } from "./student-learning.repository.js";

export class StudentLearningError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function requireStudent(user) {
  if (!user || user.role !== "student") {
    throw new StudentLearningError(403, "Student access required");
  }
  return user._id;
}

function validateEnrollmentInput(input = {}) {
  const unknown = Object.keys(input).filter((key) => key !== "courseId");
  if (unknown.length) {
    throw new StudentLearningError(
      400,
      `Unknown fields: ${unknown.join(", ")}`,
    );
  }
  const courseId = String(input.courseId || "").trim();
  if (!courseId) throw new StudentLearningError(400, "courseId is required");
  return courseId;
}

function serializeCourse(course) {
  return {
    id: String(course._id),
    title: course.title,
    slug: course.slug,
    description: course.description,
    thumbnail: course.thumbnail,
    level: course.level,
    estimatedDuration: course.estimatedDuration,
  };
}

function serializeEnrollment(enrollment) {
  return {
    id: String(enrollment._id),
    courseId: String(enrollment.courseId),
    status: enrollment.status,
    enrolledAt: enrollment.enrolledAt,
    createdAt: enrollment.createdAt,
    updatedAt: enrollment.updatedAt,
  };
}

function buildCourseState(course, enrollment, units, lessons, progress) {
  const courseUnits = units.filter(
    (unit) => String(unit.courseId) === String(course._id),
  );
  const courseLessons = courseUnits.flatMap((unit) =>
    lessons.filter((lesson) => String(lesson.unitId) === String(unit._id)),
  );
  const completedIds = new Set(
    progress
      .filter((item) =>
        courseLessons.some(
          (lesson) => String(lesson._id) === String(item.lessonId),
        ),
      )
      .map((item) => String(item.lessonId)),
  );
  const completedLessons = courseLessons.filter((lesson) =>
    completedIds.has(String(lesson._id)),
  ).length;
  const totalLessons = courseLessons.length;
  const progressPercentage = totalLessons
    ? Math.round((completedLessons / totalLessons) * 100)
    : 0;
  const nextLesson = courseLessons.find(
    (lesson) => !completedIds.has(String(lesson._id)),
  );

  return {
    course: serializeCourse(course),
    enrolled: Boolean(enrollment),
    enrollment: enrollment ? serializeEnrollment(enrollment) : null,
    totalLessons,
    completedLessons,
    progressPercentage,
    completedLessonIds: [...completedIds],
    continueLesson: nextLesson
      ? {
          id: String(nextLesson._id),
          slug: nextLesson.slug,
          title: nextLesson.title,
          courseSlug: course.slug,
        }
      : null,
    completed: totalLessons > 0 && completedLessons === totalLessons,
  };
}

export function createStudentLearningService(
  repository = studentLearningRepository,
) {
  async function loadCourseState(userId, course, enrollment) {
    const units = await repository.listUnitsByCourseIds([course._id]);
    const lessons = await repository.listPublishedLessonsByUnitIds(
      units.map((unit) => unit._id),
    );
    const progress = await repository.listCompletedProgress(
      userId,
      lessons.map((lesson) => lesson._id),
    );
    return buildCourseState(course, enrollment, units, lessons, progress);
  }

  async function recordLessonCompletion(
    user,
    lessonIdentifier,
    { quizOnly = false } = {},
  ) {
    const userId = requireStudent(user);
    const lesson = await repository.findPublishedLesson(lessonIdentifier);
    if (!lesson)
      throw new StudentLearningError(404, "Published lesson not found");
    if (quizOnly && lesson.type !== "quiz") {
      throw new StudentLearningError(
        409,
        "Only quiz lessons can be completed by a quiz attempt",
      );
    }
    if (!quizOnly && lesson.type === "quiz") {
      throw new StudentLearningError(
        409,
        "Pass the published quiz to complete this lesson",
      );
    }
    const unit = await repository.findUnit(lesson.unitId);
    if (!unit)
      throw new StudentLearningError(404, "Lesson hierarchy not found");
    const course = await repository.findPublishedCourse(unit.courseId);
    if (!course)
      throw new StudentLearningError(404, "Lesson hierarchy not found");
    const enrollment = await repository.findEnrollment(userId, course._id);
    if (!enrollment) {
      throw new StudentLearningError(
        403,
        "Enrollment is required to complete lessons",
      );
    }
    const progress = await repository.completeLesson(
      userId,
      lesson._id,
      new Date(),
    );
    return {
      lessonProgress: {
        id: String(progress._id),
        lessonId: String(progress.lessonId),
        completed: progress.completed,
        completedAt: progress.completedAt,
      },
      courseState: await loadCourseState(userId, course, enrollment),
    };
  }

  return {
    async enroll(user, input) {
      const userId = requireStudent(user);
      const identifier = validateEnrollmentInput(input);
      const course = await repository.findPublishedCourse(identifier);
      if (!course)
        throw new StudentLearningError(404, "Published course not found");
      const result = await repository.enroll(userId, course._id, new Date());
      return {
        created: result.created,
        ...(await loadCourseState(userId, course, result.enrollment)),
      };
    },

    async getCourseState(user, identifier) {
      const userId = requireStudent(user);
      const course = await repository.findPublishedCourse(identifier);
      if (!course)
        throw new StudentLearningError(404, "Published course not found");
      const enrollment = await repository.findEnrollment(userId, course._id);
      return loadCourseState(userId, course, enrollment);
    },

    async listMyCourses(user) {
      const userId = requireStudent(user);
      const enrollments = await repository.listEnrollments(userId);
      const courses = await repository.listPublishedCoursesByIds(
        enrollments.map((item) => item.courseId),
      );
      if (!courses.length) return [];
      const units = await repository.listUnitsByCourseIds(
        courses.map((course) => course._id),
      );
      const lessons = await repository.listPublishedLessonsByUnitIds(
        units.map((unit) => unit._id),
      );
      const progress = await repository.listCompletedProgress(
        userId,
        lessons.map((lesson) => lesson._id),
      );
      const enrollmentsByCourse = new Map(
        enrollments.map((item) => [String(item.courseId), item]),
      );
      return courses.map((course) =>
        buildCourseState(
          course,
          enrollmentsByCourse.get(String(course._id)),
          units,
          lessons,
          progress,
        ),
      );
    },

    async completeLesson(user, lessonIdentifier) {
      return recordLessonCompletion(user, lessonIdentifier);
    },

    async completeQuizLesson(user, lessonIdentifier) {
      return recordLessonCompletion(user, lessonIdentifier, { quizOnly: true });
    },
  };
}

export const studentLearningService = createStudentLearningService();
