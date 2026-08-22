import { Router } from "express";
import * as studentLearningController from "../features/student-learning/student-learning.controller.js";
import * as vocabularyController from "../features/vocabulary/vocabulary.controller.js";
import * as quizController from "../features/quiz/quiz.controller.js";
import * as progressController from "../features/progress/progress.controller.js";
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

export default router;
