import { useEffect, useMemo, useState } from 'react';
import { listAdminContent, listAdminLearning } from '../../../services/adminService.js';
import { listAdminCharacters } from '../services/adminCharacterService.js';
import { listAdminVocabulary } from '../services/adminVocabularyService.js';
import { ADMIN_SECTIONS, canAccessAdminSection } from '../navigation.js';
import '../../../styles/advanced-search.css';

const CONTENT_LABELS = {
  courses: 'Khóa học',
  units: 'Chương học',
  lessons: 'Bài học',
  vocabulary: 'Từ vựng',
  characters: 'Hán tự',
  posts: 'Blog',
};

function resultFor(section, item) {
  if (section === 'vocabulary') {
    return {
      key: `${section}-${item.id}`,
      section,
      group: CONTENT_LABELS[section],
      label: item.simplified || 'Từ vựng',
      detail: [item.pinyin, item.meaningVietnamese, item.status]
        .filter(Boolean)
        .join(' · '),
    };
  }
  if (section === 'characters') {
    return {
      key: `${section}-${item.id}`,
      section,
      group: CONTENT_LABELS[section],
      label: item.simplified || 'Hán tự',
      detail: [item.pinyin, item.meaningVietnamese, item.status]
        .filter(Boolean)
        .join(' · '),
    };
  }
  return {
    key: `${section}-${item.id || item._id}`,
    section,
    group: CONTENT_LABELS[section],
    label: item.title || item.name || 'Nội dung',
    detail: [item.slug, item.type, item.level, item.status].filter(Boolean).join(' · '),
  };
}

export default function AdminQuickSearch({ currentUser, open, onClose, onNavigate }) {
  const [query, setQuery] = useState('');
  const [contentResults, setContentResults] = useState([]);
  const [status, setStatus] = useState('idle');
  const sections = useMemo(
    () => ADMIN_SECTIONS.filter((item) => canAccessAdminSection(currentUser, item)),
    [currentUser],
  );
  const sectionResults = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('vi');
    const matchingSections = normalizedQuery
      ? sections.filter((item) =>
          `${item.label} ${item.key} ${item.group}`
            .toLocaleLowerCase('vi')
            .includes(normalizedQuery),
        )
      : sections;
    return matchingSections.slice(0, 8);
  }, [query, sections]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setContentResults([]);
      setStatus('idle');
      return undefined;
    }
    const close = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open, onClose]);

  useEffect(() => {
    const normalized = query.trim().toLocaleLowerCase('vi');
    if (!open || normalized.length < 2) {
      setContentResults([]);
      setStatus('idle');
      return undefined;
    }
    let active = true;
    const timer = window.setTimeout(async () => {
      setStatus('loading');
      try {
        const [courses, units, lessons, vocabulary, characters, posts] =
          await Promise.all([
            listAdminLearning('courses', { search: query, page: 1, pageSize: 4 }),
            listAdminLearning('units', { search: query, page: 1, pageSize: 4 }),
            listAdminLearning('lessons', { search: query, page: 1, pageSize: 5 }),
            listAdminVocabulary({ search: query, page: 1, pageSize: 5 }),
            listAdminCharacters({ search: query, page: 1, pageSize: 6 }),
            listAdminContent('posts', { search: query, page: 1, pageSize: 6 }),
          ]);
        if (!active) return;
        const results = [
          ...(courses.data || []).map((item) => resultFor('courses', item)),
          ...(units.data || []).map((item) => resultFor('units', item)),
          ...(lessons.data || []).map((item) => resultFor('lessons', item)),
          ...(vocabulary.data || []).map((item) => resultFor('vocabulary', item)),
          ...(characters.data || [])
            .slice(0, 5)
            .map((item) => resultFor('characters', item)),
          ...(posts.data || []).slice(0, 5).map((item) => resultFor('posts', item)),
        ].slice(0, 20);
        setContentResults(results);
        setStatus('ready');
      } catch {
        if (active) {
          setContentResults([]);
          setStatus('error');
        }
      }
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [open, query]);

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
        <h2>Tìm toàn bộ CMS</h2>
        <label className="advanced-search__input">
          <span>⌕</span>
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Khóa học, bài học, từ vựng, Hán tự, Blog…"
          />
        </label>

        <div className="admin-command-search__results">
          {query.trim().length >= 2 && (
            <small className="admin-command-search__label">Nội dung</small>
          )}
          {status === 'loading' && <p>Đang tìm trong CMS…</p>}
          {status === 'error' && <p>Không thể tải kết quả nội dung.</p>}
          {contentResults.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                onNavigate(item.section);
                onClose();
              }}
            >
              <span>
                <small>{item.group}</small>
                <strong>{item.label}</strong>
                {item.detail && <em>{item.detail}</em>}
              </span>
              <i>→</i>
            </button>
          ))}
          {status === 'ready' && !contentResults.length && (
            <p>Không tìm thấy nội dung phù hợp.</p>
          )}

          {sectionResults.length > 0 && (
            <small className="admin-command-search__label">Khu vực</small>
          )}
          {sectionResults.map((item) => (
            <button
              key={`section-${item.key}`}
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
          {!sectionResults.length && status !== 'loading' && !contentResults.length && (
            <p>Không tìm thấy mục phù hợp.</p>
          )}
        </div>
      </section>
    </div>
  );
}
