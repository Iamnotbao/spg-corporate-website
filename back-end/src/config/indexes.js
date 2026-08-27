import { ensureDashboardIndexes } from "../features/dashboard/dashboard.repository.js";
import { ensureAiTutorIndexes } from "../features/ai-tutor/ai-tutor.repository.js";
import { ensureStudentAuthIndexes } from "../features/student-auth/student-auth.repository.js";
import { getCollection } from "./db.js";
import { ensureHskExamIndexes } from "../features/hsk-exam/hsk-exam.repository.js";
import { ensureVideoIndexes } from "../features/video/video.repository.js";

export async function initializeDatabaseIndexes() {
  await Promise.all([
    ensureStudentAuthIndexes(),
    ensureDashboardIndexes(),
    ensureAiTutorIndexes(),
    ensureHskExamIndexes(),
    ensureVideoIndexes(),
    getCollection("chat_sessions").then((collection) =>
      collection.createIndex({ updatedAt: -1, _id: -1 }),
    ),
    getCollection("chat_messages").then((collection) =>
      collection.createIndex({ sessionId: 1, createdAt: -1, _id: -1 }),
    ),
  ]);
}
