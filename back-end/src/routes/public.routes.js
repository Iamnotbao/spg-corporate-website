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
import { addRealtimeClient } from "../utils/realtime.js";
import { cvUpload, validateCvSignature } from "../middleware/upload.js";
import { validateApplication } from "../middleware/application.js";

const router = Router();
const applicationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Đã gửi quá nhiều hồ sơ. Vui lòng thử lại sau." },
});

router.get("/jobs", asyncHandler(listJobs));
router.get("/posts", asyncHandler(listPosts));
router.get("/categories", asyncHandler(listPublicCategories));
router.get("/languages", asyncHandler(listPublicLanguages));
router.get("/communications", asyncHandler(getPublicCommunications));
router.get("/events", addRealtimeClient);
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
