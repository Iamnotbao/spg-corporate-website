import { useEffect, useMemo, useRef, useState } from 'react';
import '../../../styles/image-lightbox.css';

const COPY = {
  close: 'Đóng',
  previous: 'Ảnh trước',
  next: 'Ảnh sau',
  zoomIn: 'Phóng to',
  zoomOut: 'Thu nhỏ',
  reset: 'Về 100%',
  hint: 'Dùng + / − để thu phóng · kéo ảnh khi đã phóng to',
};

function normalizeImages(images) {
  const seen = new Set();
  return (Array.isArray(images) ? images : []).map((item) => typeof item === 'string' ? { url: item } : item).filter((item) => {
    const url = String(item?.url || '').trim();
    if (!url || seen.has(url)) return false;
    seen.add(url);
    return true;
  });
}

export default function ImageLightbox({ images = [], index = null, onIndexChange, onClose }) {
  const t = COPY;
  const list = useMemo(() => normalizeImages(images), [images]);
  const open = Number.isInteger(index) && index >= 0 && index < list.length;
  const current = open ? list[index] : null;
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKey = (event) => {
      if (event.key === 'Escape') onClose?.();
      if (event.key === 'ArrowLeft' && list.length > 1) onIndexChange?.((index - 1 + list.length) % list.length);
      if (event.key === 'ArrowRight' && list.length > 1) onIndexChange?.((index + 1) % list.length);
      if (event.key === '+' || event.key === '=') setScale((value) => Math.min(4, value + 0.5));
      if (event.key === '-' || event.key === '_') setScale((value) => Math.max(1, value - 0.5));
      if (event.key === '0') { setScale(1); setOffset({ x: 0, y: 0 }); }
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKey);
    };
  }, [index, list.length, onClose, onIndexChange, open]);

  useEffect(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, [index]);

  if (!open || !current) return null;

  const previous = () => onIndexChange?.((index - 1 + list.length) % list.length);
  const next = () => onIndexChange?.((index + 1) % list.length);
  const zoomIn = () => setScale((value) => Math.min(4, value + 0.5));
  const zoomOut = () => setScale((value) => {
    const nextScale = Math.max(1, value - 0.5);
    if (nextScale === 1) setOffset({ x: 0, y: 0 });
    return nextScale;
  });
  const reset = () => { setScale(1); setOffset({ x: 0, y: 0 }); };

  function pointerDown(event) {
    if (scale <= 1) return;
    drag.current = { x: event.clientX, y: event.clientY, originX: offset.x, originY: offset.y };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }
  function pointerMove(event) {
    if (!drag.current || scale <= 1) return;
    setOffset({ x: drag.current.originX + event.clientX - drag.current.x, y: drag.current.originY + event.clientY - drag.current.y });
  }
  function pointerUp() { drag.current = null; }

  return (
    <div className="public-lightbox" role="dialog" aria-modal="true" aria-label={current.alt || 'Image viewer'}>
      <button className="public-lightbox__scrim" type="button" aria-label={t.close} onClick={onClose} />
      <header className="public-lightbox__header">
        <div><strong>{String(index + 1).padStart(2, '0')} / {String(list.length).padStart(2, '0')}</strong><span>{current.caption || current.alt || ''}</span></div>
        <button type="button" onClick={onClose} aria-label={t.close}>×</button>
      </header>
      <div className={`public-lightbox__stage${scale > 1 ? ' is-zoomed' : ''}`} onDoubleClick={() => scale > 1 ? reset() : setScale(2)} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}>
        <img src={current.url} alt={current.alt || current.caption || ''} draggable="false" style={{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})` }} />
      </div>
      {list.length > 1 && <><button className="public-lightbox__nav public-lightbox__nav--prev" type="button" onClick={previous} aria-label={t.previous}>←</button><button className="public-lightbox__nav public-lightbox__nav--next" type="button" onClick={next} aria-label={t.next}>→</button></>}
      <footer className="public-lightbox__toolbar">
        <div><button type="button" onClick={zoomOut} disabled={scale <= 1} aria-label={t.zoomOut}>−</button><button type="button" onClick={reset} aria-label={t.reset}>{Math.round(scale * 100)}%</button><button type="button" onClick={zoomIn} disabled={scale >= 4} aria-label={t.zoomIn}>+</button></div>
        <span>{t.hint}</span>
      </footer>
    </div>
  );
}
