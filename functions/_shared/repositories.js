import { getDatabase } from './mongodb';

export async function listJobs(uri, fallback) {
  const db = await getDatabase(uri);
  if (!db) return { data: fallback, source: 'fallback' };
  const data = await db.collection('jobs').find({ isPublished: { $ne: false } }).sort({ createdAt: -1 }).toArray();
  return { data, source: 'mongodb' };
}

export async function listPosts(uri) {
  const db = await getDatabase(uri);
  if (!db) return { data: [], source: 'fallback' };
  const data = await db.collection('posts').find({ status: 'published' }).sort({ publishedAt: -1 }).toArray();
  return { data, source: 'mongodb' };
}

export async function createApplication(uri, application) {
  const db = await getDatabase(uri);
  if (!db) return { data: application, source: 'fallback' };
  const result = await db.collection('applications').insertOne({ ...application, createdAt: new Date(), status: 'new' });
  return { data: { ...application, id: result.insertedId.toString() }, source: 'mongodb' };
}