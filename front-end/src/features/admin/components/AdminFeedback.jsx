import { useEffect } from 'react';
import AdminIcon from './AdminIcon.jsx';

export function AdminAlert({ children, onRetry, variant = 'error' }) {
  return (
    <div className={`admin-alert admin-alert--${variant}`} role="alert">
      <AdminIcon name={variant === 'error' ? 'warning' : 'check'} size={19} />
      <span>{children}</span>
      {onRetry && (
        <button onClick={onRetry} type="button">
          Thử lại
        </button>
      )}
    </div>
  );
}

export function AdminEmpty({ children, title }) {
  return (
    <div className="admin-empty">
      <div className="admin-empty__icon">
        <AdminIcon name="search" size={26} />
      </div>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}

export function AdminSkeletonRows({ count = 5 }) {
  return (
    <div className="admin-skeleton-list" aria-label="Đang tải" role="status">
      {Array.from({ length: count }, (_, index) => (
        <div className="admin-skeleton-row" key={index}>
          <span />
          <span />
          <span />
        </div>
      ))}
      <span className="admin-sr-only">Đang tải dữ liệu…</span>
    </div>
  );
}

export function AdminToast({ message, onClose, variant = 'success' }) {
  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(onClose, 4_000);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className={`admin-toast admin-toast--${variant}`} role="status">
      <AdminIcon name={variant === 'success' ? 'check' : 'warning'} />
      <span>{message}</span>
      <button aria-label="Đóng thông báo" onClick={onClose} type="button">
        <AdminIcon name="close" size={17} />
      </button>
    </div>
  );
}
