import { getDb } from '../config/db.js';
export async function health(_, res) { try { await getDb(); res.json({ status: 'ok', database: 'connected' }); } catch (error) { res.status(503).json({ status: 'error', database: 'disconnected', error: error.message }); } }
