import { json } from '../../_shared/response';
import { listPosts } from '../../_shared/repositories';

export async function onRequestGet({ env }) {
  try { return json(await listPosts(env.MONGODB_URI)); }
  catch { return json({ data: [], source: 'fallback', error: 'Database unavailable' }); }
}