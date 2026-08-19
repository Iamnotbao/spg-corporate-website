import { useCallback, useEffect, useState } from 'react';
import {
  API_URL,
  getAdminChatMessages,
  getAdminChatSettings,
  listAdminChatSessions,
  sendAdminChatMessage,
  updateAdminChatSession,
  updateAdminChatSettings,
} from '../../../services/chatService.js';
import AdminIcon from './AdminIcon.jsx';
import { AdminAlert } from './AdminFeedback.jsx';

const DEFAULT_SETTINGS = {
  enabled: true,
  autoReplyEnabled: true,
  welcomeMessage: '',
  fallbackMessage: '',
  facebookUrl: '',
  zaloUrl: '',
};

function sessionKey(item) {
  return String(item?.sessionId || '');
}

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit',
  }).format(date);
}

export default function ChatPanel({ onNotify, onUnauthorized }) {
  const [sessions, setSessions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('open');
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [error, setError] = useState('');

  const loadSessions = useCallback(async (page = pagination.page) => {
    try {
      const payload = await listAdminChatSessions({
        page,
        pageSize: pagination.pageSize,
        search: search.trim(),
        status,
      });
      setSessions(payload?.data || []);
      setPagination((current) => ({ ...current, ...(payload?.pagination || {}) }));
    } catch (requestError) {
      if (onUnauthorized(requestError)) return;
      setError(requestError?.message || 'Không thể tải danh sách chat.');
    } finally {
      setLoading(false);
    }
  }, [onUnauthorized, pagination.page, pagination.pageSize, search, status]);

  const loadMessages = useCallback(async (session = active) => {
    if (!session?.sessionId) return;
    try {
      const payload = await getAdminChatMessages(session.sessionId);
      setMessages(payload?.data || []);
      if (payload?.session) setActive((current) => current?.sessionId === session.sessionId ? payload.session : current);
    } catch (requestError) {
      if (onUnauthorized(requestError)) return;
      setError(requestError?.message || 'Không thể tải hội thoại.');
    }
  }, [active, onUnauthorized]);

  useEffect(() => {
    getAdminChatSettings()
      .then((payload) => setSettings({ ...DEFAULT_SETTINGS, ...(payload?.data || {}) }))
      .catch((requestError) => {
        if (!onUnauthorized(requestError)) setError(requestError?.message || 'Không thể tải cài đặt chat.');
      });
  }, []);

  useEffect(() => {
    setLoading(true);
    const timer = window.setTimeout(() => loadSessions(1), 250);
    return () => window.clearTimeout(timer);
  }, [search, status, pagination.pageSize]);

  useEffect(() => {
    const source = new EventSource(`${API_URL}/events`);
    const refresh = () => {
      loadSessions();
      if (active?.sessionId) loadMessages(active);
    };
    source.addEventListener('chat-updated', refresh);
    return () => source.close();
  }, [active?.sessionId, loadSessions, loadMessages]);

  async function selectSession(session) {
    setActive(session);
    setMessages([]);
    setError('');
    await loadMessages(session);
    await loadSessions();
  }

  async function submitReply(event) {
    event.preventDefault();
    const text = reply.trim();
    if (!active?.sessionId || !text) return;
    setSending(true);
    setError('');
    try {
      await sendAdminChatMessage(active.sessionId, text);
      setReply('');
      await loadMessages(active);
      await loadSessions();
    } catch (requestError) {
      if (onUnauthorized(requestError)) return;
      setError(requestError?.message || 'Không thể gửi phản hồi.');
    } finally {
      setSending(false);
    }
  }

  async function toggleStatus() {
    if (!active?.sessionId) return;
    const next = active.status === 'closed' ? 'open' : 'closed';
    try {
      await updateAdminChatSession(active.sessionId, next);
      setActive((current) => ({ ...current, status: next }));
      onNotify(next === 'closed' ? 'Đã đóng hội thoại.' : 'Đã mở lại hội thoại.');
      await loadSessions();
    } catch (requestError) {
      if (onUnauthorized(requestError)) return;
      setError(requestError?.message || 'Không thể cập nhật hội thoại.');
    }
  }

  async function saveSettings(event) {
    event.preventDefault();
    setSavingSettings(true);
    setError('');
    try {
      const payload = await updateAdminChatSettings(settings);
      setSettings({ ...DEFAULT_SETTINGS, ...(payload?.data || {}) });
      onNotify('Đã cập nhật Chat và liên kết mạng xã hội.');
    } catch (requestError) {
      if (onUnauthorized(requestError)) return;
      setError(requestError?.message || 'Không thể lưu cài đặt chat.');
    } finally {
      setSavingSettings(false);
    }
  }

  return (
    <section className="admin-panel admin-chat">
      <div className="admin-panel__heading">
        <div>
          <h2>Chat & liên hệ nhanh</h2>
          <p>Tiếp nhận hội thoại website, phản hồi khách và quản lý Facebook/Zalo.</p>
        </div>
        <span className="admin-count-pill">{pagination.total} hội thoại</span>
      </div>

      {error && <AdminAlert>{error}</AdminAlert>}

      <div className="admin-chat__workspace">
        <aside className="admin-chat__sessions">
          <div className="admin-chat__filters">
            <label><AdminIcon name="search" size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tên, email, nội dung…" /></label>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="open">Đang mở</option>
              <option value="closed">Đã đóng</option>
              <option value="">Tất cả</option>
            </select>
          </div>
          <div className="admin-chat__session-list">
            {loading ? <div className="admin-chat__empty"><span className="admin-spinner" /> Đang tải…</div> : sessions.length ? sessions.map((item) => (
              <button className={active?.sessionId === item.sessionId ? 'is-active' : ''} key={sessionKey(item)} type="button" onClick={() => selectSession(item)}>
                <span className="admin-chat__avatar">{(item.name || 'K').charAt(0).toUpperCase()}</span>
                <span><strong>{item.name || 'Khách website'}</strong><small>{item.lastMessage || item.email || 'Hội thoại mới'}</small></span>
                <span className="admin-chat__session-meta"><small>{formatTime(item.updatedAt)}</small>{item.unreadAdmin > 0 && <b>{Math.min(item.unreadAdmin, 99)}</b>}</span>
              </button>
            )) : <div className="admin-chat__empty">Không có hội thoại phù hợp.</div>}
          </div>
          <div className="admin-chat__pager">
            <button type="button" disabled={pagination.page <= 1} onClick={() => loadSessions(pagination.page - 1)}>←</button>
            <span>{pagination.page}/{pagination.totalPages}</span>
            <button type="button" disabled={pagination.page >= pagination.totalPages} onClick={() => loadSessions(pagination.page + 1)}>→</button>
          </div>
        </aside>

        <div className="admin-chat__conversation">
          {active ? (
            <>
              <header>
                <div><strong>{active.name || 'Khách website'}</strong><small>{active.email || active.sessionId}</small></div>
                <button className="admin-button admin-button--secondary" type="button" onClick={toggleStatus}>{active.status === 'closed' ? 'Mở lại' : 'Đóng chat'}</button>
              </header>
              <div className="admin-chat__messages">
                {messages.map((item, index) => (
                  <article className={`is-${item.sender || 'bot'}`} key={String(item?._id?.$oid || item?._id || index)}>
                    <small>{item.sender === 'visitor' ? 'Khách' : item.sender === 'admin' ? item.userName || 'Admin' : 'Trợ lý tự động'} · {formatTime(item.createdAt)}</small>
                    <p>{item.text}</p>
                  </article>
                ))}
                {!messages.length && <div className="admin-chat__empty">Chưa có tin nhắn.</div>}
              </div>
              <form className="admin-chat__reply" onSubmit={submitReply}>
                <textarea rows="2" maxLength="1200" disabled={active.status === 'closed'} value={reply} onChange={(event) => setReply(event.target.value)} placeholder={active.status === 'closed' ? 'Hội thoại đã đóng' : 'Nhập phản hồi…'} />
                <button className="admin-button admin-button--primary" disabled={sending || active.status === 'closed' || !reply.trim()} type="submit">{sending ? 'Đang gửi…' : 'Gửi'}</button>
              </form>
            </>
          ) : <div className="admin-chat__empty admin-chat__empty--conversation">Chọn một hội thoại để bắt đầu.</div>}
        </div>
      </div>

      <form className="admin-chat__settings" onSubmit={saveSettings}>
        <div className="admin-form-section__heading"><span>⚙</span><div><h3>Cấu hình Chat & Social</h3><p>Chỉ các URL được nhập mới xuất hiện ngoài website.</p></div></div>
        <div className="admin-form-grid">
          <label className="admin-form-field"><span>Facebook URL</span><input type="url" placeholder="https://facebook.com/..." value={settings.facebookUrl || ''} onChange={(event) => setSettings((current) => ({ ...current, facebookUrl: event.target.value }))} /></label>
          <label className="admin-form-field"><span>Zalo URL</span><input type="url" placeholder="https://zalo.me/..." value={settings.zaloUrl || ''} onChange={(event) => setSettings((current) => ({ ...current, zaloUrl: event.target.value }))} /></label>
        </div>
        <label className="admin-form-field admin-form-field--full"><span>Lời chào</span><textarea rows="2" value={settings.welcomeMessage || ''} onChange={(event) => setSettings((current) => ({ ...current, welcomeMessage: event.target.value }))} /></label>
        <label className="admin-form-field admin-form-field--full"><span>Phản hồi mặc định của bot</span><textarea rows="2" value={settings.fallbackMessage || ''} onChange={(event) => setSettings((current) => ({ ...current, fallbackMessage: event.target.value }))} /></label>
        <div className="admin-chat__setting-switches">
          <label className="admin-switch-field"><input type="checkbox" checked={settings.enabled !== false} onChange={(event) => setSettings((current) => ({ ...current, enabled: event.target.checked }))} /><span className="admin-switch-field__control" /><span><strong>Bật Chat</strong></span></label>
          <label className="admin-switch-field"><input type="checkbox" checked={settings.autoReplyEnabled !== false} onChange={(event) => setSettings((current) => ({ ...current, autoReplyEnabled: event.target.checked }))} /><span className="admin-switch-field__control" /><span><strong>Bot tự động trả lời FAQ</strong></span></label>
        </div>
        <button className="admin-button admin-button--primary" type="submit" disabled={savingSettings}>{savingSettings ? 'Đang lưu…' : 'Lưu cấu hình'}</button>
      </form>
    </section>
  );
}
