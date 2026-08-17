import { MongoClient } from 'mongodb';

let clientPromise;

export function getMongoClient(uri) {
  if (!uri) return null;
  if (!clientPromise) {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
    clientPromise = client.connect();
  }
  return clientPromise;
}

export async function getDatabase(uri) {
  const clientPromise = getMongoClient(uri);
  if (!clientPromise) return null;
  const client = await clientPromise;
  return client.db('spg');
}