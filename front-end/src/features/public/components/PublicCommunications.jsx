import { useEffect, useMemo, useState } from 'react';
import { API_URL } from '../../../services/httpClient.js';

const STORAGE_KEY = 'spg_public_notifications_v1';

function getId(item) {
  return String(item?._id?.$oid || item?._id || item?.id || '');
}

function readLocalState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      read: Array.isArray(parsed.read) ? parsed.read : [],
      dismissed: Array.isArray(parsed.dismissed) ? parsed.dismissed : [],
    };
  } catch {
    return { read: [], dismissed: [] };
  }
}

export default function PublicCommunications() {
  const [banner, setBanner] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [localState, setLocalState] = useState(readLocalState);
  const [open, setOpen] = useState(false);

  async function refresh() {
    try {
      const response = await fetch(`${API_URL}/communications`);
      if (!response.ok) return;
      const payload = await response.json();
      setBanner(payload?.data?.banner || null);
      setNotifications(payload?.data?.notifications || []);
    } catch {
      // Public content remains usable if realtime communication is temporarily unavailable.
    }
  }

  useEffect(() => {
    refresh();
    const source = new EventSource(`${API_URL}/events`);
    source.addEventListener('communications', refresh);
    return () => source.close();
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(localState));
  }, [localState]);

  const visibleNotifications = useMemo(
    () => notifications
      .filter((item) => item.published !== false)
      .filter((item) => !localState.dismissed.includes(getId(item)))
      .slice(0, 20),
    [localState.dismissed, notifications],
  );

  const unreadCount = useMemo(
    () => visibleNotifications.filter((item) => !localState.read.includes(getId(item))).length,
    [localState.read, visibleNotifications],
  );

  function markRead(id, read = true) {
    setLocalState((current) => ({
      ...current,
      read: read
        ? [...new Set([...current.read, id])]
        : current.read.filter((item) => item !== id),
    }));
  }

  function dismiss(id) {
    setLocalState((current) => ({
      read: [...new Set([...current.read, id])],
      dismissed: [...new Set([...current.dismissed, id])],
    }));
  }

  function markAllRead() {
    setLocalState((current) => ({
      ...current,
      read: [...new Set([...current.read, ...visibleNotifications.map(getId)])],
    }));
  }

  return (
    <>
      {banner?.enabled && (banner.title || banner.message) && (
        <div className={`public-event-banner public-event-banner--${banner.style || 'event'}`}>
          <div className="public-container public-event-banner__inner">
            <span className="public-event-banner__pulse" aria-hidden="true" />
            <div className="public-event-banner__marquee">
              <div>
                <strong>{banner.title}</strong>
                {banner.message && <span>{banner.message}</span>}
              </div>
            </div>
            {banner.link && (
              <a href={banner.link}>
                Xem thêm <span aria-hidden="true">→</span>
              </a>
            )}
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
          {unreadCount > 0 && <span>{Math.min(unreadCount, 9)}</span>}
        </button>

        <div className={`public-notification-panel${open ? ' is-open' : ''}`}>
          <div className="public-notification-panel__heading">
            <div><small>SPG Updates</small><strong>Thông báo</strong></div>
            <div className="public-notification-panel__heading-actions">
              {unreadCount > 0 && <button type="button" onClick={markAllRead}>Đã xem tất cả</button>}
              <button type="button" aria-label="Đóng thông báo" onClick={() => setOpen(false)}>×</button>
            </div>
          </div>
          <div className="public-notification-panel__list">
            {visibleNotifications.map((item) => {
              const id = getId(item);
              const read = localState.read.includes(id);
              return (
                <article className={read ? 'is-read' : 'is-unread'} key={id}>
                  <span className={`public-notification-dot is-${item.type || 'info'}`} />
                  <div className="public-notification-copy">
                    {item.link ? (
                      <a href={item.link} onClick={() => markRead(id, true)}>
                        <strong>{item.title}</strong>
                        <p>{item.message}</p>
                      </a>
                    ) : (
                      <><strong>{item.title}</strong><p>{item.message}</p></>
                    )}
                    <div className="public-notification-actions">
                      <button type="button" onClick={() => markRead(id, !read)}>
                        {read ? 'Đánh dấu chưa xem' : 'Đánh dấu đã xem'}
                      </button>
                      <button type="button" onClick={() => dismiss(id)}>Ẩn</button>
                    </div>
                  </div>
                </article>
              );
            })}
            {!visibleNotifications.length && (
              <p className="public-notification-panel__empty">Hiện chưa có thông báo mới.</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
