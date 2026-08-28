import { Router } from "express";
import { auth, requireAdmin } from "../middleware/auth.js";
import { trashService } from "../features/trash/trash.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

function move(type) {
  return asyncHandler(async (req, res) => {
    const data = await trashService.move(type, req.params.id, req.user);
    return res.json({ ok: true, data });
  });
}

function bulkMove(type) {
  return asyncHandler(async (req, res) => {
    const ids = [...new Set((req.body?.ids || []).map(String).filter(Boolean))];
    if (!ids.length) return res.status(400).json({ error: "No ids provided" });
    const moved = [];
    const failures = [];
    for (const id of ids) {
      try {
        moved.push(await trashService.move(type, id, req.user));
      } catch (error) {
        failures.push({ id, message: error?.message || "Unable to move item to trash" });
      }
    }
    return res.json({ ok: failures.length === 0, data: { moved, failures } });
  });
}

router.delete("/vocabulary/:id", auth, requireAdmin, move("vocabulary"));
router.delete("/quizzes/:id", auth, requireAdmin, move("quiz"));
router.delete("/characters/:id", auth, requireAdmin, move("character"));
router.delete("/posts/:id", auth, requireAdmin, move("post"));
router.delete("/jobs/:id", auth, requireAdmin, move("job"));

router.post(
  "/characters/bulk-delete",
  auth,
  requireAdmin,
  bulkMove("character"),
);
router.post("/posts/bulk-delete", auth, requireAdmin, bulkMove("post"));
router.post("/jobs/bulk-delete", auth, requireAdmin, bulkMove("job"));

export default router;
