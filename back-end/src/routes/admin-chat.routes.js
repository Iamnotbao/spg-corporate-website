import { Router } from "express";
import * as chatController from "../controllers/chat.controller.js";
import { auth, requireAdmin } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.use(auth, requireAdmin);

router.get("/settings", asyncHandler(chatController.getAdminChatSettings));
router.put("/settings", asyncHandler(chatController.updateAdminChatSettings));

router.get("/sessions", asyncHandler(chatController.listAdminChatSessions));
router.get(
  "/sessions/:sessionId/messages",
  asyncHandler(chatController.getAdminChatMessages),
);
router.post(
  "/sessions/:sessionId/messages",
  asyncHandler(chatController.createAdminChatMessage),
);
router.put(
  "/sessions/:sessionId",
  asyncHandler(chatController.updateAdminChatSession),
);

export default router;
