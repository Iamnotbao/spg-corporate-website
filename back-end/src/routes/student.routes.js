import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import * as aiTutorController from "../features/ai-tutor/ai-tutor.controller.js";
import * as studentLearningController from "../features/student-learning/student-learning.controller.js";
import * as vocabularyController from "../features/vocabulary/vocabulary.controller.js";
import * as vocabularyReviewController from "../features/vocabulary/vocabulary-review.controller.js";
import * as quizController from "../features/quiz/quiz.controller.js";
import * as progressController from "../features/progress/progress.controller.js";
import * as characterController from "../features/character/character.controller.js";
import * as dashboardController from "../features/dashboard/dashboard.controller.js";
import {
  dismissStudentNotification,
  listStudentNotifications,
  markStudentNotificationRead,
} from "../controllers/communications.controller.js";
import { auth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

const aiChatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 8,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => `student:${String(req.user?._id || "unknown")}`,
  message: {
    error: "Bạn đang gửi câu hỏi quá nhanh. Vui lòng chờ một chút.",
    code: "AI_RATE_LIMITED",
  },
});

router.use(auth, requireRole("student"));
router.post("/enrollments", asyncHandler(studentLearningController.enroll));
router.delete(
  "/enrollments/:courseId",
  asyncHandler(studentLearningController.archiveEnrollment),
);
router.get("/courses", asyncHandler(studentLearningController.listMyCourses));
router.get("/dashboard", asyncHandler(dashboardController.getStudentDashboard));
router.get("/ai/status", asyncHandler(aiTutorController.status));
router.get(
  "/ai/conversations",
  asyncHandler(aiTutorController.listConversations),
);
router.get(
  "/ai/conversations/:id/messages",
  asyncHandler(aiTutorController.listMessages),
);
router.post("/ai/chat", aiChatLimiter, asyncHandler(aiTutorController.chat));
router.get("/progress", asyncHandler(progressController.getStudentProgress));
router.get("/notifications", asyncHandler(listStudentNotifications));
router.put(
  "/notifications/:id/read",
  asyncHandler(markStudentNotificationRead),
);
router.delete("/notifications/:id", asyncHandler(dismissStudentNotification));
router.get(
  "/courses/:identifier",
  asyncHandler(studentLearningController.getCourseState),
);
router.put(
  "/lessons/:identifier/complete",
  asyncHandler(studentLearningController.completeLesson),
);
router.get("/vocabulary", asyncHandler(vocabularyController.listSaved));
router.get(
  "/vocabulary/saved-status",
  asyncHandler(vocabularyController.savedStatus),
);
router.put("/vocabulary/:id/saved", asyncHandler(vocabularyController.save));
router.delete(
  "/vocabulary/:id/saved",
  asyncHandler(vocabularyController.unsave),
);
router.get(
  "/vocabulary-review",
  asyncHandler(vocabularyReviewController.queue),
);
router.get(
  "/vocabulary-review/history",
  asyncHandler(vocabularyReviewController.history),
);
router.post(
  "/vocabulary-review/:vocabularyId",
  asyncHandler(vocabularyReviewController.review),
);
router.post("/quizzes/:quizId/attempts", asyncHandler(quizController.submit));
router.get(
  "/quizzes/:quizId/attempts",
  asyncHandler(quizController.listOwnAttempts),
);
router.post(
  "/characters/:characterId/attempts",
  asyncHandler(characterController.submitAttempt),
);
router.get(
  "/characters/:characterId/attempts/summary",
  asyncHandler(characterController.getAttemptSummary),
);
router.get(
  "/character-attempts/:attemptId",
  asyncHandler(characterController.getOwnAttempt),
);

export default router;
