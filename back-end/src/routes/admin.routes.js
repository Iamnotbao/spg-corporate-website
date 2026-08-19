import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { auth } from "../middleware/auth.js";
import {
  contentImportUpload,
  imageUpload,
  validateContentImportSignature,
  validateImageSignature,
} from "../middleware/upload.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import * as controller from "../controllers/admin.controller.js";
import { importContent } from "../controllers/contentImport.controller.js";

const router = Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Quá nhiều lần đăng nhập. Vui lòng thử lại sau 15 phút." },
});

// Login/verification must be reachable before a token exists.
router.post("/verify", loginLimiter, asyncHandler(controller.verify));

// All management endpoints below require an authenticated admin token.
router.use(auth);

router.get("/session", (_req, res) => res.json({ ok: true }));

router.post(
  "/uploads/images",
  imageUpload.single("image"),
  validateImageSignature,
  asyncHandler(controller.uploadImage),
);

for (const type of ["posts", "jobs"]) {
  router.post(
    `/${type}/import`,
    contentImportUpload.array("files", 20),
    validateContentImportSignature,
    asyncHandler((req, res) => importContent(type, req, res)),
  );
  router.get(
    `/${type}`,
    asyncHandler((req, res) => controller.list(type, req, res)),
  );
  router.get(
    `/${type}/:id`,
    asyncHandler((req, res) => controller.getOne(type, req, res)),
  );
  router.post(
    `/${type}`,
    asyncHandler((req, res) => controller.create(type, req, res)),
  );
  router.put(
    `/${type}/:id`,
    asyncHandler((req, res) => controller.update(type, req, res)),
  );
  router.delete(
    `/${type}/:id`,
    asyncHandler((req, res) => controller.remove(type, req, res)),
  );
  router.post(
    `/${type}/bulk-delete`,
    asyncHandler((req, res) => controller.bulkRemove(type, req, res)),
  );
}

router.get("/applications", asyncHandler(controller.listApplications));
router.get(
  "/applications/:id/cv",
  asyncHandler(controller.downloadApplicationCv),
);
router.get("/settings/logo", asyncHandler(controller.getLogo));
router.put("/settings/logo", asyncHandler(controller.updateLogo));

export default router;
