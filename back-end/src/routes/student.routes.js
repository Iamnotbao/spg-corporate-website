import { Router } from "express";
import * as studentLearningController from "../features/student-learning/student-learning.controller.js";
import * as vocabularyController from "../features/vocabulary/vocabulary.controller.js";
import * as quizController from "../features/quiz/quiz.controller.js";
import * as progressController from "../features/progress/progress.controller.js";
import * as characterController from "../features/character/character.controller.js";
import {
  dismissStudentNotification,
  listStudentNotifications,
  markStudentNotificationRead,
} from "../controllers/communications.controller.js";
import { auth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.use(auth, requireRole("student"));
router.post("/enrollments", asyncHandler(studentLearningController.enroll));
router.delete(
  "/enrollments/:courseId",
  asyncHandler(studentLearningController.archiveEnrollment),
);
router.get("/courses", asyncHandler(studentLearningController.listMyCourses));
router.get("/progress", asyncHandler(progressController.getStudentProgress));
router.get("/notifications", asyncHandler(listStudentNotifications));
router.put(
  "/notifications/:id/read",
  asyncHandler(markStudentNotificationRead),
);
router.delete(
  "/notifications/:id",
  asyncHandler(dismissStudentNotification),
);
router.get(
  "/courses/:identifier",
  asyncHandler(studentLearningController.getCourseState),
);
router.put(
  "/lessons/:identifier/complete",
  asyncHandler(studentLearningController.completeLesson),
);
router.get("/vocabulary", asyncHandler(vocabularyController.listSaved));
router.put("/vocabulary/:id/saved", asyncHandler(vocabularyController.save));
router.delete(
  "/vocabulary/:id/saved",
  asyncHandler(vocabularyController.unsave),
);
router.post("/quizzes/:quizId/attempts", asyncHandler(quizController.submit));
router.get(
  "/quizzes/:quizId/attempts",
  asyncHandler(quizController.listOwnAttempts),
);
router.post("/characters/:characterId/attempts", asyncHandler(characterController.submitAttempt));
router.get("/characters/:characterId/attempts/summary", asyncHandler(characterController.getAttemptSummary));
router.get("/character-attempts/:attemptId", asyncHandler(characterController.getOwnAttempt));

export default router;
