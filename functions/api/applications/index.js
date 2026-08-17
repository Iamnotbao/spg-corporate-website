import { json } from '../../_shared/response';

export async function onRequestPost({ request }) {
  try {
    const body = await request.json();
    const { jobId, name, email, phone = '', message = '' } = body;
    if (!jobId || !name || !email) return json({ error: 'jobId, name and email are required.' }, 400);
    return json({ data: { jobId, name, email, phone, message }, message: 'Application received. Database persistence will be enabled after MongoDB configuration.' }, 201);
  } catch { return json({ error: 'Invalid JSON body.' }, 400); }
}