import { useEffect } from 'react';
import { CONTENT_LABELS } from '../constants.js';
import { getItemSummary } from '../utils.js';
import AdminIcon from './AdminIcon.jsx';

export default function ContentDetailModal({ item, onClose, onEdit, type }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="admin-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <section
        aria-labelledby="admin-detail-title"
        aria-modal="true"
        className="admin-detail-modal"
        role="dialog"
      >
        <button
          aria-label="Đóng"
          className="admin-modal-close"
          onClick={onClose}
          type="button"
        >
          <AdminIcon name="close" size={19} />
        </button>

        {item.imageUrl && (
          <img alt="" className="admin-detail-modal__image" src={item.imageUrl} />
        )}

        <div className="admin-detail-modal__body">
          <p className="admin-eyebrow">Xem nhanh {CONTENT_LABELS[type].singular}</p>
          <h2 id="admin-detail-title">{item.title || 'Chưa có tiêu đề'}</h2>
          {type === 'jobs' && (
            <div className="admin-detail-modal__meta">
              <span>{item.location || 'Chưa có địa điểm'}</span>
              <span>{item.type || 'Chưa phân loại'}</span>
              {item.salary && <span>{item.salary}</span>}
            </div>
          )}
          <div className="admin-detail-modal__copy">
            {String(item.content || item.description || getItemSummary(item))
              .split('\n')
              .filter(Boolean)
              .map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
          </div>
          {type === 'jobs' && item.benefits && (
            <div className="admin-detail-modal__copy">
              <h3>Quyền lợi</h3>
              <p>{item.benefits}</p>
            </div>
          )}
          <div className="admin-detail-modal__actions">
            <button
              className="admin-button admin-button--secondary"
              onClick={onClose}
              type="button"
            >
              Đóng
            </button>
            <button
              className="admin-button admin-button--primary"
              onClick={() => onEdit(item)}
              type="button"
            >
              <AdminIcon name="edit" size={17} />
              Chỉnh sửa
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
