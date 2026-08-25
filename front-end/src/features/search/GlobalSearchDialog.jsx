import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import HandwritingCanvas from '../learning/components/HandwritingCanvas.jsx';
import { recognizeHandwriting, searchPublic } from './searchService.js';
import './global-search.css';

const GROUPS = [
  ['courses', 'Khóa học'],
  ['lessons', 'Bài học'],
  ['vocabulary', 'Từ vựng'],
  ['characters', 'Hán tự'],
  ['posts', 'Blog'],
];

export default function GlobalSearchDialog({ onClose, open }) {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('idle');
  const [payload, setPayload] = useState(null);
  const [handwritingOpen, setHandwritingOpen] = useState(false);
  const [strokes, setStrokes] = useState([]);
  const [recognitionStatus, setRecognitionStatus] = useState('idle');
  const [candidates, setCandidates] = useState([]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setStatus('idle');
      setPayload(null);
      setHandwritingOpen(false);
      setStrokes([]);
      setCandidates([]);
      setRecognitionStatus('idle');
      return undefined;
    }
    const close = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose, open]);

  useEffect(() => {
    if (!open) return undefined;
    const normalized = query.trim();
    if (!normalized) {
      setStatus('idle');
      setPayload(null);
      return undefined;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setStatus('loading');
      searchPublic(normalized, { signal: controller.signal })
        .then((result) => {
          setPayload(result.data || null);
          setStatus('ready');
        })
        .catch((error) => {
          if (error?.name !== 'AbortError') setStatus('error');
        });
    }, 240);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, query]);

  const resultCount = useMemo(
    () =>
      GROUPS.reduce(
        (count, [key]) => count + (payload?.groups?.[key]?.length || 0),
        0,
      ),
    [payload],
  );

  function chooseResult(item) {
    onClose();
    navigate(item.url);
  }

  async function recognize() {
    if (!strokes.length) return;
    setRecognitionStatus('loading');
    try {
      const result = await recognizeHandwriting(strokes);
      setCandidates(result.data?.candidates || []);
      setRecognitionStatus('ready');
    } catch {
      setCandidates([]);
      setRecognitionStatus('error');
    }
  }

  function chooseCandidate(item) {
    setQuery(item.simplified);
    setHandwritingOpen(false);
  }

  if (!open) return null;

  return (
    <div className="global-search" role="dialog" aria-modal="true" aria-label="Tìm kiếm Mandora">
      <button className="global-search__scrim" onClick={onClose} type="button" aria-label="Đóng tìm kiếm" />
      <section className="global-search__panel">
        <header className="global-search__header">
          <div>
            <span>MANDORA SEARCH</span>
            <h2>Tìm mọi nội dung học tập</h2>
          </div>
          <button onClick={onClose} type="button" aria-label="Đóng">×</button>
        </header>

        <div className="global-search__bar">
          <span aria-hidden="true">⌕</span>
          <input
            autoFocus
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm chữ, Pinyin, nghĩa, bài học, khóa học…"
            value={query}
          />
          <button
            className={handwritingOpen ? 'is-active' : ''}
            onClick={() => setHandwritingOpen((value) => !value)}
            type="button"
          >
            ✍ Viết chữ
          </button>
        </div>

        {handwritingOpen && (
          <section className="global-search__handwriting">
            <div>
              <span>SEARCH BY HANDWRITING</span>
              <h3>Viết một Hán tự để tìm</h3>
              <p>Mandora so sánh nét viết với các Hán tự đã xuất bản và gợi ý tối đa 5 chữ gần nhất.</p>
            </div>
            <div className="global-search__handwriting-grid">
              <HandwritingCanvas
                guideVisible
                onChange={(next) => {
                  setStrokes(next);
                  setCandidates([]);
                  setRecognitionStatus('idle');
                }}
                ref={canvasRef}
              />
              <div className="global-search__handwriting-actions">
                <div>
                  <button onClick={() => canvasRef.current?.undo()} type="button">Hoàn tác</button>
                  <button onClick={() => canvasRef.current?.clear()} type="button">Xóa</button>
                </div>
                <button disabled={!strokes.length || recognitionStatus === 'loading'} onClick={recognize} type="button">
                  {recognitionStatus === 'loading' ? 'Đang nhận dạng…' : 'Nhận dạng chữ'}
                </button>
                {recognitionStatus === 'error' && <p>Không thể nhận dạng lúc này.</p>}
                {recognitionStatus === 'ready' && !candidates.length && <p>Chưa tìm thấy chữ phù hợp.</p>}
                {candidates.length > 0 && (
                  <div className="global-search__candidates">
                    {candidates.map((item) => (
                      <button key={item.id} onClick={() => chooseCandidate(item)} type="button">
                        <strong>{item.simplified}</strong>
                        <span>{item.pinyin}</span>
                        <small>{item.meaningVietnamese}</small>
                        <i>{item.score}%</i>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {!handwritingOpen && (
          <div className="global-search__results" aria-live="polite">
            {!query.trim() && (
              <div className="global-search__hint">
                <strong>Thử tìm:</strong> 你好, xingqi, buổi sáng, HSK 1…
              </div>
            )}
            {status === 'loading' && <div className="global-search__hint">Đang tìm kiếm…</div>}
            {status === 'error' && <div className="global-search__hint is-error">Không thể tìm kiếm lúc này.</div>}
            {status === 'ready' && resultCount === 0 && (
              <div className="global-search__hint">Không tìm thấy nội dung phù hợp.</div>
            )}
            {status === 'ready' &&
              GROUPS.map(([key, label]) => {
                const items = payload?.groups?.[key] || [];
                if (!items.length) return null;
                return (
                  <section className="global-search__group" key={key}>
                    <h3>{label}</h3>
                    <div>
                      {items.map((item) => (
                        <button key={`${item.type}-${item.id}`} onClick={() => chooseResult(item)} type="button">
                          <span>
                            <strong>{item.title}</strong>
                            <small>{item.subtitle}</small>
                          </span>
                          <i>→</i>
                        </button>
                      ))}
                    </div>
                  </section>
                );
              })}
          </div>
        )}
      </section>
    </div>
  );
}
