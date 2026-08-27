import { Router } from "express";
import { auth, requireAdmin } from "../middleware/auth.js";
import * as trashController from "../features/trash/trash.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.use(auth, requireAdmin);
router.get("/", asyncHandler(trashController.listTrash));
router.post("/:type/:id", asyncHandler(trashController.moveToTrash));
router.post("/:type/:id/restore", asyncHandler(trashController.restoreTrash));
router.delete("/:type/:id", asyncHandler(trashController.purgeTrash));
router.delete("/", asyncHandler(trashController.emptyTrash));

export default router;
