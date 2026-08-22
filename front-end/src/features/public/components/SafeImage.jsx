import { useEffect, useState } from 'react';

export default function SafeImage({ alt, className = '', eager = false, src }) {
  const [failed, setFailed] = useState(!src);

  useEffect(() => {
    setFailed(!src);
  }, [src]);

  if (failed) {
    return (
      <div
        className={`public-image public-image--fallback ${className}`.trim()}
        role="img"
        aria-label={alt ? `${alt} - chưa có ảnh` : 'Chưa có ảnh'}
      >
        <span aria-hidden="true">M</span>
      </div>
    );
  }

  return (
    <div className={`public-image ${className}`.trim()}>
      <img
        src={src}
        alt={alt || ''}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
