import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import {
  getAdminLessonVocabularyLinks,
  getAdminVocabulary,
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
  const [mode, setMode] = useState('view');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 280);
  const [hskLevel, setHskLevel] = useState('');
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ status: 'loading', items: [], pagination: null, error: '' });
  const [linkedState, setLinkedState] = useState({ status: 'loading', items: [], error: '' });
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [initialIds, setInitialIds] = useState(() => new Set());
  const [saving, setSaving] = useState(false);

  const loadLinks = useCallback(async () => {
    setLinkedState({ status: 'loading', items: [], error: '' });
    try {
      const response = await getAdminLessonVocabularyLinks(lesson.id);
      const ids = response.data || [];
      const nextIds = new Set(ids);
      setSelectedIds(nextIds);
      setInitialIds(new Set(nextIds));

      const rows = await Promise.all(
        ids.map(async (id) => {
          try {
            const item = await getAdminVocabulary(id);
            return item.data || null;
          } catch (error) {
            if (onUnauthorized(error)) return null;
            return null;
          }
        }),
      );
      setLinkedState({ status: 'ready', items: rows.filter(Boolean), error: '' });
    } catch (error) {
      if (!onUnauthorized(error)) {
        setLinkedState({
          status: 'error',
          items: [],
          error: error.message || 'Không thể tải từ đã gắn.',
        });
        onNotify(error.message || 'Không thể tải từ đã gắn.', 'error');
      }
    }
  }, [lesson.id, onNotify, onUnauthorized]);

  const loadPage = useCallback(async (signal) => {
    if (mode !== 'manage') return;
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
  }, [debouncedSearch, hskLevel, mode, onUnauthorized, page]);

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
      await loadLinks();
      setMode('view');
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
            <h2 id="admin-vocabulary-picker-title">Từ vựng của {lesson.title}</h2>
            <span>{selectedIds.size} từ đang được gắn. Một từ có thể dùng ở nhiều bài.</span>
          </div>
          <button aria-label="Đóng" className="admin-icon-button" onClick={onClose} type="button">
            <AdminIcon name="close" size={18} />
          </button>
        </header>

        <div className="admin-vocabulary-picker__tabs" role="tablist" aria-label="Chế độ từ vựng">
          <button
            aria-selected={mode === 'view'}
            className={mode === 'view' ? 'is-active' : ''}
            onClick={() => setMode('view')}
            role="tab"
            type="button"
          >
            Xem từ đã gắn ({selectedIds.size})
          </button>
          <button
            aria-selected={mode === 'manage'}
            className={mode === 'manage' ? 'is-active' : ''}
            onClick={() => setMode('manage')}
            role="tab"
            type="button"
          >
            Quản lý từ
          </button>
        </div>

        {mode === 'manage' && (
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
        )}

        <div className="admin-vocabulary-picker__table-wrap">
          {mode === 'view' && linkedState.status === 'loading' && <AdminSkeletonRows count={5} />}
          {mode === 'view' && linkedState.status === 'error' && (
            <AdminEmpty title="Không tải được từ đã gắn">{linkedState.error}</AdminEmpty>
          )}
          {mode === 'view' && linkedState.status === 'ready' && !linkedState.items.length && (
            <AdminEmpty title="Bài học chưa có từ vựng">
              Chuyển sang “Quản lý từ” để chọn từ trong kho Vocabulary.
            </AdminEmpty>
          )}
          {mode === 'view' && linkedState.status === 'ready' && linkedState.items.length > 0 && (
            <table className="admin-table admin-vocabulary-picker__table">
              <thead>
                <tr><th>Từ</th><th>Pinyin</th><th>Nghĩa</th><th>HSK</th><th>Trạng thái</th></tr>
              </thead>
              <tbody>
                {linkedState.items.map((item) => (
                  <tr key={item.id}>
                    <td><strong lang="zh-Hans">{item.simplified}</strong></td>
                    <td>{item.pinyin || '—'}</td>
                    <td>{item.meaningVietnamese || '—'}</td>
                    <td>{item.hskLevel || '—'}</td>
                    <td><span className={`admin-learning-badge is-${item.status}`}>{item.status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {mode === 'manage' && state.status === 'loading' && <AdminSkeletonRows count={5} />}
          {mode === 'manage' && state.status === 'error' && <AdminEmpty title="Không tải được kho từ">{state.error}</AdminEmpty>}
          {mode === 'manage' && state.status === 'ready' && !state.items.length && (
            <AdminEmpty title="Không tìm thấy từ vựng">Thử từ khóa hoặc cấp HSK khác.</AdminEmpty>
          )}
          {mode === 'manage' && state.status === 'ready' && state.items.length > 0 && (
            <table className="admin-table admin-vocabulary-picker__table">
              <thead>
                <tr>
                  <th><input aria-label="Chọn trang hiện tại" checked={allPageSelected} onChange={toggleCurrentPage} type="checkbox" /></th>
                  <th>Từ</th><th>Pinyin</th><th>Nghĩa</th><th>HSK</th><th>Trạng thái</th>
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

        {mode === 'manage' && state.pagination && state.pagination.totalPages > 1 && (
          <AdminPagination onPageChange={setPage} pagination={state.pagination} />
        )}

        <footer>
          <span>{mode === 'view' ? `${selectedIds.size} từ đã gắn với bài học` : changed ? 'Có thay đổi chưa lưu' : 'Danh sách đã đồng bộ'}</span>
          <div>
            <button className="admin-button admin-button--secondary" onClick={onClose} type="button">Đóng</button>
            {mode === 'view' ? (
              <button className="admin-button admin-button--primary" onClick={() => setMode('manage')} type="button">
                Quản lý từ
              </button>
            ) : (
              <button className="admin-button admin-button--primary" disabled={!changed || saving} onClick={save} type="button">
                {saving ? 'Đang lưu…' : `Lưu ${selectedIds.size} từ`}
              </button>
            )}
          </div>
        </footer>
      </section>
    </div>
  );
}
