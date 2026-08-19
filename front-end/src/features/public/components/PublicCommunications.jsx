import { useEffect, useMemo, useState } from 'react';
import { API_URL } from '../../../services/httpClient.js';

function getId(item) {
  return String(item?._id?.$oid || item?._id || item?.id || '');
}

export default function PublicCommunications() {
  const [banner, setBanner] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);

  async function refresh() {
    try {
      const response = await fetch(`${API_URL}/communications`);
      if (!response.ok) return;
      const payload = await response.json();
      setBanner(payload?.data?.banner || null);
      setNotifications(payload?.data?.notifications || []);
    } catch {
      // Keep the public website usable when the realtime service is unavailable.
    }
  }

  useEffect(() => {
    refresh();
    const source = new EventSource(`${API_URL}/events`);
    source.addEventListener('communications', refresh);
    return () => source.close();
  }, []);

  const visibleNotifications = useMemo(
    () => notifications.filter((item) => item.published !== false).slice(0, 8),
    [notifications],
  );

  return (
    <>
      {banner?.enabled && (banner.title || banner.message) && (
        <div className={`public-event-banner public-event-banner--${banner.style || 'event'}`}>
          <div className="public-container public-event-banner__inner">
            <span className="public-event-banner__pulse" aria-hidden="true" />
            <div className="public-event-banner__marquee">
              <strong>{banner.title}</strong>
              {banner.message && <span>{banner.message}</span>}
            </div>
            {banner.link && <a href={banner.link}>Xem thêm <span aria-hidden="true">→</span></a>}
          </div>
        </div>
      )}

      <div className="public-notification-dock">
        <button
          className={`public-notification-button${open ? ' is-open' : ''}`}
          type="button"
          aria-label="Thông báo"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
            <path d="M10 21h4" />
          </svg>
          {visibleNotifications.length > 0 && <span>{Math.min(visibleNotifications.length, 9)}</span>}
        </button>

        <div className={`public-notification-panel${open ? ' is-open' : ''}`}>
          <div className="public-notification-panel__heading">
            <div><small>SPG Updates</small><strong>Thông báo</strong></div>
            <button type="button" aria-label="Đóng thông báo" onClick={() => setOpen(false)}>×</button>
          </div>
          <div className="public-notification-panel__list">
            {visibleNotifications.map((item) => {
              const content = (
                <><span className={`is-${item.type || 'info'}`} /><div><strong>{item.title}</strong><p>{item.message}</p></div></>
              );
              return item.link ? (
                <a key={getId(item)} href={item.link} onClick={() => setOpen(false)}>{content}</a>
              ) : (
                <article key={getId(item)}>{content}</article>
              );
            })}
            {!visibleNotifications.length && <p className="public-notification-panel__empty">Hiện chưa có thông báo mới.</p>}
          </div>
        </div>
      </div>
    </>
  );
}
