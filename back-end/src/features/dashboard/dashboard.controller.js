import { dashboardService } from "./dashboard.service.js";

export async function getStudentDashboard(req, res) {
  res.json({ data: await dashboardService.getStudentDashboard(req.user) });
}
