import { json } from '../../_shared/response';
import { createApplication } from '../../_shared/repositories';

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const { jobId, name, email, phone = '', message = '' } = body;
    if (!jobId || !name || !email) return json({ error: 'jobId, name and email are required.' }, 400);
    const result = await createApplication(env.MONGODB_URI, { jobId, name, email, phone, message });
    return json({ ...result, message: result.source === 'mongodb' ? 'Application saved successfully.' : 'Application received in fallback mode.' }, 201);
  } catch { return json({ error: 'Invalid request body or database unavailable.' }, 400); }
}