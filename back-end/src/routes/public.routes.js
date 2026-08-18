import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createApplication, getPublicItem, listJobs, listPosts } from '../controllers/public.controller.js';
import { cvUpload } from '../middleware/upload.js';
const router = Router();
router.get('/jobs', asyncHandler(listJobs)); router.get('/posts', asyncHandler(listPosts)); router.get('/jobs/:id', asyncHandler((req,res) => getPublicItem('jobs',req,res))); router.get('/posts/:id', asyncHandler((req,res) => getPublicItem('posts',req,res)));
router.post('/applications', cvUpload.single('cv'), asyncHandler(async (req, res) => { if (req.file) { const { uploadCv } = await import('../utils/cloudinary.js'); const uploaded = await uploadCv(req.file); req.body.cvUrl = uploaded.url; req.body.cvName = req.file.originalname; req.body.cvType = req.file.mimetype; req.body.cvSize = req.file.size; } return createApplication(req, res); }));
export default router;
