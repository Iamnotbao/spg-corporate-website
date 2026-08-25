import { ensureDashboardIndexes } from "../features/dashboard/dashboard.repository.js";
import { ensureAiTutorIndexes } from "../features/ai-tutor/ai-tutor.repository.js";
import { ensureStudentAuthIndexes } from "../features/student-auth/student-auth.repository.js";

export async function initializeDatabaseIndexes() {
  await Promise.all([
    ensureStudentAuthIndexes(),
    ensureDashboardIndexes(),
    ensureAiTutorIndexes(),
  ]);
}
