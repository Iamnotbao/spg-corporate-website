import { MongoClient } from "mongodb";
import { env } from "./env.js";

let client;
let db;
let connectionPromise;

export async function getDb() {
  if (db) return db;

  if (!env.mongoUri) {
    throw new Error("MONGODB_URI is not configured");
  }

  if (!connectionPromise) {
    const nextClient = new MongoClient(env.mongoUri);

    connectionPromise = nextClient
      .connect()
      .then(() => {
        client = nextClient;
        db = client.db(env.mongoDb);
        return db;
      })
      .catch(async (error) => {
        connectionPromise = null;
        await nextClient.close().catch(() => undefined);
        throw error;
      });
  }

  return connectionPromise;
}

export async function getCollection(name) {
  return (await getDb()).collection(name);
}

export async function closeDb() {
  if (client) await client.close();
  client = undefined;
  db = undefined;
  connectionPromise = undefined;
}
