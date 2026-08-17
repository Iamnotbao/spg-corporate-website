import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { ObjectId } from 'mongodb';
import { getDb } from './db.js';

const app = express();
const port = process.env.PORT || 10000;
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json({ limit: '1mb' }));

function auth(req, res, next) {
  const expected = process.env.ADMIN_TOKEN;
  const provided = (req.headers.authorization || '').replace(/^Bearer\s+/, '');
  if (!expected || provided !== expected) return res.status(401).json({ error: 'Unauthorized' });
  next();
}
async function col(name) { return (await getDb()).collection(name); }
function oid(id) { return ObjectId.isValid(id) ? new ObjectId(id) : null; }
app.get('/health', async (_, res) => { try { await getDb(); res.json({ status: 'ok', database: 'connected' }); } catch (e) { res.status(503).json({ status: 'error', database: 'disconnected', error: e.message }); } });
async function publicById(name, req, res) { const id = oid(req.params.id); if (!id) return res.status(400).json({ error: 'Invalid id' }); try { const item = await (await col(name)).findOne({ _id: id, published: { $ne: false } }); if (!item) return res.status(404).json({ error: 'Not found' }); res.json({ data: item }); } catch (e) { res.status(500).json({ error: e.message }); } }
app.get('/api/jobs', async (_, res) => { try { res.json({ data: await (await col('jobs')).find({ published: { $ne: false } }).sort({ createdAt: -1 }).toArray(), source: 'mongodb' }); } catch (e) { res.status(500).json({ data: [], error: e.message }); } });
app.get('/api/posts', async (_, res) => { try { res.json({ data: await (await col('posts')).find({ published: { $ne: false } }).sort({ createdAt: -1 }).toArray(), source: 'mongodb' }); } catch (e) { res.status(500).json({ data: [], error: e.message }); } });
app.get('/api/jobs/:id', (req, res) => publicById('jobs', req, res));
app.get('/api/posts/:id', (req, res) => publicById('posts', req, res));
app.post('/api/applications', async (req, res) => { try { const { name, email, phone, position, message, cvUrl, cvName, cvType, cvSize } = req.body; if (!name || !email || !position) return res.status(400).json({ error: 'name, email and position are required' }); const result = await (await col('applications')).insertOne({ name, email, phone: phone || '', position, message: message || '', cvUrl: cvUrl || '', cvName: cvName || '', cvType: cvType || '', cvSize: cvSize || 0, createdAt: new Date() }); res.status(201).json({ ok: true, id: result.insertedId }); } catch (e) { res.status(500).json({ error: e.message }); } });
app.post('/api/admin/verify', auth, (_, res) => res.json({ ok: true }));
app.get('/api/admin/posts', auth, async (_, res) => res.json({ data: await (await col('posts')).find().sort({ createdAt: -1 }).toArray() }));
app.get('/api/admin/jobs', auth, async (_, res) => res.json({ data: await (await col('jobs')).find().sort({ createdAt: -1 }).toArray() }));
app.post('/api/admin/posts', auth, async (req, res) => { const r = await (await col('posts')).insertOne({ ...req.body, createdAt: new Date() }); res.status(201).json({ ok: true, id: r.insertedId }); });
app.post('/api/admin/jobs', auth, async (req, res) => { const r = await (await col('jobs')).insertOne({ ...req.body, createdAt: new Date() }); res.status(201).json({ ok: true, id: r.insertedId }); });
for (const type of ['posts', 'jobs']) { app.put(`/api/admin/${type}/:id`, auth, async (req, res) => { const id = oid(req.params.id); if (!id) return res.status(400).json({ error: 'Invalid id' }); const r = await (await col(type)).updateOne({ _id: id }, { $set: { ...req.body, updatedAt: new Date() } }); res.json({ ok: true, modified: r.modifiedCount }); }); app.delete(`/api/admin/${type}/:id`, auth, async (req, res) => { const id = oid(req.params.id); if (!id) return res.status(400).json({ error: 'Invalid id' }); const r = await (await col(type)).deleteOne({ _id: id }); res.json({ ok: true, deleted: r.deletedCount }); }); }
app.get('/api/admin/applications', auth, async (_, res) => res.json({ data: await (await col('applications')).find().sort({ createdAt: -1 }).toArray() }));
app.get('/api/admin/settings/logo', auth, async (_, res) => res.json({ data: await (await col('settings')).findOne({ _id: 'logo' }) }));
app.put('/api/admin/settings/logo', auth, async (req, res) => { await (await col('settings')).updateOne({ _id: 'logo' }, { $set: { url: req.body.url, updatedAt: new Date() } }, { upsert: true }); res.json({ ok: true }); });
app.listen(port, () => console.log(`SPG backend listening on ${port}`));
