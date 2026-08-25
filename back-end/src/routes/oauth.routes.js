import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import {
  oauthCallback,
  oauthStart,
  oauthStatus,
} from "../features/student-auth/social-auth.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();
const oauthLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 40,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Quá nhiều yêu cầu đăng nhập. Vui lòng thử lại sau." },
});

router.get("/oauth/status", oauthStatus);
router.get("/oauth/:provider", oauthLimiter, oauthStart);
router.get("/oauth/:provider/callback", oauthLimiter, asyncHandler(oauthCallback));

export default router;
