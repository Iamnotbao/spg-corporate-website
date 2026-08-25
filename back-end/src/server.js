import "dotenv/config";
import app from "./app.js";
import { closeDb } from "./config/db.js";
import { env, validateEnv } from "./config/env.js";
import { initializeDatabaseIndexes } from "./config/indexes.js";

validateEnv();

await initializeDatabaseIndexes();

const server = app.listen(env.port, () => {
  console.log(`Mandora backend listening on ${env.port}`);
});

async function shutdown(signal) {
  console.log(`${signal} received; shutting down Mandora backend.`);
  server.close(async () => {
    await closeDb().catch(() => undefined);
    process.exit(0);
  });
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
