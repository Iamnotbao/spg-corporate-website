import { useCallback, useEffect, useRef, useState } from 'react';
import {
  API_URL,
  deleteAdminChatSession,
  getAdminChatMessage,
  getAdminChatMessages,
  getAdminChatSettings,
  listAdminChatSessions,
  sendAdminChatMessage,
  updateAdminChatSession,
  updateAdminChatSettings,
} from '../../../services/chatService.js';
import AdminIcon from './AdminIcon.jsx';
import { AdminAlert, AdminConfirmDialog } from './AdminFeedback.jsx';
import { PAGE_SIZE_OPTIONS } from '../constants.js';

const DEFAULT_SETTINGS = {
  enabled: true,
  autoReplyEnabled: true,
  aiEnabled: false,
  aiConfigured: false,
  aiModel: '',
  welcomeMessage: '',
  fallbackMessage: '',
  facebookUrl: '',
  zaloUrl: '',
};

function sessionKey(item) {
  return String(item?.sessionId || '');
}

function messageKey(item) {
  return String(item?._id?.$oid || item?._id || '');
}

function mergeMessages(current, incoming) {
  const byId = new Map(current.map((item) => [messageKey(item), item]));
  incoming.forEach((item) => byId.set(messageKey(item), item));
  return [...byId.values()].sort((left, right) => {
    const time = new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
    return time || messageKey(left).localeCompare(messageKey(right));
  });
}

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  }).format(date);
}

export default function ChatPanel({ onNotify, onUnauthorized }) {
  const [sessions, setSessions] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('open');
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagePagination, setMessagePagination] = useState({
    limit: 50,
    hasMore: false,
    nextCursor: null,
  });
  const [reply, setReply] = useState('');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [error, setError] = useState('');
  const messagesRef = useRef(null);
  const messagesRequestRef = useRef(null);
  const nearBottomRef = useRef(true);
  const activeRef = useRef(null);
  const loadSessionsRef = useRef(null);

  const scrollToBottom = useCallback((behavior = 'auto') => {
    window.requestAnimationFrame(() => {
      const element = messagesRef.current;
      if (!element) return;
      element.scrollTo({ top: element.scrollHeight, behavior });
      nearBottomRef.current = true;
      setHasNewMessages(false);
    });
  }, []);

  const loadSessions = useCallback(
    async (page = 1) => {
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
    },
    [onUnauthorized, pagination.pageSize, search, status],
  );

  useEffect(() => {
    activeRef.current = active;
    loadSessionsRef.current = () => loadSessions(pagination.page);
  }, [active, loadSessions, pagination.page]);

  const loadMessages = useCallback(
    async (session, options = {}) => {
      if (!session?.sessionId) return;
      messagesRequestRef.current?.abort();
      const controller = new AbortController();
      messagesRequestRef.current = controller;
      const element = messagesRef.current;
      const previousHeight = element?.scrollHeight || 0;
      const previousTop = element?.scrollTop || 0;
      if (options.before) setLoadingOlder(true);
      try {
        const payload = await getAdminChatMessages(session.sessionId, {
          limit: 50,
          before: options.before,
          signal: controller.signal,
        });
        const incoming = payload?.data || [];
        setMessages((current) =>
          options.before ? mergeMessages(incoming, current) : incoming,
        );
        setMessagePagination(
          payload?.pagination || { limit: 50, hasMore: false, nextCursor: null },
        );
        if (payload?.session) {
          setActive((current) =>
            current?.sessionId === session.sessionId ? payload.session : current,
          );
        }
        if (options.before) {
          window.requestAnimationFrame(() => {
            const currentElement = messagesRef.current;
            if (currentElement) {
              currentElement.scrollTop =
                previousTop + currentElement.scrollHeight - previousHeight;
            }
          });
        } else {
          scrollToBottom();
        }
      } catch (requestError) {
        if (requestError?.name === 'AbortError') return;
        if (onUnauthorized(requestError)) return;
        setError(requestError?.message || 'Không thể tải hội thoại.');
      } finally {
        if (messagesRequestRef.current === controller) messagesRequestRef.current = null;
        setLoadingOlder(false);
      }
    },
    [onUnauthorized, scrollToBottom],
  );

  useEffect(() => () => messagesRequestRef.current?.abort(), []);

  useEffect(() => {
    getAdminChatSettings()
      .then((payload) => setSettings({ ...DEFAULT_SETTINGS, ...(payload?.data || {}) }))
      .catch((requestError) => {
        if (!onUnauthorized(requestError))
          setError(requestError?.message || 'Không thể tải cài đặt chat.');
      });
  }, [onUnauthorized]);

  useEffect(() => {
    setLoading(true);
    const timer = window.setTimeout(() => loadSessions(1), 250);
    return () => window.clearTimeout(timer);
  }, [loadSessions]);

  useEffect(() => {
    const source = new EventSource(`${API_URL}/events`);
    const refresh = async (event) => {
      loadSessionsRef.current?.();
      let update;
      try {
        update = JSON.parse(event.data);
      } catch {
        return;
      }
      const current = activeRef.current;
      if (!current?.sessionId || update?.sessionId !== current.sessionId) return;
      if (update.kind === 'deleted') {
        setActive(null);
        setMessages([]);
        setMessagePagination({ limit: 50, hasMore: false, nextCursor: null });
        return;
      }
      if (update.kind === 'messages' && Array.isArray(update.messageIds)) {
        const shouldScroll = nearBottomRef.current;
        try {
          const payloads = await Promise.all(
            update.messageIds.map((messageId) =>
              getAdminChatMessage(current.sessionId, messageId),
            ),
          );
          if (activeRef.current?.sessionId !== current.sessionId) return;
          setMessages((existing) =>
            mergeMessages(
              existing,
              payloads.map((payload) => payload?.data).filter(Boolean),
            ),
          );
        } catch (requestError) {
          if (!onUnauthorized(requestError)) {
            setError(requestError?.message || 'Không thể nhận tin nhắn mới.');
          }
          return;
        }
        if (shouldScroll) scrollToBottom('smooth');
        else setHasNewMessages(true);
      }
    };
    source.addEventListener('chat-updated', refresh);
    return () => source.close();
  }, [onUnauthorized, scrollToBottom]);

  async function selectSession(session) {
    setActive(session);
    setMessages([]);
    setMessagePagination({ limit: 50, hasMore: false, nextCursor: null });
    nearBottomRef.current = true;
    setHasNewMessages(false);
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
      const payload = await sendAdminChatMessage(active.sessionId, text);
      setReply('');
      setMessages((current) =>
        mergeMessages(current, payload?.data ? [payload.data] : []),
      );
      scrollToBottom('smooth');
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

  function handleMessageScroll(event) {
    const element = event.currentTarget;
    nearBottomRef.current =
      element.scrollHeight - element.scrollTop - element.clientHeight <= 80;
    if (nearBottomRef.current) setHasNewMessages(false);
  }

  async function loadOlderMessages() {
    if (
      !active ||
      !messagePagination.hasMore ||
      !messagePagination.nextCursor ||
      loadingOlder
    ) {
      return;
    }
    await loadMessages(active, { before: messagePagination.nextCursor });
  }

  async function confirmConversationDeletion() {
    if (!active?.sessionId || deleting) return;
    const deletedSessionId = active.sessionId;
    const targetPage =
      sessions.length === 1 && pagination.page > 1
        ? pagination.page - 1
        : pagination.page;
    setDeleting(true);
    setError('');
    try {
      await deleteAdminChatSession(deletedSessionId);
      setActive(null);
      setMessages([]);
      setMessagePagination({ limit: 50, hasMore: false, nextCursor: null });
      setConfirmDelete(false);
      onNotify('Đã xóa vĩnh viễn hội thoại và toàn bộ tin nhắn.');
      await loadSessions(targetPage);
    } catch (requestError) {
      if (onUnauthorized(requestError)) return;
      setError(requestError?.message || 'Không thể xóa hội thoại.');
    } finally {
      setDeleting(false);
    }
  }

  async function saveSettings(event) {
    event.preventDefault();
    setSavingSettings(true);
    setError('');
    try {
      const payload = await updateAdminChatSettings(settings);
      setSettings({ ...DEFAULT_SETTINGS, ...(payload?.data || {}) });
      onNotify('Đã cập nhật Chat, bot và liên kết mạng xã hội.');
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
            <label>
              <AdminIcon name="search" size={16} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm tên, email, nội dung…"
              />
            </label>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="open">Đang mở</option>
              <option value="closed">Đã đóng</option>
              <option value="">Tất cả</option>
            </select>
            <select
              aria-label="Số hội thoại mỗi trang"
              onChange={(event) =>
                setPagination((current) => ({
                  ...current,
                  page: 1,
                  pageSize: Number(event.target.value),
                }))
              }
              value={pagination.pageSize}
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}/trang
                </option>
              ))}
            </select>
          </div>
          <div className="admin-chat__session-list">
            {loading ? (
              <div className="admin-chat__empty">
                <span className="admin-spinner" /> Đang tải…
              </div>
            ) : sessions.length ? (
              sessions.map((item) => (
                <button
                  className={active?.sessionId === item.sessionId ? 'is-active' : ''}
                  key={sessionKey(item)}
                  type="button"
                  onClick={() => selectSession(item)}
                >
                  <span className="admin-chat__avatar">
                    {(item.name || 'K').charAt(0).toUpperCase()}
                  </span>
                  <span>
                    <strong>{item.name || 'Khách website'}</strong>
                    <small>{item.lastMessage || item.email || 'Hội thoại mới'}</small>
                  </span>
                  <span className="admin-chat__session-meta">
                    <small>{formatTime(item.updatedAt)}</small>
                    {item.unreadAdmin > 0 && <b>{Math.min(item.unreadAdmin, 99)}</b>}
                  </span>
                </button>
              ))
            ) : (
              <div className="admin-chat__empty">Không có hội thoại phù hợp.</div>
            )}
          </div>
          <div className="admin-chat__pager">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => loadSessions(pagination.page - 1)}
            >
              ←
            </button>
            <span>
              {pagination.page}/{pagination.totalPages}
            </span>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => loadSessions(pagination.page + 1)}
            >
              →
            </button>
          </div>
        </aside>

        <div className="admin-chat__conversation">
          {active ? (
            <>
              <header>
                <div>
                  <strong>{active.name || 'Khách website'}</strong>
                  <small>{active.email || active.sessionId}</small>
                </div>
                <div className="admin-chat__conversation-actions">
                  <button
                    className="admin-button admin-button--secondary"
                    type="button"
                    onClick={toggleStatus}
                  >
                    {active.status === 'closed' ? 'Mở lại' : 'Đóng chat'}
                  </button>
                  <button
                    className="admin-button admin-button--danger"
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                  >
                    <AdminIcon name="trash" size={16} /> Xóa hội thoại
                  </button>
                </div>
              </header>
              <div
                className="admin-chat__messages"
                onScroll={handleMessageScroll}
                ref={messagesRef}
              >
                {messagePagination.hasMore && (
                  <button
                    className="admin-chat__load-older"
                    disabled={loadingOlder}
                    onClick={loadOlderMessages}
                    type="button"
                  >
                    {loadingOlder ? 'Đang tải…' : 'Tải tin nhắn cũ hơn'}
                  </button>
                )}
                {messages.map((item, index) => (
                  <article
                    className={`is-${item.sender || 'bot'}`}
                    key={String(item?._id?.$oid || item?._id || index)}
                  >
                    <small>
                      {item.sender === 'visitor'
                        ? 'Khách'
                        : item.sender === 'admin'
                          ? item.userName || 'Admin'
                          : item.provider === 'openai'
                            ? 'Trợ lý AI'
                            : 'Trợ lý tự động'}{' '}
                      · {formatTime(item.createdAt)}
                    </small>
                    <p>{item.text}</p>
                  </article>
                ))}
                {!messages.length && (
                  <div className="admin-chat__empty">Chưa có tin nhắn.</div>
                )}
                {hasNewMessages && (
                  <button
                    className="admin-chat__new-message"
                    onClick={() => scrollToBottom('smooth')}
                    type="button"
                  >
                    Tin nhắn mới ↓
                  </button>
                )}
              </div>
              <form className="admin-chat__reply" onSubmit={submitReply}>
                <textarea
                  rows="2"
                  maxLength="1200"
                  disabled={active.status === 'closed'}
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  placeholder={
                    active.status === 'closed' ? 'Hội thoại đã đóng' : 'Nhập phản hồi…'
                  }
                />
                <button
                  className="admin-button admin-button--primary"
                  disabled={sending || active.status === 'closed' || !reply.trim()}
                  type="submit"
                >
                  {sending ? 'Đang gửi…' : 'Gửi'}
                </button>
              </form>
            </>
          ) : (
            <div className="admin-chat__empty admin-chat__empty--conversation">
              Chọn một hội thoại để bắt đầu.
            </div>
          )}
        </div>
      </div>

      <form className="admin-chat__settings" onSubmit={saveSettings}>
        <div className="admin-form-section__heading">
          <span>
            <AdminIcon name="settings" size={17} />
          </span>
          <div>
            <h3>Cấu hình Chat & Social</h3>
            <p>Chỉ các URL được nhập mới xuất hiện ngoài website.</p>
          </div>
        </div>
        <div className="admin-form-grid">
          <label className="admin-form-field">
            <span>Facebook URL</span>
            <input
              type="url"
              placeholder="https://facebook.com/..."
              value={settings.facebookUrl || ''}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  facebookUrl: event.target.value,
                }))
              }
            />
          </label>
          <label className="admin-form-field">
            <span>Zalo URL</span>
            <input
              type="url"
              placeholder="https://zalo.me/..."
              value={settings.zaloUrl || ''}
              onChange={(event) =>
                setSettings((current) => ({ ...current, zaloUrl: event.target.value }))
              }
            />
          </label>
        </div>
        <label className="admin-form-field admin-form-field--full">
          <span>Lời chào</span>
          <textarea
            rows="2"
            value={settings.welcomeMessage || ''}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                welcomeMessage: event.target.value,
              }))
            }
          />
        </label>
        <label className="admin-form-field admin-form-field--full">
          <span>Phản hồi mặc định khi FAQ/AI không trả lời</span>
          <textarea
            rows="2"
            value={settings.fallbackMessage || ''}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                fallbackMessage: event.target.value,
              }))
            }
          />
        </label>
        <div className="admin-chat__setting-switches">
          <label className="admin-switch-field">
            <input
              type="checkbox"
              checked={settings.enabled !== false}
              onChange={(event) =>
                setSettings((current) => ({ ...current, enabled: event.target.checked }))
              }
            />
            <span className="admin-switch-field__control" />
            <span>
              <strong>Bật Chat</strong>
            </span>
          </label>
          <label className="admin-switch-field">
            <input
              type="checkbox"
              checked={settings.autoReplyEnabled !== false}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  autoReplyEnabled: event.target.checked,
                }))
              }
            />
            <span className="admin-switch-field__control" />
            <span>
              <strong>Bật trả lời tự động</strong>
            </span>
          </label>
          <label className="admin-switch-field">
            <input
              type="checkbox"
              disabled={!settings.aiConfigured}
              checked={settings.aiEnabled === true}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  aiEnabled: event.target.checked,
                }))
              }
            />
            <span className="admin-switch-field__control" />
            <span>
              <strong>Dùng AI</strong>
              <small>
                {settings.aiConfigured
                  ? `Model: ${settings.aiModel || 'đã cấu hình'} · lỗi sẽ fallback FAQ`
                  : 'Chưa có OPENAI_API_KEY trên backend · đang dùng FAQ'}
              </small>
            </span>
          </label>
        </div>
        <button
          className="admin-button admin-button--primary"
          type="submit"
          disabled={savingSettings}
        >
          {savingSettings ? 'Đang lưu…' : 'Lưu cấu hình'}
        </button>
      </form>
      <AdminConfirmDialog
        confirmLabel="Xóa hội thoại"
        description="Toàn bộ tin nhắn trong hội thoại này sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác."
        loading={deleting}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={confirmConversationDeletion}
        open={confirmDelete}
        title="Xóa hội thoại này?"
      />
    </section>
  );
}
