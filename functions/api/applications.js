function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
}

export async function onRequestPost({ request }) {
  try {
    const body = await request.json();
    const { jobId, name, email, phone, message } = body;
    if (!jobId || !name || !email) return json({ error: 'jobId, name and email are required.' }, 400);
    return json({ ok: true, message: 'Application received. Connect MongoDB to persist applications.', application: { jobId, name, email, phone: phone || '', message: message || '' } }, 201);
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }
}
