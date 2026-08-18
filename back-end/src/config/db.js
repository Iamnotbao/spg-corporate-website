import { MongoClient } from 'mongodb';
import { env } from './env.js';
let client; let db;
export async function getDb() { if (db) return db; if (!env.mongoUri) throw new Error('MONGODB_URI is not configured'); client = new MongoClient(env.mongoUri); await client.connect(); db = client.db(env.mongoDb); return db; }
export async function getCollection(name) { return (await getDb()).collection(name); }
