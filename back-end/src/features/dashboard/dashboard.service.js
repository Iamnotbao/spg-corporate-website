import { progressService } from "../progress/progress.service.js";
import { dashboardRepository } from "./dashboard.repository.js";

export const STUDY_TIMEZONE = "Asia/Ho_Chi_Minh";
const TIMEZONE_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export class DashboardServiceError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function requireStudent(user) {
  if (!user?._id || user.role !== "student") {
    throw new DashboardServiceError(403, "Student access required");
  }
  return user._id;
}

export function studyDateKey(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return new Date(date.getTime() + TIMEZONE_OFFSET_MS)
    .toISOString()
    .slice(0, 10);
}

function epochDay(key) {
  return Math.floor(Date.parse(`${key}T00:00:00.000Z`) / DAY_MS);
}

function keyFromEpochDay(value) {
  return new Date(value * DAY_MS).toISOString().slice(0, 10);
}

export function studyDayBounds(now = new Date()) {
  const today = studyDateKey(now);
  const start = new Date(
    Date.parse(`${today}T00:00:00.000Z`) - TIMEZONE_OFFSET_MS,
  );
  return {
    today,
    todayStart: start,
    tomorrow: new Date(start.getTime() + DAY_MS),
  };
}

export function buildStreakAnalytics(events, now = new Date()) {
  const counts = new Map();
  for (const event of events || []) {
    const key = studyDateKey(event.occurredAt);
    if (key) counts.set(key, (counts.get(key) || 0) + 1);
  }
  const days = [...counts.keys()].map(epochDay).sort((a, b) => a - b);
  let longestStreak = 0;
  let run = 0;
  let previous;
  for (const day of days) {
    run = previous === day - 1 ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
    previous = day;
  }
  const today = epochDay(studyDateKey(now));
  const latest = days.at(-1);
  let currentStreak = 0;
  if (latest === today || latest === today - 1) {
    currentStreak = 1;
    for (let index = days.length - 2; index >= 0; index -= 1) {
      if (days[index] !== days[index + 1] - 1) break;
      currentStreak += 1;
    }
  }
  const recent7 = [];
  for (let day = today - 6; day <= today; day += 1) {
    const date = keyFromEpochDay(day);
    recent7.push({ date, actions: counts.get(date) || 0 });
  }
  const activeDates30 = [];
  for (let day = today - 29; day <= today; day += 1) {
    const date = keyFromEpochDay(day);
    if (counts.has(date)) activeDates30.push(date);
  }
  return {
    currentStreak,
    longestStreak,
    activeDates7: recent7
      .filter((item) => item.actions > 0)
      .map((item) => item.date),
    activeDates30,
    recent7,
  };
}

function courseDestination(item) {
  const lesson = item?.continueLesson;
  if (!lesson) return null;
  return `/courses/${encodeURIComponent(item.course.slug)}/lessons/${encodeURIComponent(lesson.slug)}`;
}

function buildTodayPlan({ srs, courses, quizLesson, character }) {
  const items = [];
  if (srs.dueNow > 0) {
    items.push({
      actionType: "srs_review",
      priority: 1,
      title: "Ôn từ vựng đến hạn",
      description: `${srs.dueNow} thẻ đang chờ ôn tập`,
      count: srs.dueNow,
      destination: "/review",
    });
  }
  const activeCourse = courses.find((item) => item.continueLesson);
  if (activeCourse) {
    items.push({
      actionType: "continue_course",
      priority: 2,
      title: activeCourse.continueLesson.title,
      description: `Tiếp tục ${activeCourse.course.title}`,
      destination: courseDestination(activeCourse),
    });
  }
  if (quizLesson) {
    items.push({
      actionType: "quiz_lesson",
      priority: 3,
      title: quizLesson.quizTitle || quizLesson.lessonTitle,
      description: `Quiz chưa hoàn thành · ${quizLesson.courseTitle}`,
      destination: `/courses/${encodeURIComponent(quizLesson.courseSlug)}/lessons/${encodeURIComponent(quizLesson.lessonSlug)}/quiz`,
    });
  }
  if (character) {
    items.push({
      actionType: "character_practice",
      priority: 4,
      title: `Luyện viết chữ ${character.simplified}`,
      description: "Từ từ vựng bạn đã ôn gần đây",
      destination: `/characters/${encodeURIComponent(character.simplified)}/practice`,
    });
  }
  return items;
}

function serializeRecentActivity({
  lessonRows,
  quizRows,
  vocabularyRows,
  characterRows,
}) {
  return [
    ...lessonRows.map((item) => ({
      id: `lesson:${item._id}`,
      type: "lesson_completed",
      title: item.lessonTitle,
      detail: item.courseTitle,
      occurredAt: item.completedAt,
      destination: `/courses/${encodeURIComponent(item.courseSlug)}/lessons/${encodeURIComponent(item.lessonSlug)}`,
    })),
    ...quizRows.map((item) => ({
      id: `quiz:${item._id}`,
      type: "quiz_attempt",
      title: item.quizTitle,
      detail: `${item.score}% · ${item.passed ? "Đạt" : "Chưa đạt"}`,
      occurredAt: item.submittedAt,
      destination:
        item.courseSlug && item.lessonSlug
          ? `/courses/${encodeURIComponent(item.courseSlug)}/lessons/${encodeURIComponent(item.lessonSlug)}/quiz`
          : null,
    })),
    ...vocabularyRows.map((item) => ({
      id: `vocabulary:${item.vocabularyId}`,
      type: "vocabulary_review",
      title: item.simplified,
      detail: `${item.pinyin || ""} · ${item.lastRating || "review"}`,
      occurredAt: item.lastReviewedAt,
      destination: "/review",
    })),
    ...characterRows.map((item) => ({
      id: `character:${item._id}`,
      type: "character_practice",
      title: `Luyện chữ ${item.simplified}`,
      detail: `${item.score} điểm`,
      occurredAt: item.createdAt,
      destination: `/characters/${encodeURIComponent(item.simplified)}/practice`,
    })),
  ]
    .filter((item) => Number.isFinite(new Date(item.occurredAt).getTime()))
    .sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt))
    .slice(0, 10);
}

function numeric(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

export function createDashboardService({
  repository = dashboardRepository,
  studentProgressService = progressService,
  clock = () => new Date(),
} = {}) {
  return {
    async getStudentDashboard(user) {
      const userId = requireStudent(user);
      const now = clock();
      const { todayStart, tomorrow } = studyDayBounds(now);
      const [
        progress,
        vocabulary,
        quiz,
        character,
        events,
        lessons,
        quizLesson,
      ] = await Promise.all([
        studentProgressService.getStudentProgress(user),
        repository.getVocabularyAnalytics(userId, {
          now,
          todayStart,
          tomorrow,
        }),
        repository.getQuizAnalytics(userId),
        repository.getCharacterAnalytics(userId),
        repository.listStudyEvents(userId),
        repository.listRecentLessonActivity(userId),
        repository.findIncompleteQuizLesson(userId),
      ]);
      const activeCourses = progress.courses.filter(
        (item) => item.enrollment.status === "active",
      );
      const characterIds = vocabulary.recent.flatMap(
        (item) => item.characterIds || [],
      );
      const characters =
        await repository.listPublishedCharactersByIds(characterIds);
      const characterById = new Map(
        characters.map((item) => [String(item._id), item]),
      );
      const recommendedCharacter = characterIds
        .map((id) => characterById.get(String(id)))
        .find(Boolean);
      const srsSummary = vocabulary.summary;
      const srs = {
        saved: numeric(srsSummary.saved),
        dueNow: numeric(srsSummary.dueNow),
        dueToday: numeric(srsSummary.dueToday),
        overdue: numeric(srsSummary.overdue),
        reviewedToday: numeric(srsSummary.reviewedToday),
        stages: {
          new: numeric(srsSummary.new),
          learning: numeric(srsSummary.learning),
          review: numeric(srsSummary.review),
          mastered: numeric(srsSummary.mastered),
        },
        ratingDistribution: {
          again: numeric(srsSummary.again),
          hard: numeric(srsSummary.hard),
          good: numeric(srsSummary.good),
          easy: numeric(srsSummary.easy),
        },
        recentReviews: vocabulary.recent.map((item) => ({
          vocabularyId: String(item.vocabularyId),
          simplified: item.simplified,
          pinyin: item.pinyin,
          stage: item.stage,
          lastRating: item.lastRating,
          lastReviewedAt: item.lastReviewedAt,
          nextReviewAt: item.nextReviewAt,
        })),
      };
      const quizSummary = quiz.summary;
      const quizAnalytics = {
        totalAttempts: numeric(quizSummary.totalAttempts),
        passedAttempts: numeric(quizSummary.passedAttempts),
        recentScore:
          quizSummary.recentScore == null
            ? null
            : numeric(quizSummary.recentScore),
        bestScore:
          quizSummary.bestScore == null ? null : numeric(quizSummary.bestScore),
        recentAttemptAt: quizSummary.recentAttemptAt || null,
        recentlyAttemptedQuiz: quiz.recent[0]
          ? {
              id: String(quiz.recent[0].quizId),
              title: quiz.recent[0].quizTitle,
            }
          : null,
        recentAttempts: quiz.recent.map((item) => ({
          id: String(item._id),
          quizId: String(item.quizId),
          title: item.quizTitle,
          score: numeric(item.score),
          passed: Boolean(item.passed),
          submittedAt: item.submittedAt,
        })),
      };
      const characterSummary = character.summary;
      const characterAnalytics = {
        totalAttempts: numeric(characterSummary.totalAttempts),
        charactersPracticed: numeric(characterSummary.charactersPracticed),
        recentScore:
          characterSummary.recentScore == null
            ? null
            : numeric(characterSummary.recentScore),
        bestScore:
          characterSummary.bestScore == null
            ? null
            : numeric(characterSummary.bestScore),
        recentPracticeAt: characterSummary.recentPracticeAt || null,
        recentPractice: character.recent.map((item) => ({
          id: String(item._id),
          characterId: String(item.characterId),
          simplified: item.simplified,
          score: numeric(item.score),
          createdAt: item.createdAt,
        })),
      };
      return {
        generatedAt: now,
        timezone: STUDY_TIMEZONE,
        overview: {
          activeCourses: activeCourses.length,
          completedLessons: activeCourses.reduce(
            (total, item) => total + item.completedLessons,
            0,
          ),
          totalPublishedLessons: activeCourses.reduce(
            (total, item) => total + item.totalLessons,
            0,
          ),
          savedVocabulary: srs.saved,
          dueVocabulary: srs.dueNow,
          reviewedVocabularyToday: srs.reviewedToday,
          quizAttempts: quizAnalytics.totalAttempts,
          characterAttempts: characterAnalytics.totalAttempts,
        },
        streak: buildStreakAnalytics(events, now),
        todayPlan: buildTodayPlan({
          srs,
          courses: activeCourses,
          quizLesson,
          character: recommendedCharacter,
        }),
        courses: activeCourses.map((item) => ({
          ...item,
          continueDestination: courseDestination(item),
        })),
        srs,
        quiz: quizAnalytics,
        character: characterAnalytics,
        recentActivity: serializeRecentActivity({
          lessonRows: lessons,
          quizRows: quiz.recent,
          vocabularyRows: vocabulary.recent,
          characterRows: character.recent,
        }),
      };
    },
  };
}

export const dashboardService = createDashboardService();
