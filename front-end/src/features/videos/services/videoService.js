import { apiRequest } from '../../../services/httpClient.js';
export function listVideos(options = {}) {
  const params = new URLSearchParams({ page: String(options.page || 1), pageSize: String(options.pageSize || 9) });
  if (options.hskLevel) params.set('hskLevel', options.hskLevel);
  if (options.featured) params.set('featured', 'true');
  return apiRequest(`/videos?${params}`, { signal: options.signal });
}
