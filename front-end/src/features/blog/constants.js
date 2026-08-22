export const BLOG_CATEGORIES = [
  { slug: 'hoc-tieng-trung', label: 'Học tiếng Trung' },
  { slug: 'hsk', label: 'HSK' },
  { slug: 'tu-vung', label: 'Từ vựng' },
  { slug: 'ngu-phap', label: 'Ngữ pháp' },
  { slug: 'han-tu', label: 'Hán tự' },
  { slug: 'van-hoa', label: 'Văn hóa' },
  { slug: 'kinh-nghiem-hoc-tap', label: 'Kinh nghiệm học tập' },
];

const CATEGORY_LABELS = Object.fromEntries(
  BLOG_CATEGORIES.map((item) => [item.slug, item.label]),
);

export function getBlogCategorySlug(post) {
  return String(post?.category?.slug || post?.category || '').trim();
}

export function getBlogCategoryLabel(post) {
  const slug = getBlogCategorySlug(post);
  return CATEGORY_LABELS[slug] || slug;
}

export function isMandoraPost(post) {
  return Boolean(CATEGORY_LABELS[getBlogCategorySlug(post)]);
}
