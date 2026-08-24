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
import CharacterPracticeModal from '../components/CharacterPracticeModal.jsx';
import VocabularyCard from '../components/VocabularyCard.jsx';
import {
  listPublicVocabulary,
  listSavedVocabulary,
  saveVocabulary,
  unsaveVocabulary,
} from '../services/vocabularyService.js';
import '../styles/learning.css';

const PAGE_SIZE = 12;
const FEATURED_SIZE = 6;

export default function VocabularyPage() {
  const auth = useStudentAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const savedOnly = new URLSearchParams(location.search).get('saved') === '1';
  usePageTitle(savedOnly ? 'Từ vựng đã lưu' : 'Từ vựng');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [level, setLevel] = useState('Tất cả');
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ status: 'loading', data: [], pagination: null, error: '' });
  const [featured, setFeatured] = useState({ status: 'loading', data: [], error: '' });
  const [savedIds, setSavedIds] = useState(new Set());
  const [busyId, setBusyId] = useState('');
  const [practiceCharacter, setPracticeCharacter] = useState('');
  const [notice, setNotice] = useState({ message: '', variant: 'success' });

  const searching = !savedOnly && (debouncedQuery.trim() || level !== 'Tất cả');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [query]);

  const loadFeatured = useCallback(() => {
    if (savedOnly) return;
    setFeatured((current) => ({ ...current, status: 'loading' }));
    listPublicVocabulary({ page: 1, pageSize: FEATURED_SIZE })
      .then((result) => setFeatured({ status: 'ready', data: result.data || [], error: '' }))
      .catch((error) => setFeatured({ status: 'error', data: [], error: error.message }));
  }, [savedOnly]);

  useEffect(() => {
    loadFeatured();
  }, [loadFeatured]);

  const load = useCallback(() => {
    if (savedOnly) {
      if (auth.status !== 'signed-in') {
        setState({ status: 'ready', data: [], pagination: null, error: '' });
        return;
      }
      setState((current) => ({ ...current, status: 'loading' }));
      listSavedVocabulary()
        .then((result) => {
          const data = result.data || [];
          setState({ status: 'ready', data, pagination: { page: 1, pageSize: data.length || 1, total: data.length }, error: '' });
        })
        .catch((error) => setState({ status: 'error', data: [], pagination: null, error: error.message }));
      return;
    }

    if (!searching) {
      setState({ status: 'ready', data: [], pagination: null, error: '' });
      return;
    }

    setState((current) => ({ ...current, status: 'loading' }));
    listPublicVocabulary({
      search: debouncedQuery,
      hskLevel: level === 'Tất cả' ? '' : level,
      page,
      pageSize: PAGE_SIZE,
    })
      .then((result) =>
        setState({
          status: 'ready',
          data: result.data || [],
          pagination: result.pagination || null,
          error: '',
        }),
      )
      .catch((error) => setState({ status: 'error', data: [], pagination: null, error: error.message }));
  }, [auth.status, debouncedQuery, level, page, savedOnly, searching]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (auth.status !== 'signed-in') {
      setSavedIds(new Set());
      return;
    }
    listSavedVocabulary()
      .then((result) => setSavedIds(new Set((result.data || []).map((item) => item.id))))
      .catch(() => setSavedIds(new Set()));
  }, [auth.status]);

  useEffect(() => {
    setPage(1);
  }, [savedOnly, level]);

  const savedItems = useMemo(() => {
    if (!savedOnly) return state.data;
    const normalized = query.trim().toLocaleLowerCase('vi');
    return state.data.filter(
      (item) =>
        (level === 'Tất cả' || item.hskLevel === level) &&
        (!normalized ||
          `${item.simplified} ${item.traditional || ''} ${item.pinyin} ${item.meaningVietnamese}`
            .toLocaleLowerCase('vi')
            .includes(normalized)),
    );
  }, [level, query, savedOnly, state.data]);

  const levels = useMemo(() => {
    const source = savedOnly ? state.data : [...featured.data, ...state.data];
    return ['Tất cả', ...new Set(source.map((item) => item.hskLevel).filter(Boolean))];
  }, [featured.data, savedOnly, state.data]);

  function updateLevel(value) {
    setLevel(value);
    setPage(1);
  }

  async function toggleSave(item) {
    if (auth.status !== 'signed-in') {
      navigate('/login', { state: { from: `${location.pathname}${location.search}` } });
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
      if (savedOnly && wasSaved) {
        setState((current) => ({ ...current, data: current.data.filter((entry) => entry.id !== item.id) }));
      }
      setNotice({
        message: wasSaved
          ? `Đã bỏ lưu “${item.simplified}”.`
          : `Đã lưu “${item.simplified}” vào từ vựng của bạn.`,
        variant: 'success',
      });
    } catch (caught) {
      setNotice({ message: caught.message || 'Không thể cập nhật từ đã lưu.', variant: 'error' });
    } finally {
      setBusyId('');
    }
  }

  const resultItems = savedOnly ? savedItems : state.data;

  return (
    <>
      <PageHeader
        description={
          savedOnly
            ? 'Các từ bạn đã đánh dấu để ôn lại. Bỏ lưu bất kỳ lúc nào mà không ảnh hưởng nội dung khóa học.'
            : 'Khám phá vài từ nổi bật, hoặc tìm theo chữ Hán, Pinyin, nghĩa tiếng Việt và cấp HSK.'
        }
        eyebrow={savedOnly ? 'Không gian học viên' : 'Xây vốn từ'}
        title={savedOnly ? 'Từ vựng đã lưu' : 'Từ vựng'}
      />
      <section className="learning-index-section">
        <div className="public-container">
          {savedOnly && auth.status !== 'signed-in' && (
            <div className="demo-notice"><span>i</span><p>Đăng nhập để xem danh sách từ vựng bạn đã lưu.</p></div>
          )}
          <div className="learning-toolbar">
            <label className="catalog-search">
              <span aria-hidden="true">⌕</span>
              <span className="visually-hidden">Tìm từ vựng</span>
              <input
                onChange={(event) => setQuery(event.target.value)}
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

          {!savedOnly && !searching && (
            <section className="vocabulary-featured" aria-labelledby="featured-vocabulary-title">
              <div className="vocabulary-featured__heading">
                <div>
                  <span>Từ vựng nổi bật</span>
                  <h2 id="featured-vocabulary-title">Lướt nhanh trước khi tìm kiếm</h2>
                </div>
                <p>Carousel dùng dữ liệu published thật và tự dừng khi bạn rê chuột hoặc focus.</p>
              </div>
              {featured.status === 'loading' && <LoadingState count={3} label="Đang tải từ nổi bật" />}
              {featured.status === 'error' && <ErrorState message={featured.error} onRetry={loadFeatured} />}
              {featured.status === 'ready' && featured.data.length === 0 && (
                <EmptyState icon="词" title="Chưa có từ nổi bật" description="Các từ published sẽ xuất hiện tại đây." />
              )}
              {featured.status === 'ready' && featured.data.length > 0 && (
                <div className="vocabulary-featured__viewport">
                  <div className="vocabulary-featured__track">
                    {[...featured.data, ...featured.data].map((item, index) => (
                      <VocabularyCard
                        busy={busyId === item.id}
                        item={item}
                        key={`${item.id}-${index}`}
                        onPracticeCharacter={setPracticeCharacter}
                        onToggleSave={toggleSave}
                        saved={savedIds.has(item.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {(savedOnly || searching) && state.status === 'loading' && <LoadingState count={6} label="Đang tìm từ vựng" />}
          {(savedOnly || searching) && state.status === 'error' && <ErrorState message={state.error} onRetry={load} />}
          {(savedOnly || searching) && state.status === 'ready' &&
            (resultItems.length ? (
              <>
                <div className="vocabulary-grid">
                  {resultItems.map((item) => (
                    <VocabularyCard
                      busy={busyId === item.id}
                      item={item}
                      key={item.id}
                      onPracticeCharacter={setPracticeCharacter}
                      onToggleSave={toggleSave}
                      saved={savedIds.has(item.id)}
                    />
                  ))}
                </div>
                {!savedOnly && state.pagination && state.pagination.total > PAGE_SIZE && (
                  <PublicPagination
                    onPageChange={setPage}
                    page={state.pagination.page}
                    pageSize={state.pagination.pageSize}
                    total={state.pagination.total}
                  />
                )}
              </>
            ) : (
              <EmptyState
                description={savedOnly ? 'Vào trang Từ vựng và bấm Lưu ở những từ bạn muốn ôn lại.' : 'Hãy thử từ khóa hoặc cấp độ khác.'}
                icon="词"
                title={savedOnly ? 'Bạn chưa lưu từ nào' : 'Chưa tìm thấy từ phù hợp'}
              />
            ))}
        </div>
      </section>
      <CharacterPracticeModal character={practiceCharacter} onClose={() => setPracticeCharacter('')} />
      <PublicToast
        message={notice.message}
        onClose={() => setNotice((current) => ({ ...current, message: '' }))}
        variant={notice.variant}
      />
    </>
  );
}
