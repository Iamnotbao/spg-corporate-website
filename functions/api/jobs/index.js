import { json } from '../../_shared/response';
import { jobs } from '../../_shared/jobs';
import { listJobs } from '../../_shared/repositories';

export async function onRequestGet({ env }) {
  try { return json(await listJobs(env.MONGODB_URI, jobs)); }
  catch { return json({ data: jobs, source: 'fallback', error: 'Database unavailable' }); }
}