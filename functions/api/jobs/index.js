import { json } from '../../_shared/response';
import { jobs } from '../../_shared/jobs';

export async function onRequestGet() { return json({ data: jobs, source: 'fallback' }); }