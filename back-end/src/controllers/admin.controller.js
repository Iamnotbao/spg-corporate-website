import { getCollection } from '../config/db.js';
import { toObjectId } from '../utils/objectId.js';
export function verify(_, res) { res.json({ ok: true }); }
export async function list(type, _, res) { res.json({ data: await (await getCollection(type)).find().sort({ createdAt: -1 }).toArray() }); }
export async function create(type, req, res) { const result = await (await getCollection(type)).insertOne({ ...req.body, createdAt: new Date() }); res.status(201).json({ ok: true, id: result.insertedId }); }
export async function update(type, req, res) { const id = toObjectId(req.params.id); if (!id) return res.status(400).json({ error: 'Invalid id' }); const result = await (await getCollection(type)).updateOne({ _id: id }, { $set: { ...req.body, updatedAt: new Date() } }); res.json({ ok: true, modified: result.modifiedCount }); }
export async function remove(type, req, res) { const id = toObjectId(req.params.id); if (!id) return res.status(400).json({ error: 'Invalid id' }); const result = await (await getCollection(type)).deleteOne({ _id: id }); res.json({ ok: true, deleted: result.deletedCount }); }
export async function listApplications(_, res) { res.json({ data: await (await getCollection('applications')).find().sort({ createdAt: -1 }).toArray() }); }
export async function getLogo(_, res) { res.json({ data: await (await getCollection('settings')).findOne({ _id: 'logo' }) }); }
export async function updateLogo(req, res) { await (await getCollection('settings')).updateOne({ _id: 'logo' }, { $set: { url: req.body.url, updatedAt: new Date() } }, { upsert: true }); res.json({ ok: true }); }
