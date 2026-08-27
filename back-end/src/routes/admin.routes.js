import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { auth, requireAdmin, requirePermission } from "../middleware/auth.js";
import {
  contentImportUpload,
  imageUpload,
  videoUpload,
  validateContentImportSignature,
  validateImageSignature,
  validateVideoSignature,
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
import * as quizController from "../features/quiz/quiz.controller.js";
import * as progressController from "../features/progress/progress.controller.js";
import * as characterController from "../features/character/character.controller.js";
import * as hskExamController from "../features/hsk-exam/hsk-exam.controller.js";
import * as videoController from "../features/video/video.controller.js";

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

router.get("/hsk-mock-exams", requireAdmin, asyncHandler(hskExamController.listAdmin));
router.get("/hsk-mock-exams/:id", requireAdmin, asyncHandler(hskExamController.getAdmin));
router.post("/hsk-mock-exams", requireAdmin, asyncHandler(hskExamController.createExam));
router.put("/hsk-mock-exams/:id", requireAdmin, asyncHandler(hskExamController.updateExam));
router.delete("/hsk-mock-exams/:id", requireAdmin, asyncHandler(hskExamController.deleteExam));
router.post("/hsk-mock-exams/:examId/sections", requireAdmin, asyncHandler(hskExamController.createSection));
router.put("/hsk-mock-sections/:id", requireAdmin, asyncHandler(hskExamController.updateSection));
router.delete("/hsk-mock-sections/:id", requireAdmin, asyncHandler(hskExamController.deleteSection));
router.post("/hsk-mock-sections/:sectionId/questions", requireAdmin, asyncHandler(hskExamController.createQuestion));
router.put("/hsk-mock-questions/:id", requireAdmin, asyncHandler(hskExamController.updateQuestion));
router.delete("/hsk-mock-questions/:id", requireAdmin, asyncHandler(hskExamController.deleteQuestion));
router.get("/videos", requireAdmin, asyncHandler(videoController.listAdmin));
router.get("/videos/:id", requireAdmin, asyncHandler(videoController.getAdmin));
router.post("/videos", requireAdmin, asyncHandler(videoController.create));
router.put("/videos/:id", requireAdmin, asyncHandler(videoController.update));
router.delete("/videos/:id", requireAdmin, asyncHandler(videoController.remove));

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
  "/course-options",
  requireAdmin,
  asyncHandler(learningController.listCourseOptions),
);
router.get(
  "/unit-options",
  requireAdmin,
  asyncHandler(learningController.listUnitOptions),
);
router.get(
  "/lesson-options",
  requireAdmin,
  asyncHandler(learningController.listLessonOptions),
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
router.post(
  "/vocabulary/import",
  requireAdmin,
  asyncHandler(vocabularyController.importBatch),
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

router.get("/characters", requireAdmin, asyncHandler(characterController.listAdmin));
router.post("/characters/bulk-status", requireAdmin, asyncHandler(characterController.bulkStatus));
router.post("/characters/bulk-delete", requireAdmin, asyncHandler(characterController.bulkDelete));
router.get("/characters/:id", requireAdmin, asyncHandler(characterController.getAdmin));
router.post("/characters", requireAdmin, asyncHandler(characterController.create));
router.put("/characters/:id", requireAdmin, asyncHandler(characterController.update));
router.delete("/characters/:id", requireAdmin, asyncHandler(characterController.remove));

router.get("/quizzes", requireAdmin, asyncHandler(quizController.listAdmin));
router.get("/quizzes/:id", requireAdmin, asyncHandler(quizController.getAdmin));
router.post("/quizzes", requireAdmin, asyncHandler(quizController.createQuiz));
router.put(
  "/quizzes/:id",
  requireAdmin,
  asyncHandler(quizController.updateQuiz),
);
router.delete(
  "/quizzes/:id",
  requireAdmin,
  asyncHandler(quizController.deleteQuiz),
);
router.post(
  "/quizzes/:quizId/questions",
  requireAdmin,
  asyncHandler(quizController.createQuestion),
);
router.put(
  "/quiz-questions/:id",
  requireAdmin,
  asyncHandler(quizController.updateQuestion),
);
router.delete(
  "/quiz-questions/:id",
  requireAdmin,
  asyncHandler(quizController.deleteQuestion),
);

router.get(
  "/reports/learning-summary",
  requireAdmin,
  asyncHandler(progressController.getAdminSummary),
);
router.get(
  "/reports/progress",
  requireAdmin,
  asyncHandler(progressController.listAdminProgress),
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
  "/communications/banner",
  requireAdmin,
  asyncHandler(communicationsController.getBanner),
);
router.put(
  "/communications/banner",
  requireAdmin,
  asyncHandler(communicationsController.updateBanner),
);
router.get(
  "/communications/notifications",
  requireAdmin,
  asyncHandler(communicationsController.listNotifications),
);
router.post(
  "/communications/notifications",
  requireAdmin,
  asyncHandler(communicationsController.createNotification),
);
router.put(
  "/communications/notifications/:id",
  requireAdmin,
  asyncHandler(communicationsController.updateNotification),
);
router.delete(
  "/communications/notifications/:id",
  requireAdmin,
  asyncHandler(communicationsController.deleteNotification),
);

router.get(
  "/languages",
  requireAdmin,
  asyncHandler(languageController.listLanguages),
);
router.post(
  "/languages",
  requireAdmin,
  asyncHandler(languageController.createLanguage),
);
router.put(
  "/languages/:id",
  requireAdmin,
  asyncHandler(languageController.updateLanguage),
);
router.delete(
  "/languages/:id",
  requireAdmin,
  asyncHandler(languageController.deleteLanguage),
);

router.get("/chat", requireAdmin, asyncHandler(chatController.listAdminChatSessions));
router.get("/chat/config", requireAdmin, asyncHandler(chatController.getAdminChatSettings));
router.put("/chat/config", requireAdmin, asyncHandler(chatController.updateAdminChatSettings));
router.get(
  "/chat/:sessionId",
  requireAdmin,
  asyncHandler(chatController.getAdminChatMessages),
);
router.post(
  "/chat/:sessionId/reply",
  requireAdmin,
  asyncHandler(chatController.createAdminChatMessage),
);
router.put(
  "/chat/:sessionId/status",
  requireAdmin,
  asyncHandler(chatController.updateAdminChatSession),
);

router.get(
  "/site-profile",
  requireAdmin,
  asyncHandler(siteProfileController.getAdminSiteProfile),
);
router.put(
  "/site-profile",
  requireAdmin,
  asyncHandler(siteProfileController.updateAdminSiteProfile),
);

router.get("/media", requireAdmin, asyncHandler(mediaController.listMedia));
router.delete("/media/:id", requireAdmin, asyncHandler(mediaController.deleteMedia));

router.post(
  "/uploads/images",
  requireAdmin,
  uploadLimiter,
  imageUpload.single("image"),
  validateImageSignature,
  asyncHandler(controller.uploadImage),
);

router.post(
  "/uploads/videos",
  requireAdmin,
  uploadLimiter,
  videoUpload.single("video"),
  validateVideoSignature,
  asyncHandler(controller.uploadVideo),
);

router.post(
  "/posts/import",
  requireAdmin,
  contentImportUpload.array("files", 12),
  validateContentImportSignature,
  asyncHandler(importContent),
);
router.post(
  "/jobs/import",
  requireAdmin,
  contentImportUpload.array("files", 12),
  validateContentImportSignature,
  asyncHandler(importContent),
);

router.get("/posts", requireAdmin, asyncHandler(controller.listPosts));
router.get("/posts/:id", requireAdmin, asyncHandler(controller.getPost));
router.post("/posts", requireAdmin, asyncHandler(controller.createPost));
router.put("/posts/:id", requireAdmin, asyncHandler(controller.updatePost));
router.delete("/posts/:id", requireAdmin, asyncHandler(controller.deletePost));
router.post("/posts/bulk-delete", requireAdmin, asyncHandler(controller.bulkDeletePosts));

router.get("/jobs", requireAdmin, asyncHandler(controller.listJobs));
router.get("/jobs/:id", requireAdmin, asyncHandler(controller.getJob));
router.post("/jobs", requireAdmin, asyncHandler(controller.createJob));
router.put("/jobs/:id", requireAdmin, asyncHandler(controller.updateJob));
router.delete("/jobs/:id", requireAdmin, asyncHandler(controller.deleteJob));
router.post("/jobs/bulk-delete", requireAdmin, asyncHandler(controller.bulkDeleteJobs));

router.get(
  "/applications",
  requireAdmin,
  asyncHandler(controller.listApplications),
);
router.get(
  "/applications/:id/cv",
  requireAdmin,
  asyncHandler(controller.downloadApplicationCv),
);

export default router;
