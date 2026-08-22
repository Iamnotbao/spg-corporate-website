import { useEffect, useMemo, useState } from 'react';
import { ADMIN_SECTIONS, canAccessAdminSection } from '../navigation.js';
import '../../../styles/advanced-search.css';

export default function AdminQuickSearch({ currentUser, open, onClose, onNavigate }) {
  const [query, setQuery] = useState('');
  const sections = useMemo(
    () => ADMIN_SECTIONS.filter((item) => canAccessAdminSection(currentUser, item)),
    [currentUser],
  );
  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const matchingSections = normalizedQuery
      ? sections.filter((item) =>
          `${item.label} ${item.key} ${item.group}`
            .toLowerCase()
            .includes(normalizedQuery),
        )
      : sections;
    return matchingSections.slice(0, 12);
  }, [query, sections]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      return undefined;
    }
    const close = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="advanced-search admin-command-search"
      role="dialog"
      aria-modal="true"
      aria-label="Tìm kiếm quản trị"
    >
      <button
        className="advanced-search__scrim"
        type="button"
        onClick={onClose}
        aria-label="Đóng"
      />
      <section className="advanced-search__panel">
        <div className="advanced-search__top">
          <span>MANDORA CMS</span>
          <button type="button" onClick={onClose} aria-label="Đóng tìm kiếm">
            ×
          </button>
        </div>
        <h2>Đi đến một khu vực</h2>
        <label className="advanced-search__input">
          <span>⌕</span>
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Khóa học, Blog, Media, Học viên…"
          />
        </label>
        <div className="admin-command-search__results">
          {results.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                onNavigate(item.key);
                onClose();
              }}
            >
              <span>
                <small>{item.group || 'Dashboard'}</small>
                <strong>{item.label}</strong>
              </span>
              <i>→</i>
            </button>
          ))}
          {!results.length && <p>Không tìm thấy mục phù hợp.</p>}
        </div>
      </section>
    </div>
  );
}
