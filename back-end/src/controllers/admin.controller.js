import jwt from 'jsonwebtoken';
import { getCollection } from '../config/db.js';
import { toObjectId } from '../utils/objectId.js';

const adminPassword = () => String(process.env.ADMIN_PASSWORD || 'admin123').trim();

export function verify(req, res) {
  const password = String(req.body?.password ?? req.body?.adminPassword ?? '').trim();
  if (!password || password !== adminPassword()) return res.status(401).json({ error: 'Invalid admin password' });

  const secret = process.env.JWT_SECRET || 'local-development-secret';
  const token = jwt.sign({ role: 'admin' }, secret, { expiresIn: '8h' });
  res.json({ ok: true, token });
}

function queryFor(type, query) {
  const filter = {};
  const search = String(query.search || '').trim();
  if (search) filter.$or = [
    { title: { $regex: search, $options: 'i' } },
    { summary: { $regex: search, $options: 'i' } },
    { description: { $regex: search, $options: 'i' } },
    { location: { $regex: search, $options: 'i' } },
  ];
  if (query.published === 'true') filter.published = { $ne: false };
  if (query.published === 'false') filter.published = false;
  if (type === 'jobs') {
    if (query.type) filter.type = query.type;
    if (query.location) filter.location = { $regex: String(query.location), $options: 'i' };
  }
  return filter;
}

export async function list(type, req, res) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 10));
  const filter = queryFor(type, req.query);
  const collection = await getCollection(type);
  const total = await collection.countDocuments(filter);
  const items = await collection.find(filter).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).toArray();
  res.json({ data: items, pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } });
}

export async function create(type, req, res) { const result = await (await getCollection(type)).insertOne({ ...req.body, createdAt: new Date() }); res.status(201).json({ ok: true, id: result.insertedId }); }
export async function update(type, req, res) { const id = toObjectId(req.params.id); if (!id) return res.status(400).json({ error: 'Invalid id' }); const result = await (await getCollection(type)).updateOne({ _id: id }, { $set: { ...req.body, updatedAt: new Date() } }); res.json({ ok: true, modified: result.modifiedCount }); }
export async function remove(type, req, res) { const id = toObjectId(req.params.id); if (!id) return res.status(400).json({ error: 'Invalid id' }); const result = await (await getCollection(type)).deleteOne({ _id: id }); res.json({ ok: true, deleted: result.deletedCount }); }
export async function bulkRemove(type, req, res) { const ids = (req.body.ids || []).map(toObjectId).filter(Boolean); if (!ids.length) return res.status(400).json({ error: 'No ids provided' }); const result = await (await getCollection(type)).deleteMany({ _id: { $in: ids } }); res.json({ ok: true, deleted: result.deletedCount }); }
export async function getOne(type, req, res) { const id = toObjectId(req.params.id); if (!id) return res.status(400).json({ error: 'Invalid id' }); const item = await (await getCollection(type)).findOne({ _id: id }); if (!item) return res.status(404).json({ error: 'Not found' }); res.json({ data: item }); }
export async function listApplications(_, res) { res.json({ data: await (await getCollection('applications')).find().sort({ createdAt: -1 }).toArray() }); }
export async function downloadApplicationCv(req, res) { const id = toObjectId(req.params.id); if (!id) return res.status(400).json({ error: 'Invalid id' }); const item = await (await getCollection('applications')).findOne({ _id: id }); if (!item) return res.status(404).json({ error: 'Application not found' }); const cvUrl = item.cvUrl || item.cv || item.resumeUrl || item.resume; if (!cvUrl) return res.status(404).json({ error: 'CV not found' }); const originalName = String(item.cvOriginalName || item.originalFilename || item.cvFilename || 'CV').trim(); const sourceName = originalName.includes('.') ? originalName : `${originalName}.pdf`; const safeName = sourceName.replace(/[^a-zA-Z0-9._-]+/g, '-'); const mime = String(item.cvMimeType || item.mimetype || 'application/pdf'); res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`); res.setHeader('Content-Type', mime); res.redirect(cvUrl); }
export async function getLogo(_, res) { res.json({ data: await (await getCollection('settings')).findOne({ _id: 'logo' }) }); }
export async function updateLogo(req, res) { await (await getCollection('settings')).updateOne({ _id: 'logo' }, { $set: { url: req.body.url, updatedAt: new Date() } }, { upsert: true }); res.json({ ok: true }); }
