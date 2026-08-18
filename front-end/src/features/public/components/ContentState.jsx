export function CardSkeletons({ count = 3 }) {
  return (
    <div className="public-card-grid" aria-label="Đang tải nội dung" aria-busy="true">
      {Array.from({ length: count }, (_, index) => (
        <div className="public-skeleton-card" key={index} aria-hidden="true">
          <div className="public-skeleton public-skeleton--media" />
          <div className="public-skeleton-card__body">
            <div className="public-skeleton public-skeleton--short" />
            <div className="public-skeleton public-skeleton--heading" />
            <div className="public-skeleton public-skeleton--line" />
            <div className="public-skeleton public-skeleton--line" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ContentError({ message = 'Không thể tải nội dung.', onRetry }) {
  return (
    <div className="public-state public-state--error" role="alert">
      <span className="public-state__icon" aria-hidden="true">
        !
      </span>
      <div>
        <strong>Đã có lỗi xảy ra</strong>
        <p>{message}</p>
      </div>
      {onRetry && (
        <button type="button" onClick={onRetry}>
          Thử lại
        </button>
      )}
    </div>
  );
}

export function EmptyState({ children }) {
  return (
    <div className="public-state public-state--empty">
      <span className="public-state__icon" aria-hidden="true">
        +
      </span>
      <p>{children}</p>
    </div>
  );
}

export function DetailLoading({ label }) {
  return (
    <div
      className="public-container public-detail-loading"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="public-skeleton public-skeleton--short" />
      <div className="public-skeleton public-skeleton--title" />
      <div className="public-skeleton public-skeleton--detail-media" />
      <span className="public-visually-hidden">{label}</span>
    </div>
  );
}
