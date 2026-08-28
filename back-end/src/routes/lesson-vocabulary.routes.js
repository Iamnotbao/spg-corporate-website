import { Router } from "express";
import * as vocabularyController from "../features/vocabulary/vocabulary.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get(
  "/:lessonId",
  asyncHandler(vocabularyController.listPublicForLesson),
);

export default router;
