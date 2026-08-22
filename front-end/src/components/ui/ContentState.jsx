export function LoadingState({ count = 3, label = 'Đang tải nội dung' }) {
  return (
    <div aria-busy="true" aria-label={label} className="content-state-grid" role="status">
      {Array.from({ length: count }, (_, index) => (
        <article aria-hidden="true" className="content-skeleton" key={index}>
          <span className="content-skeleton__visual" />
          <span className="content-skeleton__line content-skeleton__line--short" />
          <span className="content-skeleton__line content-skeleton__line--title" />
          <span className="content-skeleton__line" />
        </article>
      ))}
      <span className="visually-hidden">{label}</span>
    </div>
  );
}

export function EmptyState({
  action,
  description,
  icon = '空',
  title = 'Chưa có nội dung',
}) {
  return (
    <div className="content-state content-state--empty">
      <span aria-hidden="true" className="content-state__icon">
        {icon}
      </span>
      <div>
        <strong>{title}</strong>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({ message = 'Không thể tải nội dung.', onRetry }) {
  return (
    <div className="content-state content-state--error" role="alert">
      <span aria-hidden="true" className="content-state__icon">
        !
      </span>
      <div>
        <strong>Đã có lỗi xảy ra</strong>
        <p>{message}</p>
      </div>
      {onRetry && (
        <button
          className="button button--secondary button--small"
          onClick={onRetry}
          type="button"
        >
          Thử lại
        </button>
      )}
    </div>
  );
}
