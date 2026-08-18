import { adminApplications as fetchApplications, downloadApplicationCv } from '../api.js';

export async function getApplications() {
  const response = await fetchApplications();
  return Array.isArray(response?.data) ? response.data : [];
}

export async function downloadCv(applicationId) {
  if (!applicationId) throw new Error('Thiếu mã hồ sơ ứng tuyển');
  return downloadApplicationCv(applicationId);
}
