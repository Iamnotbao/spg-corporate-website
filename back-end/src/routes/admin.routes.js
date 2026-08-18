import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as controller from '../controllers/admin.controller.js';

const router = Router();

// Login/verification must be reachable before a token exists.
router.post('/verify', asyncHandler(controller.verify));

// All management endpoints below require an authenticated admin token.
router.use(auth);

for (const type of ['posts', 'jobs']) {
  router.get(`/${type}`, asyncHandler((req, res) => controller.list(type, req, res)));
  router.get(`/${type}/:id`, asyncHandler((req, res) => controller.getOne(type, req, res)));
  router.post(`/${type}`, asyncHandler((req, res) => controller.create(type, req, res)));
  router.put(`/${type}/:id`, asyncHandler((req, res) => controller.update(type, req, res)));
  router.delete(`/${type}/:id`, asyncHandler((req, res) => controller.remove(type, req, res)));
  router.post(`/${type}/bulk-delete`, asyncHandler((req, res) => controller.bulkRemove(type, req, res)));
}

router.get('/applications', asyncHandler(controller.listApplications));
router.get('/applications/:id/cv', asyncHandler(controller.downloadApplicationCv));
router.get('/settings/logo', asyncHandler(controller.getLogo));
router.put('/settings/logo', asyncHandler(controller.updateLogo));

export default router;
