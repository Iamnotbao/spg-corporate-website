import { json } from '../../_shared/response';
import { getDatabase } from '../../_shared/mongodb';

export async function onRequestGet({ env }) {
  if (!env.MONGODB_URI) return json({ status: 'ok', database: 'not_configured' });
  try { const db = await getDatabase(env.MONGODB_URI); await db.command({ ping: 1 }); return json({ status: 'ok', database: 'connected' }); }
  catch { return json({ status: 'degraded', database: 'unavailable' }, 503); }
}