import {
  ADMIN_TOKEN_KEY,
  API_URL,
  ApiError,
  apiRequest,
  getAdminToken,
  setAdminToken,
} from './httpClient.js';

const CONTENT_TYPES = new Set(['posts', 'jobs']);
const LEARNING_TYPES = new Set(['courses', 'units', 'lessons']);

function assertContentType(type) {
  if (!CONTENT_TYPES.has(type)) {
    throw new Error(`Loại nội dung không hợp lệ: ${type}`);
  }
}

function assertLearningType(type) {
  if (!LEARNING_TYPES.has(type)) {
    throw new Error(`Loại nội dung học tập không hợp lệ: ${type}`);
  }
}

export { ADMIN_TOKEN_KEY, getAdminToken, setAdminToken };

export async function loginAdmin(username, password) {
  const payload = await apiRequest('/admin/login', {
    method: 'POST',
    body: { username, password },
  });

  if (!payload?.token) throw new Error('Máy chủ không trả về phiên đăng nhập.');
  setAdminToken(payload.token);
  return payload;
}

export async function verifyAdminSession(options = {}) {
  return apiRequest('/admin/session', {
    method: 'GET',
    auth: true,
    signal: options.signal,
  });
}

export async function listAdminUsers(options = {}) {
  const params = new URLSearchParams({
    page: String(options.page || 1),
    pageSize: String(options.pageSize || 10),
  });
  if (options.search) params.set('search', options.search);
  if (options.role) params.set('role', options.role);

  return apiRequest(`/admin/users?${params.toString()}`, {
    method: 'GET',
    auth: true,
    signal: options.signal,
  });
}

export async function createAdminUser(payload) {
  return apiRequest('/admin/users', {
    method: 'POST',
    auth: true,
    body: payload,
  });
}

export async function updateAdminUser(id, payload) {
  return apiRequest(`/admin/users/${encodeURIComponent(id)}`, {
    method: 'PUT',
    auth: true,
    body: payload,
  });
}

export async function deleteAdminUser(id) {
  return apiRequest(`/admin/users/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    auth: true,
  });
}

export function listAdminLearning(type, options = {}) {
  assertLearningType(type);
  const params = new URLSearchParams();
  if (options.courseId) params.set('courseId', options.courseId);
  if (options.unitId) params.set('unitId', options.unitId);
  const query = params.toString();
  return apiRequest(`/admin/${type}${query ? `?${query}` : ''}`, {
    method: 'GET',
    auth: true,
    signal: options.signal,
  });
}

export function listAdminLessonOptions(options = {}) {
  const params = new URLSearchParams({
    page: String(options.page || 1),
    pageSize: String(options.pageSize || 8),
  });
  if (options.search) params.set('search', options.search);
  if (options.unitId) params.set('unitId', options.unitId);
  return apiRequest(`/admin/lesson-options?${params.toString()}`, {
    method: 'GET',
    auth: true,
    signal: options.signal,
  });
}

export function createAdminLearning(type, payload) {
  assertLearningType(type);
  return apiRequest(`/admin/${type}`, {
    method: 'POST',
    auth: true,
    body: payload,
  });
}

export function updateAdminLearning(type, id, payload) {
  assertLearningType(type);
  return apiRequest(`/admin/${type}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    auth: true,
    body: payload,
  });
}

export function deleteAdminLearning(type, id) {
  assertLearningType(type);
  return apiRequest(`/admin/${type}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    auth: true,
  });
}

export function getAdminLearningSummary(options = {}) {
  return apiRequest('/admin/reports/learning-summary', {
    auth: true,
    signal: options.signal,
  });
}

export function listAdminProgress(options = {}) {
  const params = new URLSearchParams({
    page: String(options.page || 1),
    pageSize: String(options.pageSize || 10),
  });
  if (options.search) params.set('search', options.search);
  if (options.courseId) params.set('courseId', options.courseId);
  if (options.status) params.set('status', options.status);
  return apiRequest(`/admin/reports/progress?${params.toString()}`, {
    auth: true,
    signal: options.signal,
  });
}

export async function getAdminBanner(options = {}) {
  return apiRequest('/admin/communications/banner', {
    method: 'GET',
    auth: true,
    signal: options.signal,
  });
}

export async function updateAdminBanner(payload) {
  return apiRequest('/admin/communications/banner', {
    method: 'PUT',
    auth: true,
    body: payload,
  });
}

export async function listAdminNotifications(options = {}) {
  const params = new URLSearchParams({
    page: String(options.page || 1),
    pageSize: String(options.pageSize || 10),
  });
  if (options.search) params.set('search', options.search);
  if (options.published !== '' && options.published != null) {
    params.set('published', String(options.published));
  }

  return apiRequest(`/admin/communications/notifications?${params.toString()}`, {
    method: 'GET',
    auth: true,
    signal: options.signal,
  });
}

export async function createAdminNotification(payload) {
  return apiRequest('/admin/communications/notifications', {
    method: 'POST',
    auth: true,
    body: payload,
  });
}

export async function updateAdminNotification(id, payload) {
  return apiRequest(`/admin/communications/notifications/${encodeURIComponent(id)}`, {
    method: 'PUT',
    auth: true,
    body: payload,
  });
}

export async function deleteAdminNotification(id) {
  return apiRequest(`/admin/communications/notifications/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    auth: true,
  });
}

export async function listAdminContent(type, options = {}) {
  assertContentType(type);
  const params = new URLSearchParams({
    page: String(options.page || 1),
    pageSize: String(options.pageSize || 10),
  });

  if (options.search) params.set('search', options.search);
  if (options.published !== '' && options.published != null) {
    params.set('published', String(options.published));
  }
  if (type === 'posts' && options.category) params.set('category', options.category);
  if (type === 'jobs' && options.jobType) params.set('type', options.jobType);
  if (type === 'jobs' && options.location) {
    params.set('location', options.location);
  }

  return apiRequest(`/admin/${type}?${params.toString()}`, {
    method: 'GET',
    auth: true,
    signal: options.signal,
  });
}

export async function createAdminContent(type, payload) {
  assertContentType(type);
  return apiRequest(`/admin/${type}`, {
    method: 'POST',
    auth: true,
    body: payload,
  });
}

export async function updateAdminContent(type, id, payload) {
  assertContentType(type);
  return apiRequest(`/admin/${type}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    auth: true,
    body: payload,
  });
}

export async function deleteAdminContent(type, id) {
  assertContentType(type);
  return apiRequest(`/admin/${type}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    auth: true,
  });
}

export async function bulkDeleteAdminContent(type, ids) {
  assertContentType(type);
  return apiRequest(`/admin/${type}/bulk-delete`, {
    method: 'POST',
    auth: true,
    body: { ids },
  });
}

export async function importAdminContent(type, files, commit = false) {
  assertContentType(type);
  const formData = new FormData();
  for (const file of files) formData.append('files', file);
  formData.append('commit', String(Boolean(commit)));

  const payload = await apiRequest(`/admin/${type}/import`, {
    method: 'POST',
    auth: true,
    body: formData,
  });

  if (!payload?.data) throw new Error('Máy chủ không trả về kết quả import.');
  return payload.data;
}

export async function listAdminApplications(options = {}) {
  const params = new URLSearchParams({
    page: String(options.page || 1),
    pageSize: String(options.pageSize || 10),
  });
  if (options.search) params.set('search', options.search);

  return apiRequest(`/admin/applications?${params.toString()}`, {
    auth: true,
    signal: options.signal,
  });
}

export async function uploadAdminImage(file, folder = 'mandora/content') {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('folder', folder);
  const payload = await apiRequest('/admin/uploads/images', {
    method: 'POST',
    auth: true,
    body: formData,
  });

  if (!payload?.data?.url) throw new Error('Máy chủ không trả về URL ảnh.');
  return payload.data;
}

function filenameFromDisposition(disposition) {
  if (!disposition) return '';
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return '';
    }
  }
  return disposition.match(/filename="?([^";]+)"?/i)?.[1] || '';
}

function safeDownloadFilename(value, mime = '') {
  const extensionByMime = {
    'application/msword': 'doc',
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  };
  const extension = extensionByMime[String(mime).split(';', 1)[0].toLowerCase()] || 'pdf';
  const safeName = String(value || 'ung-vien-CV')
    .replace(/\\/g, '/')
    .split('/')
    .pop()
    .replace(/[\p{Cc}\\/:*?"<>|]+/gu, '-')
    .replace(/[. ]+$/g, '')
    .trim();

  return /\.(pdf|doc|docx)$/i.test(safeName)
    ? safeName
    : `${safeName || 'ung-vien-CV'}.${extension}`;
}

export async function downloadAdminApplicationCv(id) {
  const token = getAdminToken();
  const response = await fetch(
    `${API_URL}/admin/applications/${encodeURIComponent(id)}/cv`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  );

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new ApiError(payload?.error || 'Không thể tải CV.', response.status, payload);
  }

  const blob = await response.blob();
  const filename = safeDownloadFilename(
    filenameFromDisposition(response.headers.get('Content-Disposition')),
    blob.type,
  );
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
}
