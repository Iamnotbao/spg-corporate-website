const DEFAULT_API_URL = 'http://localhost:10000/api';

function normalizeApiUrl(value) {
  const baseUrl = String(value || DEFAULT_API_URL)
    .trim()
    .replace(/\/+$/, '');

  return /\/api$/i.test(baseUrl) ? baseUrl : `${baseUrl}/api`;
}

export const API_URL = normalizeApiUrl(import.meta.env.VITE_API_URL);
export const ADMIN_TOKEN_KEY = 'mandora_admin_token';
export const STUDENT_TOKEN_KEY = 'mandora_student_token';
const LEGACY_ADMIN_TOKEN_KEY = 'spg_admin_token';

export class ApiError extends Error {
  constructor(message, status, payload = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

export function getAdminToken() {
  const token =
    localStorage.getItem(ADMIN_TOKEN_KEY) ||
    localStorage.getItem(LEGACY_ADMIN_TOKEN_KEY) ||
    '';

  if (token && !localStorage.getItem(ADMIN_TOKEN_KEY)) {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
    localStorage.removeItem(LEGACY_ADMIN_TOKEN_KEY);
  }

  return token;
}

export function setAdminToken(token) {
  if (token) {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
    localStorage.removeItem(LEGACY_ADMIN_TOKEN_KEY);
    return;
  }

  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(LEGACY_ADMIN_TOKEN_KEY);
}

export function getStudentToken() {
  return localStorage.getItem(STUDENT_TOKEN_KEY) || '';
}

export function setStudentToken(token) {
  if (token) {
    localStorage.setItem(STUDENT_TOKEN_KEY, token);
    return;
  }
  localStorage.removeItem(STUDENT_TOKEN_KEY);
}

async function parseResponse(response) {
  if (response.status === 204) return null;

  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function apiRequest(path, options = {}) {
  const { auth = false, body, headers: customHeaders = {}, ...requestOptions } = options;
  const headers = new Headers(customHeaders);
  const isFormData = body instanceof FormData;
  let requestBody = body;

  if (auth) {
    const token = auth === 'student' ? getStudentToken() : getAdminToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  if (body && !isFormData && typeof body !== 'string') {
    headers.set('Content-Type', 'application/json');
    requestBody = JSON.stringify(body);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...requestOptions,
    headers,
    body: requestBody,
  });
  const payload = await parseResponse(response);

  if (!response.ok) {
    const message =
      payload?.error || payload?.message || `Yêu cầu thất bại (${response.status})`;
    throw new ApiError(message, response.status, payload);
  }

  return payload;
}
