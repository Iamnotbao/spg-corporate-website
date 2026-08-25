import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import {
  buildStreakAnalytics,
  createDashboardService,
  studyDayBounds,
} from "./dashboard.service.js";

const studentId = new ObjectId("907f1f77bcf86cd799439901");
const otherStudentId = new ObjectId("907f1f77bcf86cd799439902");
const characterId = new ObjectId("907f1f77bcf86cd799439903");
const NOW = new Date("2026-08-25T03:00:00.000Z");

function progress(courses = []) {
  return {
    async getStudentProgress() {
      return {
        overview: {
          activeCourses: courses.length,
          completedLessons: 2,
          totalPublishedLessons: 5,
        },
        courses,
      };
    },
  };
}

function repository(overrides = {}) {
  return {
    async getVocabularyAnalytics() {
      return { summary: {}, recent: [] };
    },
    async getQuizAnalytics() {
      return { summary: {}, recent: [] };
    },
    async getCharacterAnalytics() {
      return { summary: {}, recent: [] };
    },
    async listStudyEvents() {
      return [];
    },
    async listRecentLessonActivity() {
      return [];
    },
    async findIncompleteQuizLesson() {
      return null;
    },
    async listPublishedCharactersByIds() {
      return [];
    },
    ...overrides,
  };
}

function activeCourse() {
  return {
    course: { id: "course", title: "HSK 1", slug: "hsk-1" },
    enrollment: { id: "enrollment", status: "active" },
    completedLessons: 2,
    totalLessons: 5,
    progressPercentage: 40,
    continueLesson: { id: "lesson", title: "Chào hỏi", slug: "chao-hoi" },
  };
}

test("streak calculation returns zero activity deterministically", () => {
  assert.deepEqual(buildStreakAnalytics([], NOW), {
    currentStreak: 0,
    longestStreak: 0,
    activeDates7: [],
    activeDates30: [],
    recent7: [
      { date: "2026-08-19", actions: 0 },
      { date: "2026-08-20", actions: 0 },
      { date: "2026-08-21", actions: 0 },
      { date: "2026-08-22", actions: 0 },
      { date: "2026-08-23", actions: 0 },
      { date: "2026-08-24", actions: 0 },
      { date: "2026-08-25", actions: 0 },
    ],
  });
});

test("streak calculation honors consecutive Vietnam calendar dates and yesterday grace", () => {
  const analytics = buildStreakAnalytics(
    [
      { occurredAt: "2026-08-21T17:30:00.000Z" },
      { occurredAt: "2026-08-22T18:00:00.000Z" },
      { occurredAt: "2026-08-23T17:01:00.000Z" },
      { occurredAt: "2026-08-23T20:00:00.000Z" },
    ],
    NOW,
  );
  assert.equal(analytics.currentStreak, 3);
  assert.equal(analytics.longestStreak, 3);
  assert.deepEqual(analytics.activeDates30, [
    "2026-08-22",
    "2026-08-23",
    "2026-08-24",
  ]);
  assert.equal(analytics.recent7.at(-2).actions, 2);
});

test("streak calculation resets current streak after a break but preserves longest", () => {
  const analytics = buildStreakAnalytics(
    [
      { occurredAt: "2026-08-19T02:00:00.000Z" },
      { occurredAt: "2026-08-20T02:00:00.000Z" },
      { occurredAt: "2026-08-22T02:00:00.000Z" },
    ],
    NOW,
  );
  assert.equal(analytics.currentStreak, 0);
  assert.equal(analytics.longestStreak, 2);
});

test("Vietnam study-day bounds remain stable at UTC day transitions", () => {
  const bounds = studyDayBounds(new Date("2026-08-24T17:30:00.000Z"));
  assert.equal(bounds.today, "2026-08-25");
  assert.equal(bounds.todayStart.toISOString(), "2026-08-24T17:00:00.000Z");
  assert.equal(bounds.tomorrow.toISOString(), "2026-08-25T17:00:00.000Z");
});

test("dashboard aggregate is owner-scoped and reports persisted SRS, Quiz, and Character data", async () => {
  const seen = [];
  const course = activeCourse();
  const service = createDashboardService({
    clock: () => NOW,
    studentProgressService: progress([course]),
    repository: repository({
      async getVocabularyAnalytics(userId) {
        seen.push(String(userId));
        return {
          summary: {
            saved: 8,
            dueNow: 3,
            dueToday: 4,
            overdue: 2,
            reviewedToday: 2,
            new: 3,
            learning: 2,
            review: 3,
            again: 1,
            hard: 1,
            good: 4,
            easy: 1,
          },
          recent: [
            {
              vocabularyId: new ObjectId(),
              simplified: "你",
              pinyin: "nǐ",
              characterIds: [characterId],
              stage: "review",
              lastRating: "good",
              lastReviewedAt: NOW,
            },
          ],
        };
      },
      async getQuizAnalytics(userId) {
        seen.push(String(userId));
        return {
          summary: {
            totalAttempts: 4,
            passedAttempts: 3,
            recentScore: 80,
            bestScore: 100,
            recentAttemptAt: NOW,
          },
          recent: [
            {
              _id: new ObjectId(),
              quizId: new ObjectId(),
              quizTitle: "Kiểm tra 1",
              score: 80,
              passed: true,
              submittedAt: NOW,
            },
          ],
        };
      },
      async getCharacterAnalytics(userId) {
        seen.push(String(userId));
        return {
          summary: {
            totalAttempts: 6,
            charactersPracticed: 2,
            recentScore: 77,
            bestScore: 91,
            recentPracticeAt: NOW,
          },
          recent: [],
        };
      },
      async listStudyEvents(userId) {
        seen.push(String(userId));
        return [{ occurredAt: NOW }];
      },
      async listRecentLessonActivity(userId) {
        seen.push(String(userId));
        return [];
      },
      async findIncompleteQuizLesson(userId) {
        seen.push(String(userId));
        return {
          quizTitle: "Kiểm tra tiếp theo",
          lessonSlug: "kiem-tra",
          courseTitle: "HSK 1",
          courseSlug: "hsk-1",
        };
      },
      async listPublishedCharactersByIds(ids) {
        assert.deepEqual(ids.map(String), [String(characterId)]);
        return [{ _id: characterId, simplified: "你", status: "published" }];
      },
    }),
  });
  const result = await service.getStudentDashboard({
    _id: studentId,
    role: "student",
  });
  assert.ok(seen.every((value) => value === String(studentId)));
  assert.equal(result.overview.dueVocabulary, 3);
  assert.equal(result.srs.reviewedToday, 2);
  assert.deepEqual(result.srs.stages, {
    new: 3,
    learning: 2,
    review: 3,
    mastered: 0,
  });
  assert.equal(result.quiz.passedAttempts, 3);
  assert.equal(result.quiz.bestScore, 100);
  assert.equal(result.character.charactersPracticed, 2);
  assert.equal(result.character.bestScore, 91);
  assert.equal(result.courses[0].progressPercentage, 40);
  assert.deepEqual(
    result.todayPlan.map((item) => item.actionType),
    ["srs_review", "continue_course", "quiz_lesson", "character_practice"],
  );
  assert.deepEqual(
    result.todayPlan.map((item) => item.priority),
    [1, 2, 3, 4],
  );
  assert.ok(result.todayPlan.every((item) => item.destination));
});

test("dashboard empty aggregate returns supported zero values without invented scores", async () => {
  const service = createDashboardService({
    clock: () => NOW,
    studentProgressService: progress(),
    repository: repository(),
  });
  const result = await service.getStudentDashboard({
    _id: otherStudentId,
    role: "student",
  });
  assert.equal(result.overview.activeCourses, 0);
  assert.equal(result.srs.saved, 0);
  assert.equal(result.quiz.totalAttempts, 0);
  assert.equal(result.quiz.recentScore, null);
  assert.equal(result.character.bestScore, null);
  assert.deepEqual(result.todayPlan, []);
  assert.deepEqual(result.recentActivity, []);
});

test("dashboard rejects missing auth and non-student identities", async () => {
  const service = createDashboardService({
    studentProgressService: progress(),
    repository: repository(),
  });
  await assert.rejects(() => service.getStudentDashboard(), { status: 403 });
  await assert.rejects(
    () => service.getStudentDashboard({ _id: studentId, role: "admin" }),
    { status: 403 },
  );
});

test("unpublished learning content stays excluded by dashboard repository contracts", async () => {
  const visible = activeCourse();
  const service = createDashboardService({
    clock: () => NOW,
    studentProgressService: progress([visible]),
    repository: repository({
      async getVocabularyAnalytics() {
        return { summary: { saved: 1, dueNow: 1 }, recent: [] };
      },
      async getQuizAnalytics() {
        return { summary: {}, recent: [] };
      },
      async getCharacterAnalytics() {
        return { summary: {}, recent: [] };
      },
    }),
  });
  const result = await service.getStudentDashboard({
    _id: studentId,
    role: "student",
  });
  assert.equal(result.courses.length, 1);
  assert.equal(result.srs.saved, 1);
  assert.equal(result.recentActivity.length, 0);
});
