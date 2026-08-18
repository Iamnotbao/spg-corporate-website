const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

export const api = {
  list(type, params = {}) {
    const query = new URLSearchParams(params).toString();
    return request(`/public/${type}${query ? `?${query}` : ''}`);
  },
  adminList(type, params = {}) {
    const token = localStorage.getItem('admin_token');
    const query = new URLSearchParams(params).toString();
    return request(`/admin/${type}${query ? `?${query}` : ''}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
};

export default api;
