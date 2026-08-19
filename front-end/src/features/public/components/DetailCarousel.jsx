import { useEffect, useMemo, useState } from 'react';
import SafeImage from './SafeImage.jsx';
import '../../../styles/detail-carousel-auto.css';

const AUTO_DELAY = 5500;

export default function DetailCarousel({ alt, images = [] }) {
  const list = useMemo(() => [...new Set(images.filter(Boolean))], [images]);
  const imageSignature = list.join('|');
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const hasMultipleImages = list.length > 1;

  useEffect(() => {
    setIndex(0);
  }, [imageSignature]);

  useEffect(() => {
    if (!hasMultipleImages || paused) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % list.length);
    }, AUTO_DELAY);
    return () => window.clearInterval(timer);
  }, [hasMultipleImages, list.length, paused, imageSignature]);

  const showPrevious = () => setIndex((current) => (current - 1 + list.length) % list.length);
  const showNext = () => setIndex((current) => (current + 1) % list.length);

  const handleKeyDown = (event) => {
    if (!hasMultipleImages) return;
    if (event.key === 'ArrowLeft') showPrevious();
    if (event.key === 'ArrowRight') showNext();
  };

  return (
    <section
      className="public-detail-carousel"
      aria-label={`Thư viện ảnh ${alt || ''}`}
      aria-roledescription="carousel"
      tabIndex={hasMultipleImages ? 0 : undefined}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
    >
      <SafeImage
        key={list[index] || 'fallback'}
        className="public-detail-carousel__image"
        src={list[index]}
        alt={hasMultipleImages ? `${alt} - ảnh ${index + 1}` : alt}
        eager
      />

      {hasMultipleImages && (
        <>
          <button className="public-detail-carousel__arrow public-detail-carousel__arrow--previous" type="button" aria-label="Ảnh trước" onClick={showPrevious}>←</button>
          <button className="public-detail-carousel__arrow public-detail-carousel__arrow--next" type="button" aria-label="Ảnh sau" onClick={showNext}>→</button>
          <div className="public-detail-carousel__footer">
            <div className="public-detail-carousel__dots">
              {list.map((image, dotIndex) => (
                <button key={image} type="button" aria-label={`Xem ảnh ${dotIndex + 1}`} aria-current={dotIndex === index ? 'true' : undefined} onClick={() => setIndex(dotIndex)} />
              ))}
            </div>
            <span aria-live="polite">{String(index + 1).padStart(2, '0')} / {String(list.length).padStart(2, '0')}</span>
          </div>
          <span className="public-detail-carousel__auto" aria-hidden="true">
            <i key={`${index}-${paused}`} className={paused ? 'is-paused' : ''} />
          </span>
        </>
      )}
    </section>
  );
}
