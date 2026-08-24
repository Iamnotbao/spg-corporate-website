import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useStudentAuth } from '../../auth/StudentAuthContext.jsx';
import HandwritingCanvas from './HandwritingCanvas.jsx';
import StrokeOrderPlayer from './StrokeOrderPlayer.jsx';
import {
  compareCharacter,
  getCharacterStrokeData,
  getPublicCharacter,
  submitCharacterAttempt,
} from '../services/characterService.js';
import '../styles/learning-integration.css';

const LEVEL_LABELS = {
  excellent: 'Rất sát mẫu',
  good: 'Khá tốt',
  keep_practicing: 'Tiếp tục luyện',
  try_again: 'Thử lại nhé',
};

export default function CharacterPracticeModal({ character, onClose }) {
  const auth = useStudentAuth();
  const location = useLocation();
  const canvasRef = useRef(null);
  const [state, setState] = useState({ status: 'loading', item: null, strokeData: null, error: '' });
  const [strokes, setStrokes] = useState([]);
  const [guideVisible, setGuideVisible] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [result, setResult] = useState(null);
  const [compareError, setCompareError] = useState('');

  useEffect(() => {
    if (!character) return undefined;
    const controller = new AbortController();
    setState({ status: 'loading', item: null, strokeData: null, error: '' });
    Promise.all([
      getPublicCharacter(character, { signal: controller.signal }),
      getCharacterStrokeData(character, { signal: controller.signal }),
    ])
      .then(([characterResponse, strokeResponse]) =>
        setState({
          status: 'ready',
          item: characterResponse.data,
          strokeData: strokeResponse.data.data,
          error: '',
        }),
      )
      .catch((error) => {
        if (error.name === 'AbortError') return;
        setState({
          status: 'error',
          item: null,
          strokeData: null,
          error:
            error.status === 404
              ? 'Hán tự này chưa được xuất bản để luyện viết.'
              : error.message || 'Không thể tải bài luyện viết.',
        });
      });
    return () => controller.abort();
  }, [character]);

  useEffect(() => {
    if (!character) return undefined;
    const handleKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKey);
    };
  }, [character, onClose]);

  if (!character) return null;

  async function compare() {
    if (!state.item || !strokes.length) return;
    setComparing(true);
    setCompareError('');
    try {
      if (auth.status === 'signed-in') {
        const response = await submitCharacterAttempt(state.item.id, strokes);
        const attempt = response.data;
        setResult({
          score: attempt.score,
          strokeCount: attempt.strokeCount,
          ...attempt.summary,
        });
      } else {
        const response = await compareCharacter(state.item.simplified, strokes);
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

  return (
    <div
      className="character-practice-modal"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        aria-label={`Luyện viết chữ ${character}`}
        aria-modal="true"
        className="character-practice-modal__dialog"
        role="dialog"
      >
        <header className="character-practice-modal__header">
          <div>
            <span>Luyện viết ngay trong bài học</span>
            <h2>{state.item ? `${state.item.simplified} · ${state.item.pinyin}` : character}</h2>
            {state.item && <p>{state.item.meaningVietnamese} · {state.item.strokeCount} nét</p>}
          </div>
          <button aria-label="Đóng luyện viết" onClick={onClose} type="button">×</button>
        </header>

        {state.status === 'loading' && <div className="character-practice-modal__state">Đang tải thứ tự nét…</div>}
        {state.status === 'error' && (
          <div className="character-practice-modal__state is-error">
            <strong>Chưa thể luyện chữ {character}</strong>
            <p>{state.error}</p>
            <Link to="/characters" onClick={onClose}>Xem danh sách Hán tự →</Link>
          </div>
        )}
        {state.status === 'ready' && (
          <div className="character-practice-modal__body">
            <StrokeOrderPlayer character={state.item.strokeDataKey} data={state.strokeData} />
            <section className="character-practice-modal__write">
              <div className="practice-section-heading">
                <span>Viết thử</span>
                <h3>Viết trên ô 米</h3>
              </div>
              <HandwritingCanvas guideVisible={guideVisible} onChange={setStrokes} ref={canvasRef} />
              <div className="handwriting-practice__controls">
                <button className="button button--secondary button--small" onClick={() => setGuideVisible((value) => !value)} type="button">
                  {guideVisible ? 'Ẩn ô hướng dẫn' : 'Hiện ô hướng dẫn'}
                </button>
                <button className="button button--secondary button--small" disabled={!strokes.length} onClick={() => canvasRef.current?.undo()} type="button">Hoàn tác</button>
                <button className="button button--secondary button--small" disabled={!strokes.length} onClick={clear} type="button">Xóa</button>
                <button className="button button--primary button--small" disabled={!strokes.length || comparing} onClick={compare} type="button">
                  {comparing ? 'Đang chấm…' : 'So sánh'}
                </button>
              </div>
              {compareError && <p className="character-compare__error" role="alert">{compareError}</p>}
              {auth.status !== 'signed-in' && (
                <p className="character-compare__auth">
                  Bạn đang luyện ở chế độ khách. <Link state={{ from: location.pathname }} to="/login">Đăng nhập để lưu kết quả</Link>.
                </p>
              )}
              {result && (
                <div aria-live="polite" className={`character-practice-modal__result is-${result.level}`}>
                  <strong>{result.score}<small>/100</small></strong>
                  <div>
                    <h3>{LEVEL_LABELS[result.level] || 'Kết quả luyện viết'}</h3>
                    <p>{result.strokeCount} / {result.expectedStrokeCount} nét</p>
                    <ul>
                      {(result.feedback || []).slice(0, 4).map((feedback, index) => (
                        <li key={`${feedback.code}-${feedback.strokeNumber || index}`}>{feedback.message}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              <Link
                className="character-practice-modal__full-link"
                onClick={onClose}
                to={`/characters/${encodeURIComponent(state.item.simplified)}/practice`}
              >
                Mở trang luyện tập đầy đủ →
              </Link>
            </section>
          </div>
        )}
      </section>
    </div>
  );
}
