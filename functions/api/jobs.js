const fallbackJobs = [
  { id: 'frontend-developer', title: 'Frontend Developer', type: 'Full-time', location: 'Ho Chi Minh City', description: 'Build accessible and reliable digital experiences with our team.' },
  { id: 'logistics-coordinator', title: 'Logistics Coordinator', type: 'Full-time', location: 'Ho Chi Minh City', description: 'Coordinate daily operations and help our partners move forward.' },
  { id: 'business-development-executive', title: 'Business Development Executive', type: 'Full-time', location: 'Ho Chi Minh City', description: 'Create meaningful partnerships and new opportunities for SPG.' }
];

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
}

export async function onRequestGet({ env }) {
  if (!env.MONGODB_URI) return json({ jobs: fallbackJobs, source: 'fallback' });
  return json({ jobs: fallbackJobs, source: 'fallback', note: 'Add a MongoDB-compatible Worker adapter before enabling database reads.' });
}
