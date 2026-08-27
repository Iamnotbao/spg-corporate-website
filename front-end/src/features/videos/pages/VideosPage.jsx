import { useCallback, useEffect, useState } from 'react';
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/ContentState.jsx';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import PublicPagination from '../../../components/ui/PublicPagination.jsx';
import { usePageTitle } from '../../../hooks/usePageTitle.js';
import VideoPlayer from '../components/VideoPlayer.jsx';
import { listVideos } from '../services/videoService.js';
import '../styles/videos.css';

export default function VideosPage() {
  usePageTitle('Video học tiếng Trung');
  const [level, setLevel] = useState('');
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ status: 'loading', data: [], pagination: null, error: '' });
  const load = useCallback((signal) => {
    setState((current) => ({ ...current, status: 'loading', error: '' }));
    listVideos({ hskLevel: level, page, pageSize: 9, signal }).then((response) => setState({ status: 'ready', data: response.data || [], pagination: response.pagination, error: '' })).catch((error) => { if (error.name !== 'AbortError') setState({ status: 'error', data: [], pagination: null, error: error.message }); });
  }, [level, page]);
  useEffect(() => { const controller = new AbortController(); load(controller.signal); return () => controller.abort(); }, [load]);
  return <><PageHeader eyebrow="Video learning" title="Học qua video" description="Video bài học Mandora theo cấp HSK, phát theo yêu cầu và không tự động bật âm thanh." /><section className="video-catalog"><div className="public-container"><div className="filter-chips" role="group" aria-label="Lọc video theo HSK">{['', 'HSK 1', 'HSK 2', 'HSK 3', 'HSK 4', 'HSK 5', 'HSK 6'].map((value) => <button aria-pressed={level === value} className={level === value ? 'is-active' : ''} key={value || 'all'} onClick={() => { setLevel(value); setPage(1); }} type="button">{value || 'Tất cả'}</button>)}</div>{state.status === 'loading' && <LoadingState count={6} label="Đang tải video" />}{state.status === 'error' && <ErrorState message={state.error} onRetry={() => load()} />}{state.status === 'ready' && !state.data.length && <EmptyState icon="影" title="Chưa có video" description="Video đã xuất bản sẽ xuất hiện tại đây." />}{state.status === 'ready' && state.data.length > 0 && <><div className="video-grid">{state.data.map((video) => <article className="video-card" key={video.id}><div className="video-player"><VideoPlayer video={video} /></div><span>{video.hskLevel}</span><h2>{video.title}</h2><p>{video.description}</p></article>)}</div>{state.pagination?.totalPages > 1 && <PublicPagination page={state.pagination.page} pageSize={state.pagination.pageSize} total={state.pagination.total} onPageChange={setPage} />}</>}</div></section></>;
}
