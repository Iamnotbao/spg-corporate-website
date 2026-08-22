import "dotenv/config";
import app from "./app.js";
import { env, validateEnv } from "./config/env.js";

validateEnv();

app.listen(env.port, () => {
  console.log(`Mandora backend listening on ${env.port}`);
});
