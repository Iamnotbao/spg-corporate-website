import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createApplication,
  getPublicItem,
  listJobs,
  listPosts,
} from "../controllers/public.controller.js";
import { getPublicCommunications } from "../controllers/communications.controller.js";
import { listPublicCategories } from "../controllers/category.controller.js";
import { listPublicLanguages } from "../controllers/language.controller.js";
import { getPublicSiteProfile } from "../controllers/siteProfile.controller.js";
import * as chatController from "../controllers/chat.controller.js";
import { addRealtimeClient } from "../utils/realtime.js";
import { cvUpload, validateCvSignature } from "../middleware/upload.js";
import { validateApplication } from "../middleware/application.js";
import * as learningController from "../features/learning/learning.controller.js";
import * as studentAuthController from "../features/student-auth/student-auth.controller.js";
import * as vocabularyController from "../features/vocabulary/vocabulary.controller.js";
import * as quizController from "../features/quiz/quiz.controller.js";
import * as characterController from "../features/character/character.controller.js";
import * as searchController from "../features/search/search.controller.js";
import { auth, requireRole } from "../middleware/auth.js";

const router = Router();
const applicationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Đã gửi quá nhiều hồ sơ. Vui lòng thử lại sau." },
});
const chatLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 80,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Bạn đang gửi tin nhắn quá nhanh. Vui lòng thử lại sau." },
});
const studentAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Quá nhiều yêu cầu xác thực. Vui lòng thử lại sau." },
});
const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 90,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Bạn đang tìm kiếm quá nhanh. Vui lòng thử lại sau." },
});

router.post(
  "/auth/register",
  studentAuthLimiter,
  asyncHandler(studentAuthController.register),
);
router.post(
  "/auth/login",
  studentAuthLimiter,
  asyncHandler(studentAuthController.login),
);
router.get(
  "/auth/session",
  auth,
  requireRole("student"),
  studentAuthController.session,
);

router.get("/jobs", asyncHandler(listJobs));
router.get("/posts", asyncHandler(listPosts));
router.get("/categories", asyncHandler(listPublicCategories));
router.get("/languages", asyncHandler(listPublicLanguages));
router.get("/communications", asyncHandler(getPublicCommunications));
router.get("/site-profile", asyncHandler(getPublicSiteProfile));
router.get("/events", addRealtimeClient);
router.get("/search", searchLimiter, asyncHandler(searchController.searchPublic));
router.get("/courses", asyncHandler(learningController.listPublishedCourses));
router.get(
  "/courses/:identifier",
  asyncHandler(learningController.getPublishedCourse),
);
router.get(
  "/lessons/:identifier",
  asyncHandler(learningController.getPublishedLesson),
);
router.get("/vocabulary", asyncHandler(vocabularyController.listPublic));
router.get("/characters", asyncHandler(characterController.listPublic));
router.post(
  "/characters/recognize",
  searchLimiter,
  asyncHandler(characterController.recognize),
);
router.get(
  "/characters/:identifier/strokes",
  asyncHandler(characterController.getStrokeData),
);
router.post(
  "/characters/:identifier/compare",
  asyncHandler(characterController.compare),
);
router.get(
  "/characters/:identifier",
  asyncHandler(characterController.getPublic),
);
router.get(
  "/lessons/:identifier/quiz",
  asyncHandler(quizController.getPublicByLesson),
);

router.get(
  "/chat/settings",
  asyncHandler(chatController.getPublicChatSettings),
);
router.post(
  "/chat/sessions",
  chatLimiter,
  asyncHandler(chatController.createChatSession),
);
router.get(
  "/chat/messages",
  chatLimiter,
  asyncHandler(chatController.getPublicMessages),
);
router.post(
  "/chat/messages",
  chatLimiter,
  asyncHandler(chatController.createPublicMessage),
);
router.get(
  "/chat/events",
  chatLimiter,
  asyncHandler(chatController.openPublicChatStream),
);

router.get(
  "/jobs/:id",
  asyncHandler((req, res) => getPublicItem("jobs", req, res)),
);
router.get(
  "/posts/:id",
  asyncHandler((req, res) => getPublicItem("posts", req, res)),
);
router.post(
  "/applications",
  applicationLimiter,
  cvUpload.single("cv"),
  validateCvSignature,
  validateApplication,
  asyncHandler(async (req, res) => {
    if (req.file) {
      const { uploadCv } = await import("../utils/cloudinary.js");
      const uploaded = await uploadCv(req.file);

      req.body.cvUrl = uploaded.secure_url || uploaded.url;
      req.body.cvName = req.file.originalname;
      req.body.cvType = req.file.mimetype;
      req.body.cvSize = req.file.size;
      req.body.cvPublicId = uploaded.public_id;
      req.body.cvFormat =
        uploaded.format ||
        req.file.originalname.split(".").pop()?.toLowerCase() ||
        "";
      req.body.cvResourceType = uploaded.resource_type;
      req.body.cvDeliveryType = uploaded.type || "authenticated";
    }

    return createApplication(req, res);
  }),
);

export default router;
