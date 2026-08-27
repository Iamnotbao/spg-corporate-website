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

export default router;
