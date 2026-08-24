import { useEffect } from 'react';

export default function PublicToast({ message, onClose, variant = 'success' }) {
  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(onClose, 3200);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className={`public-toast is-${variant}`} role={variant === 'error' ? 'alert' : 'status'}>
      <span className="public-toast__icon" aria-hidden="true">
        {variant === 'error' ? '!' : '✓'}
      </span>
      <p>{message}</p>
      <button aria-label="Đóng thông báo" onClick={onClose} type="button">
        ×
      </button>
    </div>
  );
}
