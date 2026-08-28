import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import {
  getAdminLessonVocabularyLinks,
  listAdminVocabulary,
  replaceAdminLessonVocabularyLinks,
} from '../services/adminVocabularyService.js';
import AdminIcon from './AdminIcon.jsx';
import AdminPagination from './AdminPagination.jsx';
import { AdminEmpty, AdminSkeletonRows } from './AdminFeedback.jsx';

const PAGE_SIZE = 8;
const HSK_LEVELS = ['HSK 1', 'HSK 2', 'HSK 3', 'HSK 4', 'HSK 5', 'HSK 6', 'Ngoài HSK'];

export default function AdminLessonVocabularyPicker({
  lesson,
  onClose,
  onNotify,
  onUnauthorized,
}) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 280);
  const [hskLevel, setHskLevel] = useState('');
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ status: 'loading', items: [], pagination: null, error: '' });
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [initialIds, setInitialIds] = useState(() => new Set());
  const [saving, setSaving] = useState(false);

  const loadLinks = useCallback(async () => {
    try {
      const response = await getAdminLessonVocabularyLinks(lesson.id);
      const ids = new Set(response.data || []);
      setSelectedIds(ids);
      setInitialIds(new Set(ids));
    } catch (error) {
      if (!onUnauthorized(error)) onNotify(error.message || 'Không thể tải từ đã gắn.', 'error');
    }
  }, [lesson.id, onNotify, onUnauthorized]);

  const loadPage = useCallback(async (signal) => {
    setState((current) => ({ ...current, status: 'loading', error: '' }));
    try {
      const response = await listAdminVocabulary({
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch,
        hskLevel,
        signal,
      });
      if (signal?.aborted) return;
      setState({
        status: 'ready',
        items: response.data || [],
        pagination: response.pagination || null,
        error: '',
      });
    } catch (error) {
      if (error?.name === 'AbortError') return;
      if (onUnauthorized(error)) return;
      setState({ status: 'error', items: [], pagination: null, error: error.message });
    }
  }, [debouncedSearch, hskLevel, onUnauthorized, page]);

  useEffect(() => {
    loadLinks();
  }, [loadLinks]);

  useEffect(() => {
    const controller = new AbortController();
    loadPage(controller.signal);
    return () => controller.abort();
  }, [loadPage]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => setPage(1), [debouncedSearch, hskLevel]);

  const changed = useMemo(() => {
    if (selectedIds.size !== initialIds.size) return true;
    return [...selectedIds].some((id) => !initialIds.has(id));
  }, [initialIds, selectedIds]);

  function toggle(id) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleCurrentPage() {
    const pageIds = state.items.map((item) => item.id);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
    setSelectedIds((current) => {
      const next = new Set(current);
      pageIds.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      await replaceAdminLessonVocabularyLinks(lesson.id, [...selectedIds]);
      setInitialIds(new Set(selectedIds));
      onNotify(`Đã gắn ${selectedIds.size} từ vào “${lesson.title}”.`);
      onClose();
    } catch (error) {
      if (!onUnauthorized(error)) onNotify(error.message || 'Không thể lưu danh sách từ.', 'error');
    } finally {
      setSaving(false);
    }
  }

  const pageIds = state.items.map((item) => item.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));

  return (
    <div className="admin-vocabulary-picker" role="presentation" onMouseDown={onClose}>
      <section
        aria-labelledby="admin-vocabulary-picker-title"
        aria-modal="true"
        className="admin-vocabulary-picker__dialog"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header>
          <div>
            <p className="admin-eyebrow">Lesson vocabulary</p>
            <h2 id="admin-vocabulary-picker-title">Chọn từ cho {lesson.title}</h2>
            <span>{selectedIds.size} từ đang được chọn. Một từ có thể dùng ở nhiều bài.</span>
          </div>
          <button aria-label="Đóng" className="admin-icon-button" onClick={onClose} type="button">
            <AdminIcon name="close" size={18} />
          </button>
        </header>

        <div className="admin-vocabulary-picker__toolbar">
          <label>
            <AdminIcon name="search" size={16} />
            <input
              autoFocus
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm chữ, Pinyin, nghĩa…"
              type="search"
              value={search}
            />
          </label>
          <select onChange={(event) => setHskLevel(event.target.value)} value={hskLevel}>
            <option value="">Tất cả HSK</option>
            {HSK_LEVELS.map((level) => <option key={level}>{level}</option>)}
          </select>
        </div>

        <div className="admin-vocabulary-picker__table-wrap">
          {state.status === 'loading' && <AdminSkeletonRows count={5} />}
          {state.status === 'error' && <AdminEmpty title="Không tải được kho từ">{state.error}</AdminEmpty>}
          {state.status === 'ready' && !state.items.length && (
            <AdminEmpty title="Không tìm thấy từ vựng">Thử từ khóa hoặc cấp HSK khác.</AdminEmpty>
          )}
          {state.status === 'ready' && state.items.length > 0 && (
            <table className="admin-table admin-vocabulary-picker__table">
              <thead>
                <tr>
                  <th><input aria-label="Chọn trang hiện tại" checked={allPageSelected} onChange={toggleCurrentPage} type="checkbox" /></th>
                  <th>Từ</th>
                  <th>Pinyin</th>
                  <th>Nghĩa</th>
                  <th>HSK</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {state.items.map((item) => (
                  <tr className={selectedIds.has(item.id) ? 'is-selected' : ''} key={item.id} onClick={() => toggle(item.id)}>
                    <td><input aria-label={`Chọn ${item.simplified}`} checked={selectedIds.has(item.id)} onChange={() => toggle(item.id)} onClick={(event) => event.stopPropagation()} type="checkbox" /></td>
                    <td><strong lang="zh-Hans">{item.simplified}</strong></td>
                    <td>{item.pinyin}</td>
                    <td>{item.meaningVietnamese}</td>
                    <td>{item.hskLevel}</td>
                    <td><span className={`admin-learning-badge is-${item.status}`}>{item.status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {state.pagination && state.pagination.totalPages > 1 && (
          <AdminPagination onPageChange={setPage} pagination={state.pagination} />
        )}

        <footer>
          <span>{changed ? 'Có thay đổi chưa lưu' : 'Danh sách đã đồng bộ'}</span>
          <div>
            <button className="admin-button admin-button--secondary" onClick={onClose} type="button">Hủy</button>
            <button className="admin-button admin-button--primary" disabled={!changed || saving} onClick={save} type="button">
              {saving ? 'Đang lưu…' : `Gắn ${selectedIds.size} từ`}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
