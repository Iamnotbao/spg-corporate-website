import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import publicRoutes from './routes/public.routes.js';
import adminRoutes from './routes/admin.routes.js';
import { health } from './controllers/health.controller.js';
const app = express(); app.use(cors({ origin: env.frontendUrl })); app.use(express.json({ limit: '1mb' })); app.get('/health', health); app.use('/api', publicRoutes); app.use('/api/admin', adminRoutes); app.use((error, _, res, __) => { const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 500; res.status(status).json({ error: status === 413 ? 'CV file must be 5MB or smaller' : error.message }); }); export default app;
