import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ErrorState, LoadingState } from '../../../components/ui/ContentState.jsx';
import { usePageTitle } from '../../../hooks/usePageTitle.js';
import { useStudentAuth } from '../../auth/StudentAuthContext.jsx';
import NotFoundPage from '../../public/pages/NotFoundPage.jsx';
import HandwritingCanvas from '../components/HandwritingCanvas.jsx';
import StrokeOrderPlayer from '../components/StrokeOrderPlayer.jsx';
import {
  compareCharacter,
  getCharacterAttemptSummary,
  getCharacterStrokeData,
  getPublicCharacter,
  submitCharacterAttempt,
} from '../services/characterService.js';
import '../styles/learning.css';

const LEVEL_LABELS = {
  excellent: 'Rất sát mẫu',
  good: 'Khá tốt',
  keep_practicing: 'Tiếp tục luyện',
  try_again: 'Thử lại nhé',
};

export default function CharacterPracticePage() {
  const { character: identifier } = useParams();
  const location = useLocation();
  const auth = useStudentAuth();
  const canvasRef = useRef(null);
  const [state, setState] = useState({
    status: 'loading',
    character: null,
    strokeData: null,
    error: '',
    errorStatus: 0,
  });
  const [strokes, setStrokes] = useState([]);
  const [guideVisible, setGuideVisible] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [result, setResult] = useState(null);
  const [compareError, setCompareError] = useState('');
  const [stats, setStats] = useState(null);
  usePageTitle(
    state.character ? `Luyện viết ${state.character.simplified}` : 'Luyện viết Hán tự',
  );

  useEffect(() => {
    const controller = new AbortController();
    setState({
      status: 'loading',
      character: null,
      strokeData: null,
      error: '',
      errorStatus: 0,
    });
    Promise.all([
      getPublicCharacter(identifier, { signal: controller.signal }),
      getCharacterStrokeData(identifier, { signal: controller.signal }),
    ])
      .then(([characterResponse, strokeResponse]) => {
        setState({
          status: 'ready',
          character: characterResponse.data,
          strokeData: strokeResponse.data.data,
          error: '',
          errorStatus: 0,
        });
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        setState({
          status: 'error',
          character: null,
          strokeData: null,
          error: error.message,
          errorStatus: error.status,
        });
      });
    return () => controller.abort();
  }, [identifier]);

  useEffect(() => {
    if (auth.status !== 'signed-in' || !state.character?.id) {
      setStats(null);
      return undefined;
    }
    const controller = new AbortController();
    getCharacterAttemptSummary(state.character.id, { signal: controller.signal })
      .then((response) => setStats(response.data))
      .catch(() => setStats(null));
    return () => controller.abort();
  }, [auth.status, state.character?.id]);

  async function compare() {
    setComparing(true);
    setCompareError('');
    try {
      if (auth.status === 'signed-in') {
        const response = await submitCharacterAttempt(state.character.id, strokes);
        const attempt = response.data;
        setResult({
          score: attempt.score,
          strokeCount: attempt.strokeCount,
          ...attempt.summary,
        });
        setStats((current) => ({
          count: (current?.count || 0) + 1,
          latest: attempt,
          best:
            !current?.best || attempt.score > current.best.score ? attempt : current.best,
        }));
      } else {
        const response = await compareCharacter(state.character.simplified, strokes);
        setResult(response.data);
      }
    } catch (error) {
      setCompareError(error.message || 'Không thể so sánh nét viết lúc này.');
    } finally {
      setComparing(false);
    }
  }

  function clear() {
    canvasRef.current?.clear();
    setResult(null);
    setCompareError('');
  }

  function restart() {
    clear();
    window.requestAnimationFrame(() =>
      document.querySelector('.handwriting-canvas')?.focus(),
    );
  }

  if (state.status === 'loading') {
    return (
      <section className="character-practice-state">
        <LoadingState count={2} label="Đang tải bàn luyện viết" />
      </section>
    );
  }
  if (state.status === 'error' && state.errorStatus === 404) return <NotFoundPage />;
  if (state.status === 'error') {
    return (
      <section className="character-practice-state">
        <ErrorState message={state.error} onRetry={() => window.location.reload()} />
      </section>
    );
  }

  const item = state.character;
  return (
    <main className="character-practice-page">
      <header className="character-practice-hero">
        <div className="public-container character-practice-hero__inner">
          <Link className="breadcrumb-link" to="/characters">
            ← Danh sách Hán tự
          </Link>
          <div className="character-practice-hero__content">
            <strong lang="zh-Hans">{item.simplified}</strong>
            <div>
              <span>
                {item.hskLevel} · {item.strokeCount} nét · Bộ {item.radical}
              </span>
              <h1>{item.pinyin}</h1>
              <p>
                {item.meaningVietnamese}
                {item.meaningEnglish ? ` · ${item.meaningEnglish}` : ''}
              </p>
              {item.traditional && item.traditional !== item.simplified && (
                <small lang="zh-Hant">Phồn thể: {item.traditional}</small>
              )}
            </div>
          </div>
          {item.examples.length > 0 && (
            <div className="character-practice-examples">
              {item.examples.map((example) => (
                <span key={`${example.chinese}-${example.pinyin}`}>
                  <strong lang="zh-Hans">{example.chinese}</strong> {example.pinyin}
                  {example.meaningVietnamese ? ` · ${example.meaningVietnamese}` : ''}
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="public-container character-practice-flow">
        <StrokeOrderPlayer character={item.strokeDataKey} data={state.strokeData} />

        <section className="handwriting-practice" aria-labelledby="handwriting-title">
          <div className="practice-section-heading">
            <span>02 · Tự viết</span>
            <h2 id="handwriting-title">Viết trên ô 米</h2>
            <p>
              Dùng chuột, bút cảm ứng hoặc ngón tay. Trang sẽ không cuộn trong lúc bạn
              viết.
            </p>
          </div>
          <HandwritingCanvas
            guideVisible={guideVisible}
            onChange={setStrokes}
            ref={canvasRef}
          />
          <div className="handwriting-practice__controls">
            <button
              className="button button--secondary button--small"
              onClick={() => setGuideVisible((visible) => !visible)}
              type="button"
            >
              {guideVisible ? 'Ẩn đường dẫn' : 'Hiện đường dẫn'}
            </button>
            <button
              className="button button--secondary button--small"
              disabled={!strokes.length}
              onClick={() => canvasRef.current?.undo()}
              type="button"
            >
              Hoàn tác nét
            </button>
            <button
              className="button button--secondary button--small"
              disabled={!strokes.length}
              onClick={clear}
              type="button"
            >
              Xóa bảng
            </button>
          </div>
        </section>

        <section className="character-compare" aria-labelledby="compare-title">
          <div className="practice-section-heading">
            <span>03 · So sánh</span>
            <h2 id="compare-title">Đối chiếu với mẫu</h2>
            <p>
              Điểm được tính từ số nét, thứ tự, điểm đầu–cuối, quỹ đạo, hình dáng và vị
              trí tương đối.
            </p>
          </div>
          <button
            className="button button--primary"
            disabled={comparing}
            onClick={compare}
            type="button"
          >
            {comparing ? 'Đang chấm…' : 'So sánh nét viết'}
          </button>
          {compareError && (
            <p className="character-compare__error" role="alert">
              {compareError}
            </p>
          )}
          {auth.status !== 'signed-in' && (
            <p className="character-compare__auth">
              Kết quả hiện tại chưa được lưu.{' '}
              <Link state={{ from: location.pathname }} to="/login">
                Đăng nhập để lưu lần luyện
              </Link>
              .
            </p>
          )}
        </section>

        {result && (
          <section aria-live="polite" className={`character-result is-${result.level}`}>
            <div className="character-result__score">
              <strong>{result.score}</strong>
              <span>/ 100</span>
            </div>
            <div className="character-result__copy">
              <span>04 · Kết quả</span>
              <h2>{LEVEL_LABELS[result.level] || 'Kết quả luyện viết'}</h2>
              <p>
                {result.strokeCount} / {result.expectedStrokeCount} nét.
              </p>
              <ul>
                {(result.feedback || []).map((feedback, index) => (
                  <li
                    className={`is-${feedback.severity}`}
                    key={`${feedback.code}-${feedback.strokeNumber || index}`}
                  >
                    {feedback.message}
                  </li>
                ))}
              </ul>
              <button
                className="button button--secondary button--small"
                onClick={restart}
                type="button"
              >
                Luyện lại từ đầu
              </button>
            </div>
          </section>
        )}

        {auth.status === 'signed-in' && stats && (
          <aside
            className="character-attempt-stats"
            aria-label="Thống kê luyện viết của bạn"
          >
            <div>
              <span>Số lần luyện</span>
              <strong>{stats.count}</strong>
            </div>
            <div>
              <span>Điểm gần nhất</span>
              <strong>{stats.latest?.score ?? '—'}</strong>
            </div>
            <div>
              <span>Điểm tốt nhất</span>
              <strong>{stats.best?.score ?? '—'}</strong>
            </div>
          </aside>
        )}
      </div>
    </main>
  );
}
