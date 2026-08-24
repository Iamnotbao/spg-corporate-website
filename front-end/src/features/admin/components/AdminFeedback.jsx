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

export function AdminConfirmDialog({
  cancelLabel = 'Hủy',
  confirmLabel = 'Xác nhận',
  description,
  loading = false,
  onCancel,
  onConfirm,
  open,
  title,
  variant = 'danger',
}) {
  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape' && !loading) onCancel();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [loading, onCancel, open]);

  if (!open) return null;

  return (
    <div
      className="admin-confirm-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) onCancel();
      }}
      role="presentation"
    >
      <section
        aria-labelledby="admin-confirm-title"
        aria-modal="true"
        className="admin-confirm-dialog"
        role="dialog"
      >
        <div className={`admin-confirm-dialog__icon is-${variant}`}>
          <AdminIcon name={variant === 'danger' ? 'trash' : 'check'} size={24} />
        </div>
        <div className="admin-confirm-dialog__copy">
          <h2 id="admin-confirm-title">{title}</h2>
          {description && <p>{description}</p>}
        </div>
        <div className="admin-confirm-dialog__actions">
          <button
            className="admin-button admin-button--secondary"
            disabled={loading}
            onClick={onCancel}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            className={`admin-button ${variant === 'danger' ? 'admin-button--danger' : 'admin-button--primary'}`}
            disabled={loading}
            onClick={onConfirm}
            type="button"
          >
            {loading ? 'Đang xử lý…' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
