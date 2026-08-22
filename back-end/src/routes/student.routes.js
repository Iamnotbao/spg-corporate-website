import { Router } from "express";
import * as studentLearningController from "../features/student-learning/student-learning.controller.js";
import * as vocabularyController from "../features/vocabulary/vocabulary.controller.js";
import { auth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.use(auth, requireRole("student"));
router.post("/enrollments", asyncHandler(studentLearningController.enroll));
router.get("/courses", asyncHandler(studentLearningController.listMyCourses));
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

export default router;
