import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../../components/ui/ContentState.jsx';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import PublicPagination from '../../../components/ui/PublicPagination.jsx';
import PublicToast from '../../../components/ui/PublicToast.jsx';
import { usePageTitle } from '../../../hooks/usePageTitle.js';
import { useStudentAuth } from '../../auth/StudentAuthContext.jsx';
import VocabularyCard from '../components/VocabularyCard.jsx';
import {
  listPublicVocabulary,
  listSavedVocabulary,
  saveVocabulary,
  unsaveVocabulary,
} from '../services/vocabularyService.js';
import '../styles/learning.css';

const PAGE_SIZE = 12;

export default function VocabularyPage() {
  usePageTitle('Từ vựng');
  const auth = useStudentAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('Tất cả');
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ status: 'loading', data: [], error: '' });
  const [savedIds, setSavedIds] = useState(new Set());
  const [busyId, setBusyId] = useState('');
  const [notice, setNotice] = useState({ message: '', variant: 'success' });
  const load = useCallback(() => {
    setState((current) => ({ ...current, status: 'loading' }));
    listPublicVocabulary()
      .then((result) => setState({ status: 'ready', data: result.data || [], error: '' }))
      .catch((error) => setState({ status: 'error', data: [], error: error.message }));
  }, []);
  useEffect(load, [load]);
  useEffect(() => {
    if (auth.status !== 'signed-in') {
      setSavedIds(new Set());
      return;
    }
    listSavedVocabulary()
      .then((result) => setSavedIds(new Set((result.data || []).map((item) => item.id))))
      .catch(() => setSavedIds(new Set()));
  }, [auth.status]);

  const levels = useMemo(
    () => ['Tất cả', ...new Set(state.data.map((item) => item.hskLevel).filter(Boolean))],
    [state.data],
  );
  const items = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('vi');
    return state.data.filter(
      (item) =>
        (level === 'Tất cả' || item.hskLevel === level) &&
        (!normalized ||
          `${item.simplified} ${item.traditional || ''} ${item.pinyin} ${item.meaningVietnamese}`
            .toLocaleLowerCase('vi')
            .includes(normalized)),
    );
  }, [level, query, state.data]);
  const pagedItems = useMemo(
    () => items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [items, page],
  );

  function updateQuery(value) {
    setQuery(value);
    setPage(1);
  }

  function updateLevel(value) {
    setLevel(value);
    setPage(1);
  }

  async function toggleSave(item) {
    if (auth.status !== 'signed-in') {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    setBusyId(item.id);
    try {
      const wasSaved = savedIds.has(item.id);
      if (wasSaved) await unsaveVocabulary(item.id);
      else await saveVocabulary(item.id);
      setSavedIds((current) => {
        const next = new Set(current);
        if (next.has(item.id)) next.delete(item.id);
        else next.add(item.id);
        return next;
      });
      setNotice({
        message: wasSaved ? `Đã bỏ lưu “${item.simplified}”.` : `Đã lưu “${item.simplified}” vào từ vựng của bạn.`,
        variant: 'success',
      });
    } catch (caught) {
      setNotice({ message: caught.message || 'Không thể cập nhật từ đã lưu.', variant: 'error' });
    } finally {
      setBusyId('');
    }
  }

  return (
    <>
      <PageHeader
        description="Duyệt từ theo chữ giản thể, phồn thể, Pinyin, nghĩa tiếng Việt và ngữ cảnh sử dụng."
        eyebrow="Xây vốn từ"
        title="Từ vựng"
      />
      <section className="learning-index-section">
        <div className="public-container">
          <div className="learning-toolbar">
            <label className="catalog-search">
              <span aria-hidden="true">⌕</span>
              <span className="visually-hidden">Tìm từ vựng</span>
              <input
                onChange={(event) => updateQuery(event.target.value)}
                placeholder="Tìm chữ, Pinyin hoặc nghĩa…"
                type="search"
                value={query}
              />
            </label>
            <div aria-label="Lọc từ vựng theo HSK" className="filter-chips" role="group">
              {levels.map((item) => (
                <button
                  aria-pressed={level === item}
                  className={level === item ? 'is-active' : undefined}
                  key={item}
                  onClick={() => updateLevel(item)}
                  type="button"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          {state.status === 'loading' && <LoadingState count={6} label="Đang tải từ vựng" />}
          {state.status === 'error' && (
            <ErrorState message={state.error} onRetry={load} />
          )}
          {state.status === 'ready' &&
            (items.length ? (
              <>
                <div className="vocabulary-grid">
                  {pagedItems.map((item) => (
                    <VocabularyCard
                      busy={busyId === item.id}
                      item={item}
                      key={item.id}
                      onToggleSave={toggleSave}
                      saved={savedIds.has(item.id)}
                    />
                  ))}
                </div>
                <PublicPagination
                  onPageChange={setPage}
                  page={page}
                  pageSize={PAGE_SIZE}
                  total={items.length}
                />
              </>
            ) : (
              <EmptyState
                description="Hãy thử từ khóa hoặc cấp độ khác."
                icon="词"
                title="Chưa tìm thấy từ phù hợp"
              />
            ))}
        </div>
      </section>
      <PublicToast
        message={notice.message}
        onClose={() => setNotice((current) => ({ ...current, message: '' }))}
        variant={notice.variant}
      />
    </>
  );
}
