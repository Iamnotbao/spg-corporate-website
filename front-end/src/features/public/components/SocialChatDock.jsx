import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createPublicChatSession,
  getPublicChatMessages,
  getPublicChatSettings,
  publicChatEventsUrl,
  sendPublicChatMessage,
} from '../../../services/chatService.js';
import '../../../styles/social-chat.css';

const STORAGE_KEY = 'mandora-chat-session';

function safeUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

function loadStoredSession() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
    if (parsed?.sessionId && parsed?.clientToken) return parsed;
  } catch {
    // Ignore invalid local chat state.
  }
  return null;
}

function messageId(item, index) {
  return String(item?._id?.$oid || item?._id || `${item?.sender || 'message'}-${index}`);
}

export default function SocialChatDock() {
  const [settings, setSettings] = useState(null);
  const [session, setSession] = useState(loadStoredSession);
  const [messages, setMessages] = useState([]);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    getPublicChatSettings({ signal: controller.signal })
      .then((payload) => setSettings(payload?.data || null))
      .catch(() => setSettings(null));
    return () => controller.abort();
  }, []);

  const refreshMessages = useCallback(async (activeSession = session) => {
    if (!activeSession?.sessionId || !activeSession?.clientToken) return;
    try {
      const payload = await getPublicChatMessages(activeSession.sessionId, activeSession.clientToken);
      setMessages(payload?.data || []);
    } catch {
      // Keep chat usable; sending will surface actionable errors.
    }
  }, [session]);

  useEffect(() => {
    if (!session) return undefined;
    refreshMessages(session);
    const source = new EventSource(publicChatEventsUrl(session.sessionId, session.clientToken));
    source.addEventListener('message', () => refreshMessages(session));
    return () => source.close();
  }, [session?.sessionId, session?.clientToken]);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [messages, open]);

  async function ensureSession() {
    if (session) return session;
    const payload = await createPublicChatSession({});
    const next = payload?.data;
    if (!next?.sessionId || !next?.clientToken) throw new Error('Không thể mở phiên chat.');
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSession(next);
    return next;
  }

  async function submit(event) {
    event.preventDefault();
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    setError('');
    try {
      const active = await ensureSession();
      setText('');
      await sendPublicChatMessage({ sessionId: active.sessionId, clientToken: active.clientToken, text: value });
      await refreshMessages(active);
    } catch (requestError) {
      setError(requestError?.message || 'Không thể gửi tin nhắn.');
    } finally {
      setSending(false);
    }
  }

  if (!settings) return null;
  const facebookUrl = safeUrl(settings.facebookUrl);
  const zaloUrl = safeUrl(settings.zaloUrl);
  const chatEnabled = settings.enabled !== false;
  if (!facebookUrl && !zaloUrl && !chatEnabled) return null;

  return (
    <div className="public-social-chat">
      {open && chatEnabled && (
        <section className="public-chat-panel" aria-label="Chat với Hanyora">
          <header>
            <div><small>Hanyora Support</small><strong>Chat với admin</strong></div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Đóng chat">×</button>
          </header>
          <div className="public-chat-panel__messages" aria-live="polite">
            {!messages.length && <div className="public-chat-panel__welcome"><strong>Xin chào</strong><p>{settings.welcomeMessage || 'Hanyora có thể hỗ trợ bạn về khóa học, HSK, từ vựng và việc học tiếng Trung.'}</p></div>}
            {messages.map((item, index) => (
              <article className={`is-${item.sender || 'bot'}`} key={messageId(item, index)}>
                <small>{item.sender === 'visitor' ? 'Bạn' : item.sender === 'admin' ? 'Hanyora Admin' : item.provider === 'openai' ? 'Trợ lý AI' : 'Trợ lý tự động'}</small>
                <p>{item.text}</p>
              </article>
            ))}
            <div ref={endRef} />
          </div>
          {error && <p className="public-chat-panel__error">{error}</p>}
          <form onSubmit={submit}>
            <textarea rows="2" maxLength="1200" placeholder="Nhập tin nhắn…" value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} />
            <button disabled={sending || !text.trim()} type="submit" aria-label="Gửi tin nhắn">{sending ? '…' : '→'}</button>
          </form>
          <footer>Trợ lý tự động hỗ trợ câu hỏi phổ biến; admin Hanyora có thể tiếp quản hội thoại.</footer>
        </section>
      )}

      <div className="public-social-chat__buttons" aria-label="Liên hệ nhanh">
        {facebookUrl && <a href={facebookUrl} target="_blank" rel="noreferrer" aria-label="Facebook">f</a>}
        {zaloUrl && <a className="is-zalo" href={zaloUrl} target="_blank" rel="noreferrer" aria-label="Zalo">Z</a>}
        {chatEnabled && <button className="is-chat" type="button" onClick={() => setOpen((current) => !current)} aria-label="Chat ngay"><span aria-hidden="true">✦</span></button>}
      </div>
    </div>
  );
}
