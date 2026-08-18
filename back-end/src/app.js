import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import adminRoutes from './routes/admin.routes.js';
import publicRoutes from './routes/public.routes.js';

dotenv.config();

const app = express();

const normalizeOrigin = (value) => {
  if (!value) return '';
  return value.trim().replace(/^=+/, '').replace(/\/$/, '');
};

const frontendUrl = normalizeOrigin(process.env.FRONTEND_URL) || 'http://localhost:5173';

app.use(cors({
  origin: frontendUrl,
  credentials: true,
}));

app.use(express.json());

app.use('/api/admin', adminRoutes);
app.use('/api', publicRoutes);

app.get('/health', (_, res) => res.json({ ok: true }));

export default app;
