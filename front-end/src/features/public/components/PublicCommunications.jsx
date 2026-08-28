import { useCallback, useEffect, useMemo, useState } from 'react';
import { API_URL, apiRequest, getStudentToken } from '../../../services/httpClient.js';
import {
  clearAllStudentNotifications,
  dismissStudentNotification,
  listStudentNotifications,
  markAllStudentNotificationsRead,
  markStudentNotificationRead,
} from '../../student/services/studentLearningService.js';
import '../../../styles/public-communications.css';

const GUEST_READ_KEY = 'mandora_guest_notification_reads';

function itemId(item, index = 0) {
  return String(item?._id?.$oid || item?._id || item?.id || `${item?.title || 'notification'}-${index}`);
}

function readGuestIds() {
  try {
    return new Set(JSON.parse(localStorage.getItem(GUEST_READ_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function rememberGuestRead(id) {
  const ids = readGuestIds();
  ids.add(id);
  localStorage.setItem(GUEST_READ_KEY, JSON.stringify([...ids].slice(-100)));
}

export default function PublicCommunications() {
  const signedIn = Boolean(getStudentToken());
  const [data, setData] = useState({ banner: null, notifications: [] });
  const [open, setOpen] = useState(false);
  const [flash, setFlash] = useState('');
  const [studentPage, setStudentPage] = useState(1);
  const [studentTotalPages, setStudentTotalPages] = useState(1);
  const [studentUnread, setStudentUnread] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async ({ append = false, page = 1 } = {}) => {
    try {
      const publicPayload = await apiRequest('/communications', { method: 'GET' });
      const banner = publicPayload?.data?.banner || null;
      if (!signedIn) {
        const guestReads = readGuestIds();
        const notifications = (publicPayload?.data?.notifications || []).slice(0, 5).map((item) => ({
          ...item,
          read: guestReads.has(itemId(item)),
        }));
        setData({ banner, notifications });
        return;
      }

      const payload = await listStudentNotifications({ page, pageSize: 5 });
      const incoming = payload?.data || [];
      setData((current) => ({
        banner,
        notifications: append
          ? [...current.notifications, ...incoming.filter((item) => !current.notifications.some((existing) => itemId(existing) === itemId(item)))]
          : incoming,
      }));
      setStudentPage(payload?.pagination?.page || page);
      setStudentTotalPages(payload?.pagination?.totalPages || 1);
      setStudentUnread(Number(payload?.unreadTotal) || 0);
    } catch {
      // Public communications are optional and should never block the page.
    }
  }, [signedIn]);

  useEffect(() => {
    load();
    const source = new EventSource(`${API_URL}/events`);
    const refresh = (event) => {
      try {
        const payload = JSON.parse(event.data || '{}');
        if (payload.kind === 'notification' && payload.action === 'created') {
          setFlash(payload.item?.title || 'Hanyora vừa có thông báo mới.');
          window.setTimeout(() => setFlash(''), 4500);
        }
      } catch {
        // A malformed realtime payload should not break the public shell.
      }
      setStudentPage(1);
      load({ page: 1 });
    };
    source.addEventListener('communications', refresh);
    return () => source.close();
  }, [load]);

  useEffect(() => {
    const openNotifications = () => setOpen(true);
    window.addEventListener('mandora:open-notifications', openNotifications);
    return () => window.removeEventListener('mandora:open-notifications', openNotifications);
  }, []);

  const notifications = useMemo(() => data.notifications, [data.notifications]);
  const banner = data.banner;
  const guestUnread = signedIn ? 0 : notifications.filter((item) => !item.read).length;
  const unreadCount = signedIn ? studentUnread : guestUnread;

  async function viewNotification(item) {
    const id = itemId(item);
    if (!item.read) {
      if (signedIn) {
        try {
          await markStudentNotificationRead(id);
          setStudentUnread((value) => Math.max(0, value - 1));
        } catch {
          return;
        }
      } else {
        rememberGuestRead(id);
      }
      setData((current) => ({
        ...current,
        notifications: current.notifications.map((entry) =>
          itemId(entry) === id ? { ...entry, read: true } : entry,
        ),
      }));
    }
  }

  async function dismissNotification(item) {
    if (!signedIn) return;
    const id = itemId(item);
    try {
      await dismissStudentNotification(id);
      setData((current) => ({
        ...current,
        notifications: current.notifications.filter((entry) => itemId(entry) !== id),
      }));
      if (!item.read) setStudentUnread((value) => Math.max(0, value - 1));
    } catch {
      // Keep the notification visible if dismissing fails.
    }
  }

  async function loadMore() {
    if (!signedIn || loadingMore || studentPage >= studentTotalPages) return;
    setLoadingMore(true);
    try {
      await load({ append: true, page: studentPage + 1 });
    } finally {
      setLoadingMore(false);
    }
  }

  async function markAllRead() {
    try {
      await markAllStudentNotificationsRead();
      setStudentUnread(0);
      setData((current) => ({
        ...current,
        notifications: current.notifications.map((item) => ({ ...item, read: true })),
      }));
    } catch {
      // Preserve the current list when the owned update fails.
    }
  }

  async function clearAll() {
    if (!window.confirm('Ẩn tất cả thông báo hiện có khỏi tài khoản của bạn?')) return;
    try {
      await clearAllStudentNotifications();
      setStudentUnread(0);
      setStudentPage(1);
      setStudentTotalPages(1);
      setData((current) => ({ ...current, notifications: [] }));
      setOpen(false);
    } catch {
      // Preserve the current list when the owned update fails.
    }
  }

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
            <div className="public-event-banner__content">
              <strong>{banner.title || 'Thông báo từ Hanyora'}</strong>
              {banner.message && (
                <div className="public-event-banner__marquee">
                  <span>{banner.message}</span>
                </div>
              )}
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
            aria-label={`Thông báo Hanyora, ${unreadCount} chưa xem`}
            className="public-notification-center__trigger"
            onClick={() => setOpen((current) => !current)}
            type="button"
          >
            <span aria-hidden="true">◔</span>
            {unreadCount > 0 && <b>{Math.min(unreadCount, 99)}</b>}
          </button>
          {open && (
            <section className="public-notification-center__panel" aria-label="Thông báo Hanyora">
              <header>
                <div>
                  <small>Hanyora</small>
                  <strong>Thông báo</strong>
                </div>
                <button aria-label="Đóng thông báo" onClick={() => setOpen(false)} type="button">×</button>
              </header>
              {signedIn && (
                <div className="public-notification-center__bulk-actions">
                  <button disabled={!studentUnread} onClick={markAllRead} type="button">
                    Đánh dấu tất cả đã đọc
                  </button>
                  <button onClick={clearAll} type="button">Xóa tất cả</button>
                </div>
              )}
              <div className="public-notification-center__list">
                {notifications.map((item, index) => (
                  <article
                    className={`${item.read ? 'is-read' : 'is-unread'} is-${item.type || 'info'}`}
                    key={itemId(item, index)}
                    onClick={() => viewNotification(item)}
                  >
                    <div className="public-notification-center__item-copy">
                      <strong>{item.title}</strong>
                      <p>{item.message}</p>
                      {item.link && <a href={item.link}>Xem thêm →</a>}
                    </div>
                    {signedIn && (
                      <button
                        aria-label={`Ẩn thông báo ${item.title}`}
                        className="public-notification-center__dismiss"
                        onClick={(event) => {
                          event.stopPropagation();
                          dismissNotification(item);
                        }}
                        type="button"
                      >
                        ×
                      </button>
                    )}
                  </article>
                ))}
              </div>
              {signedIn && studentPage < studentTotalPages && (
                <footer className="public-notification-center__footer">
                  <button disabled={loadingMore} onClick={loadMore} type="button">
                    {loadingMore ? 'Đang tải…' : 'Xem thêm thông báo'}
                  </button>
                </footer>
              )}
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
