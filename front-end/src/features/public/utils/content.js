export function getContentId(item) {
  return item?._id?.$oid || item?._id || item?.id || '';
}

export function normalizeCollection(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

export function normalizeDetail(payload) {
  return payload?.data || payload || null;
}

export function getContentImages(item) {
  const images = [item?.imageUrl, ...(item?.images || []), ...(item?.imageUrls || [])];
  return [...new Set(images.filter(Boolean))];
}

export function formatPublishedDate(value) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function getExcerpt(item, fallback) {
  return item?.summary || item?.excerpt || item?.description || fallback;
}
