import { env } from '../config/env.js';
export function auth(req, res, next) { const provided = (req.headers.authorization || '').replace(/^Bearer\s+/, ''); if (!env.adminToken || provided !== env.adminToken) return res.status(401).json({ error: 'Unauthorized' }); next(); }
