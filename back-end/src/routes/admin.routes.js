import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { auth, requireAdmin, requirePermission } from "../middleware/auth.js";
import {
  contentImportUpload,
  imageUpload,
  validateContentImportSignature,
  validateImageSignature,
} from "../middleware/upload.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import * as controller from "../controllers/admin.controller.js";
import * as accountController from "../controllers/account.controller.js";
import * as categoryController from "../controllers/category.controller.js";
import * as communicationsController from "../controllers/communications.controller.js";
import * as languageController from "../controllers/language.controller.js";
import * as chatController from "../controllers/chat.controller.js";
import * as siteProfileController from "../controllers/siteProfile.controller.js";
import * as mediaController from "../controllers/media.controller.js";
import { importContent } from "../controllers/contentImport.controller.js";
import * as learningController from "../features/learning/learning.controller.js";
import * as vocabularyController from "../features/vocabulary/vocabulary.controller.js";

const router = Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Quá nhiều lần đăng nhập. Vui lòng thử lại sau 15 phút." },
});
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 80,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Tạm thời đã vượt giới hạn upload. Vui lòng thử lại sau." },
});

router.post("/login", loginLimiter, asyncHandler(accountController.login));
router.post("/verify", loginLimiter, asyncHandler(accountController.login));

router.use(auth);
router.get("/session", accountController.session);
router.get(
  "/permissions",
  requirePermission("users.read"),
  accountController.listPermissions,
);

router.get(
  "/courses",
  requireAdmin,
  asyncHandler(learningController.listCourses),
);
router.get(
  "/courses/:id",
  requireAdmin,
  asyncHandler(learningController.getCourse),
);
router.post(
  "/courses",
  requireAdmin,
  asyncHandler(learningController.createCourse),
);
router.put(
  "/courses/:id",
  requireAdmin,
  asyncHandler(learningController.updateCourse),
);
router.delete(
  "/courses/:id",
  requireAdmin,
  asyncHandler(learningController.deleteCourse),
);

router.get("/units", requireAdmin, asyncHandler(learningController.listUnits));
router.get(
  "/units/:id",
  requireAdmin,
  asyncHandler(learningController.getUnit),
);
router.post(
  "/units",
  requireAdmin,
  asyncHandler(learningController.createUnit),
);
router.put(
  "/units/:id",
  requireAdmin,
  asyncHandler(learningController.updateUnit),
);
router.delete(
  "/units/:id",
  requireAdmin,
  asyncHandler(learningController.deleteUnit),
);

router.get(
  "/lessons",
  requireAdmin,
  asyncHandler(learningController.listLessons),
);
router.get(
  "/lessons/:id",
  requireAdmin,
  asyncHandler(learningController.getLesson),
);
router.post(
  "/lessons",
  requireAdmin,
  asyncHandler(learningController.createLesson),
);
router.put(
  "/lessons/:id",
  requireAdmin,
  asyncHandler(learningController.updateLesson),
);
router.delete(
  "/lessons/:id",
  requireAdmin,
  asyncHandler(learningController.deleteLesson),
);

router.get(
  "/vocabulary",
  requireAdmin,
  asyncHandler(vocabularyController.listAdmin),
);
router.get(
  "/vocabulary/:id",
  requireAdmin,
  asyncHandler(vocabularyController.getAdmin),
);
router.post(
  "/vocabulary",
  requireAdmin,
  asyncHandler(vocabularyController.create),
);
router.put(
  "/vocabulary/:id",
  requireAdmin,
  asyncHandler(vocabularyController.update),
);
router.delete(
  "/vocabulary/:id",
  requireAdmin,
  asyncHandler(vocabularyController.remove),
);

router.get(
  "/users",
  requirePermission("users.read"),
  asyncHandler(accountController.listUsers),
);
router.post(
  "/users",
  requirePermission("users.create"),
  asyncHandler(accountController.createUser),
);
router.put(
  "/users/:id",
  requirePermission("users.update"),
  asyncHandler(accountController.updateUser),
);
router.delete(
  "/users/:id",
  requirePermission("users.delete"),
  asyncHandler(accountController.deleteUser),
);

router.get(
  "/categories",
  requirePermission("categories.read"),
  asyncHandler(categoryController.listCategories),
);
router.post(
  "/categories",
  requirePermission("categories.create"),
  asyncHandler(categoryController.createCategory),
);
router.put(
  "/categories/:id",
  requirePermission("categories.update"),
  asyncHandler(categoryController.updateCategory),
);
router.delete(
  "/categories/:id",
  requirePermission("categories.delete"),
  asyncHandler(categoryController.deleteCategory),
);

router.get(
  "/languages",
  requirePermission("languages.read"),
  asyncHandler(languageController.listLanguages),
);
router.post(
  "/languages",
  requirePermission("languages.create"),
  asyncHandler(languageController.createLanguage),
);
router.put(
  "/languages/:id",
  requirePermission("languages.update"),
  asyncHandler(languageController.updateLanguage),
);
router.delete(
  "/languages/:id",
  requirePermission("languages.delete"),
  asyncHandler(languageController.deleteLanguage),
);

router.get(
  "/chat/settings",
  requirePermission("chat.read"),
  asyncHandler(chatController.getAdminChatSettings),
);
router.put(
  "/chat/settings",
  requirePermission("chat.settings"),
  asyncHandler(chatController.updateAdminChatSettings),
);
router.get(
  "/chat/sessions",
  requirePermission("chat.read"),
  asyncHandler(chatController.listAdminChatSessions),
);
router.get(
  "/chat/sessions/:sessionId/messages",
  requirePermission("chat.read"),
  asyncHandler(chatController.getAdminChatMessages),
);
router.post(
  "/chat/sessions/:sessionId/messages",
  requirePermission("chat.reply"),
  asyncHandler(chatController.createAdminChatMessage),
);
router.put(
  "/chat/sessions/:sessionId",
  requirePermission("chat.reply"),
  asyncHandler(chatController.updateAdminChatSession),
);

router.get(
  "/communications/banner",
  requirePermission("communications.read"),
  asyncHandler(communicationsController.getBanner),
);
router.put(
  "/communications/banner",
  requirePermission("communications.update"),
  asyncHandler(communicationsController.updateBanner),
);
router.get(
  "/communications/notifications",
  requirePermission("communications.read"),
  asyncHandler(communicationsController.listNotifications),
);
router.post(
  "/communications/notifications",
  requirePermission("communications.update"),
  asyncHandler(communicationsController.createNotification),
);
router.put(
  "/communications/notifications/:id",
  requirePermission("communications.update"),
  asyncHandler(communicationsController.updateNotification),
);
router.delete(
  "/communications/notifications/:id",
  requirePermission("communications.update"),
  asyncHandler(communicationsController.deleteNotification),
);

router.get(
  "/site-profile",
  requirePermission("settings.read"),
  asyncHandler(siteProfileController.getAdminSiteProfile),
);
router.put(
  "/site-profile",
  requirePermission("settings.update"),
  asyncHandler(siteProfileController.updateAdminSiteProfile),
);
router.get(
  "/media",
  requirePermission("media.read"),
  asyncHandler(mediaController.listMedia),
);
router.delete(
  "/media",
  requirePermission("media.delete"),
  asyncHandler(mediaController.deleteMedia),
);

router.post(
  "/uploads/images",
  uploadLimiter,
  imageUpload.single("image"),
  validateImageSignature,
  asyncHandler(controller.uploadImage),
);

for (const type of ["posts", "jobs"]) {
  router.post(
    `/${type}/import`,
    requirePermission(`${type}.import`),
    uploadLimiter,
    contentImportUpload.array("files", 20),
    validateContentImportSignature,
    asyncHandler((req, res) => importContent(type, req, res)),
  );
  router.get(
    `/${type}`,
    requirePermission(`${type}.read`),
    asyncHandler((req, res) => controller.list(type, req, res)),
  );
  router.get(
    `/${type}/:id`,
    requirePermission(`${type}.read`),
    asyncHandler((req, res) => controller.getOne(type, req, res)),
  );
  router.post(
    `/${type}`,
    requirePermission(`${type}.create`),
    asyncHandler((req, res) => controller.create(type, req, res)),
  );
  router.put(
    `/${type}/:id`,
    requirePermission(`${type}.update`),
    asyncHandler((req, res) => controller.update(type, req, res)),
  );
  router.delete(
    `/${type}/:id`,
    requirePermission(`${type}.delete`),
    asyncHandler((req, res) => controller.remove(type, req, res)),
  );
  router.post(
    `/${type}/bulk-delete`,
    requirePermission(`${type}.delete`),
    asyncHandler((req, res) => controller.bulkRemove(type, req, res)),
  );
}

router.get(
  "/applications",
  requirePermission("applications.read"),
  asyncHandler(controller.listApplications),
);
router.get(
  "/applications/:id/cv",
  requirePermission("applications.download"),
  asyncHandler(controller.downloadApplicationCv),
);
router.get(
  "/settings/logo",
  requirePermission("settings.read"),
  asyncHandler(controller.getLogo),
);
router.put(
  "/settings/logo",
  requirePermission("settings.update"),
  asyncHandler(controller.updateLogo),
);

export default router;
