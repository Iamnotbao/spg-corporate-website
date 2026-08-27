import { ensureDashboardIndexes } from "../features/dashboard/dashboard.repository.js";
import { ensureAiTutorIndexes } from "../features/ai-tutor/ai-tutor.repository.js";
import { ensureStudentAuthIndexes } from "../features/student-auth/student-auth.repository.js";
import { getCollection } from "./db.js";

export async function initializeDatabaseIndexes() {
  await Promise.all([
    ensureStudentAuthIndexes(),
    ensureDashboardIndexes(),
    ensureAiTutorIndexes(),
    getCollection("chat_sessions").then((collection) =>
      collection.createIndex({ updatedAt: -1, _id: -1 }),
    ),
    getCollection("chat_messages").then((collection) =>
      collection.createIndex({ sessionId: 1, createdAt: -1, _id: -1 }),
    ),
  ]);
}
