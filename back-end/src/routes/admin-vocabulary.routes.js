import { Router } from "express";
import * as vocabularyController from "../features/vocabulary/vocabulary.controller.js";
import { auth, requireAdmin } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.use(auth, requireAdmin);
router.get(
  "/duplicates",
  asyncHandler(vocabularyController.analyzeDuplicates),
);
router.post(
  "/duplicates/cleanup",
  asyncHandler(vocabularyController.cleanupDuplicates),
);
router.get(
  "/lessons/:lessonId",
  asyncHandler(vocabularyController.listAdminLessonLinks),
);
router.put(
  "/lessons/:lessonId",
  asyncHandler(vocabularyController.replaceAdminLessonLinks),
);

export default router;
