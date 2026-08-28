import { Router } from "express";
import { auth, requireAdmin } from "../middleware/auth.js";
import { trashService } from "../features/trash/trash.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();
const adminOnly = [auth, requireAdmin];

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

router.delete("/vocabulary/:id", ...adminOnly, move("vocabulary"));
router.delete("/quizzes/:id", ...adminOnly, move("quiz"));
router.delete("/characters/:id", ...adminOnly, move("character"));
router.delete("/posts/:id", ...adminOnly, move("post"));
router.delete("/jobs/:id", ...adminOnly, move("job"));

router.post("/characters/bulk-delete", ...adminOnly, bulkMove("character"));
router.post("/posts/bulk-delete", ...adminOnly, bulkMove("post"));
router.post("/jobs/bulk-delete", ...adminOnly, bulkMove("job"));

export default router;
