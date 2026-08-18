const DEFAULT_API_URL = 'http://localhost:10000/api';

function normalizeApiUrl(value) {
  const baseUrl = String(value || DEFAULT_API_URL)
    .trim()
    .replace(/\/+$/, '');

  return /\/api$/i.test(baseUrl) ? baseUrl : `${baseUrl}/api`;
}

export const API_URL = normalizeApiUrl(import.meta.env.VITE_API_URL);
export const ADMIN_TOKEN_KEY = 'spg_admin_token';

export class ApiError extends Error {
  constructor(message, status, payload = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

export function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY) || '';
}

export function setAdminToken(token) {
  if (token) {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
    return;
  }

  localStorage.removeItem(ADMIN_TOKEN_KEY);
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
    const token = getAdminToken();
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
