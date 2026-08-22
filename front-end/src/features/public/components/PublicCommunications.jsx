import { useCallback, useEffect, useMemo, useState } from 'react';
import { API_URL, apiRequest } from '../../../services/httpClient.js';
import '../../../styles/public-communications.css';

function itemId(item, index) {
  return String(item?._id?.$oid || item?._id || `${item?.title || 'notification'}-${index}`);
}

export default function PublicCommunications() {
  const [data, setData] = useState({ banner: null, notifications: [] });
  const [open, setOpen] = useState(false);
  const [flash, setFlash] = useState('');

  const load = useCallback(async () => {
    try {
      const payload = await apiRequest('/communications', { method: 'GET' });
      setData({
        banner: payload?.data?.banner || null,
        notifications: payload?.data?.notifications || [],
      });
    } catch {
      // Public communications are optional and should never block the page.
    }
  }, []);

  useEffect(() => {
    load();
    const source = new EventSource(`${API_URL}/events`);
    const refresh = (event) => {
      try {
        const payload = JSON.parse(event.data || '{}');
        if (payload.kind === 'notification' && payload.action === 'created') {
          setFlash(payload.item?.title || 'Mandora vừa có thông báo mới.');
          window.setTimeout(() => setFlash(''), 4500);
        }
      } catch {
        // A malformed realtime payload should not break the public shell.
      }
      load();
    };
    source.addEventListener('communications', refresh);
    return () => source.close();
  }, [load]);

  const notifications = useMemo(() => data.notifications.slice(0, 20), [data.notifications]);
  const banner = data.banner;

  return (
    <>
      {banner && (
        <aside
          className={`public-event-banner is-${banner.style || 'event'}`}
          style={
            banner.backgroundImageUrl
              ? { '--event-background': `url("${banner.backgroundImageUrl}")` }
              : undefined
          }
        >
          <div className="public-container public-event-banner__inner">
            <div>
              <strong>{banner.title || 'Thông báo từ Mandora'}</strong>
              {banner.message && <span>{banner.message}</span>}
            </div>
            {banner.link && (
              <a href={banner.link}>Xem chi tiết <span aria-hidden="true">→</span></a>
            )}
          </div>
        </aside>
      )}

      {notifications.length > 0 && (
        <div className="public-notification-center">
          <button
            aria-expanded={open}
            aria-label={`Thông báo Mandora, ${notifications.length} mục`}
            className="public-notification-center__trigger"
            onClick={() => setOpen((current) => !current)}
            type="button"
          >
            <span aria-hidden="true">◔</span>
            <b>{Math.min(notifications.length, 99)}</b>
          </button>
          {open && (
            <section className="public-notification-center__panel" aria-label="Thông báo Mandora">
              <header>
                <div>
                  <small>Mandora</small>
                  <strong>Thông báo</strong>
                </div>
                <button aria-label="Đóng thông báo" onClick={() => setOpen(false)} type="button">×</button>
              </header>
              <div className="public-notification-center__list">
                {notifications.map((item, index) => (
                  <article className={`is-${item.type || 'info'}`} key={itemId(item, index)}>
                    <strong>{item.title}</strong>
                    <p>{item.message}</p>
                    {item.link && <a href={item.link}>Xem thêm →</a>}
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {flash && (
        <div className="public-realtime-flash" role="status">
          <span aria-hidden="true">✓</span>
          <p>{flash}</p>
        </div>
      )}
    </>
  );
}
