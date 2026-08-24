import { useCallback, useEffect, useState } from 'react';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../../components/ui/ContentState.jsx';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import PublicPagination from '../../../components/ui/PublicPagination.jsx';
import { usePageTitle } from '../../../hooks/usePageTitle.js';
import CharacterCard from '../components/CharacterCard.jsx';
import { listPublicCharacters } from '../services/characterService.js';
import '../styles/learning.css';

const PAGE_SIZE = 12;
const HSK_LEVELS = ['HSK 1', 'HSK 2', 'HSK 3', 'HSK 4', 'HSK 5', 'HSK 6', 'Ngoài HSK'];

export default function CharactersPage() {
  usePageTitle('Hán tự');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [hskLevel, setHskLevel] = useState('');
  const [page, setPage] = useState(1);
  const [state, setState] = useState({
    status: 'loading',
    data: [],
    pagination: null,
    error: '',
  });

  const load = useCallback(
    async (signal) => {
      setState((current) => ({ ...current, status: 'loading', error: '' }));
      try {
        const result = await listPublicCharacters({
          page,
          pageSize: PAGE_SIZE,
          search,
          hskLevel,
          signal,
        });
        setState({
          status: 'ready',
          data: result.data || [],
          pagination: result.pagination,
          error: '',
        });
      } catch (error) {
        if (error.name === 'AbortError') return;
        setState({ status: 'error', data: [], pagination: null, error: error.message });
      }
    },
    [hskLevel, page, search],
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  function submitSearch(event) {
    event.preventDefault();
    setPage(1);
    setSearch(query.trim());
  }

  function selectLevel(value) {
    setHskLevel(value);
    setPage(1);
  }

  return (
    <>
      <PageHeader
        description="Tìm theo chữ, Pinyin, nghĩa tiếng Việt hoặc bộ thủ rồi mở bàn luyện viết từng nét."
        eyebrow="Khám phá chữ viết"
        title="Hán tự"
      />
      <section className="learning-index-section">
        <div className="public-container">
          <div className="learning-toolbar">
            <form className="catalog-search" onSubmit={submitSearch}>
              <span aria-hidden="true">⌕</span>
              <label className="visually-hidden" htmlFor="character-search">
                Tìm Hán tự
              </label>
              <input
                id="character-search"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm chữ, Pinyin, nghĩa hoặc bộ thủ…"
                type="search"
                value={query}
              />
              <button className="button button--secondary button--small" type="submit">
                Tìm
              </button>
            </form>
            <div aria-label="Lọc Hán tự theo HSK" className="filter-chips" role="group">
              {['', ...HSK_LEVELS].map((level) => (
                <button
                  aria-pressed={hskLevel === level}
                  className={hskLevel === level ? 'is-active' : undefined}
                  key={level || 'all'}
                  onClick={() => selectLevel(level)}
                  type="button"
                >
                  {level || 'Tất cả'}
                </button>
              ))}
            </div>
          </div>
          {state.status === 'loading' && (
            <LoadingState count={6} label="Đang tải Hán tự" />
          )}
          {state.status === 'error' && (
            <ErrorState message={state.error} onRetry={() => load()} />
          )}
          {state.status === 'ready' &&
            (state.data.length ? (
              <>
                <div aria-label="Danh sách Hán tự" className="character-catalog-grid">
                  {state.data.map((item) => (
                    <CharacterCard item={item} key={item.id} />
                  ))}
                </div>
                {state.pagination && (
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
                description="Hãy thử từ khóa hoặc cấp HSK khác."
                icon="字"
                title="Chưa tìm thấy Hán tự phù hợp"
              />
            ))}
        </div>
      </section>
    </>
  );
}
