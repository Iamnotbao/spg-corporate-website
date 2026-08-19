export function getItemId(item) {
  return String(item?._id?.$oid || item?._id || item?.id || '');
}

export function getItemSummary(item) {
  return (
    item?.summary || item?.excerpt || item?.description || 'Chưa có nội dung tóm tắt.'
  );
}

export function formatAdminDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function isUnauthorized(error) {
  return error?.status === 401 || error?.status === 403;
}

export function getErrorMessage(error, fallback = 'Đã có lỗi xảy ra.') {
  if (error?.name === 'AbortError') return '';
  return error?.message || fallback;
}

export function getPaginationItems(currentPage, totalPages) {
  const current = Math.max(1, Number(currentPage) || 1);
  const total = Math.max(1, Number(totalPages) || 1);

  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);

  const items = [1];
  const rangeStart = Math.max(2, current - 1);
  const rangeEnd = Math.min(total - 1, current + 1);
  if (rangeStart > 2) items.push('start-ellipsis');
  for (let page = rangeStart; page <= rangeEnd; page += 1) items.push(page);
  if (rangeEnd < total - 1) items.push('end-ellipsis');
  items.push(total);
  return items;
}

function galleryPayload(form) {
  const images = Array.isArray(form.images) ? form.images.filter(Boolean) : [];
  const imagePublicIds = Array.isArray(form.imagePublicIds)
    ? form.imagePublicIds.slice(0, images.length)
    : [];
  return { images, imagePublicIds };
}

function blockPayload(form) {
  const blocks = Array.isArray(form.contentBlocks)
    ? form.contentBlocks
        .filter((block) => block && typeof block === 'object' && block.type)
        .map((block) => {
          if (block.type === 'paragraph' || block.type === 'heading') {
            return {
              id: String(block.id || ''),
              type: block.type,
              text: String(block.text || '').trim(),
            };
          }
          if (block.type === 'image') {
            return {
              id: String(block.id || ''),
              type: 'image',
              url: String(block.url || '').trim(),
              publicId: String(block.publicId || '').trim(),
              caption: String(block.caption || '').trim(),
            };
          }
          if (block.type === 'gallery') {
            return {
              id: String(block.id || ''),
              type: 'gallery',
              layout: String(block.layout || '').trim(),
              images: Array.isArray(block.images)
                ? block.images.slice(0, 4).map((image) => ({
                    url: String(image?.url || '').trim(),
                    publicId: String(image?.publicId || '').trim(),
                    caption: String(image?.caption || '').trim(),
                  })).filter((image) => image.url)
                : [],
            };
          }
          return null;
        })
        .filter(Boolean)
    : [];

  return { contentBlocks: blocks };
}

export function normalizeContentPayload(type, form) {
  const common = {
    title: String(form.title || '').trim(),
    summary: String(form.summary || '').trim(),
    imageUrl: String(form.imageUrl || '').trim(),
    imagePublicId: String(form.imagePublicId || '').trim(),
    published: form.published !== false,
    ...galleryPayload(form),
    ...blockPayload(form),
  };

  if (type === 'posts') {
    return {
      ...common,
      category: String(form.category || 'activity').trim(),
      excerpt: common.summary,
      content: String(form.content || '').trim(),
    };
  }

  return {
    ...common,
    description: String(form.description || '').trim(),
    location: String(form.location || '').trim(),
    type: String(form.type || 'Full-time').trim(),
    salary: String(form.salary || '').trim(),
    benefits: String(form.benefits || '').trim(),
    workingHours: String(form.workingHours || '').trim(),
  };
}
