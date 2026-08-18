import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

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

export default app;
