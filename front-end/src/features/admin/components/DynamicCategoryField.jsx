import { useEffect, useState } from 'react';
import { getPublicCategories } from '../../../services/categoryService.js';
import { NEWS_CATEGORIES } from '../constants.js';

const FALLBACK = NEWS_CATEGORIES.map((item) => ({ slug: item.value, name: item.label }));

export default function DynamicCategoryField({ value, onChange }) {
  const [items, setItems] = useState(FALLBACK);

  useEffect(() => {
    const controller = new AbortController();
    getPublicCategories({ type: 'posts', signal: controller.signal })
      .then((data) => {
        if (data.length) setItems(data);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const hasValue = items.some((item) => item.slug === value);

  return (
    <label className="admin-form-field admin-form-field--full">
      <span>Chuyên mục Blog</span>
      <select
        onChange={(event) => onChange(event.target.value)}
        value={hasValue ? value : items[0]?.slug || value || 'hoc-tieng-trung'}
      >
        {items.map((item) => (
          <option key={item.slug} value={item.slug}>
            {item.name}
          </option>
        ))}
      </select>
      <small>
        Danh sách này được quản lý trong mục Chuyên mục Blog và dùng trên trang Blog công
        khai.
      </small>
    </label>
  );
}
