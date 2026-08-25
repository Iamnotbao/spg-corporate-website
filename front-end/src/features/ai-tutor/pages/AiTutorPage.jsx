import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { usePageTitle } from '../../../hooks/usePageTitle.js';
import {
  getAiTutorStatus,
  listAiConversations,
  listAiMessages,
  sendAiMessage,
} from '../services/aiTutorService.js';
import '../styles/ai-tutor.css';

const QUICK_ACTIONS = [
  {
    label: 'Giải thích ngữ pháp',
    prompt: 'Hãy giải thích điểm ngữ pháp này bằng tiếng Việt và cho hai ví dụ dễ hiểu.',
  },
  {
    label: 'Sửa câu tiếng Trung',
    prompt: 'Hãy sửa câu tiếng Trung sau, giải thích lỗi và viết lại tự nhiên hơn: ',
  },
  {
    label: 'Luyện từ vựng',
    prompt: 'Hãy giúp tôi luyện từ vựng với ví dụ ngắn và một câu hỏi kiểm tra.',
  },
  {
    label: 'Giải thích lỗi quiz',
    prompt: 'Hãy giải thích lỗi trong bài Quiz của tôi và cách tránh lặp lại lỗi đó.',
  },
  {
    label: 'Cho tôi bài tập ngắn',
    prompt: 'Hãy tạo một bài tập tiếng Trung ngắn phù hợp với nội dung đang học.',
  },
];

const CONTEXT_PARAMS = [
  ['lesson', 'lesson', 'Ngữ cảnh bài học'],
  ['vocabulary', 'vocabulary', 'Ngữ cảnh từ vựng'],
  ['quizAttempt', 'quizAttempt', 'Ngữ cảnh kết quả Quiz'],
];

function contextFromSearch(search) {
  const params = new URLSearchParams(search);
  for (const [key, type, label] of CONTEXT_PARAMS) {
    const id = params.get(key);
    if (id) return { type, id, label };
  }
  return { type: 'general', label: 'Trao đổi chung' };
}

function initialPrompt(location, context) {
  if (location.state?.initialPrompt) return String(location.state.initialPrompt);
  if (context.type === 'lesson') {
    return 'Hãy giải thích nội dung chính và điểm cần nhớ trong bài học này.';
  }
  if (context.type === 'vocabulary') {
    return 'Hãy giải thích cách dùng từ này và cho ví dụ dễ nhớ.';
  }
  if (context.type === 'quizAttempt') {
    return 'Hãy giải thích các câu tôi làm sai và cách tránh lỗi tương tự.';
  }
  return '';
}

function formatTime(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function AssistantMessage({ message, onFollowUp }) {
  return (
    <article className="ai-message ai-message--assistant">
      <div className="ai-message__identity" aria-hidden="true">
        文
      </div>
      <div className="ai-message__content">
        <strong>Mandora AI</strong>
        <p>{message.text}</p>
        {message.examples?.length > 0 && (
          <ul>
            {message.examples.map((example, index) => (
              <li key={`${example}-${index}`}>{example}</li>
            ))}
          </ul>
        )}
        {message.followUp && (
          <button onClick={() => onFollowUp(message.followUp)} type="button">
            {message.followUp}
          </button>
        )}
        <time dateTime={message.createdAt}>{formatTime(message.createdAt)}</time>
      </div>
    </article>
  );
}

function UserMessage({ message }) {
  return (
    <article className="ai-message ai-message--user">
      <div className="ai-message__content">
        <strong>Bạn</strong>
        <p>{message.text}</p>
        <time dateTime={message.createdAt}>{formatTime(message.createdAt)}</time>
      </div>
    </article>
  );
}

export default function AiTutorPage() {
  usePageTitle('AI Gia sư');
  const location = useLocation();
  const context = useMemo(() => contextFromSearch(location.search), [location.search]);
  const [input, setInput] = useState(() => initialPrompt(location, context));
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState('');
  const [conversations, setConversations] = useState([]);
  const [providerStatus, setProviderStatus] = useState({ status: 'loading' });
  const [requestState, setRequestState] = useState({
    status: 'idle',
    error: '',
    code: '',
  });
  const [historyState, setHistoryState] = useState({ status: 'loading', error: '' });
  const [resolvedContext, setResolvedContext] = useState(null);
  const [lastAttempt, setLastAttempt] = useState('');
  const messagesRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);
  const generatingTimer = useRef(null);

  const loadConversations = useCallback(async () => {
    try {
      const response = await listAiConversations();
      setConversations(response.data || []);
      setHistoryState({ status: 'ready', error: '' });
    } catch (error) {
      setHistoryState({ status: 'error', error: error.message });
    }
  }, []);

  useEffect(() => {
    Promise.all([getAiTutorStatus(), listAiConversations()])
      .then(([statusResponse, conversationsResponse]) => {
        setProviderStatus({ status: 'ready', ...statusResponse.data });
        setConversations(conversationsResponse.data || []);
        setHistoryState({ status: 'ready', error: '' });
      })
      .catch((error) => {
        setProviderStatus({ status: 'error', available: false, error: error.message });
        setHistoryState({ status: 'error', error: error.message });
      });
  }, []);

  useEffect(() => {
    setConversationId('');
    setMessages([]);
    setResolvedContext(null);
    setInput(initialPrompt(location, context));
    setRequestState({ status: 'idle', error: '', code: '' });
    shouldAutoScrollRef.current = true;
  }, [context, location]);

  useEffect(() => {
    const container = messagesRef.current;
    if (!container || !shouldAutoScrollRef.current) return;

    const frame = window.requestAnimationFrame(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'auto'
          : 'smooth',
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [messages, requestState.status]);

  useEffect(
    () => () => {
      if (generatingTimer.current) window.clearTimeout(generatingTimer.current);
    },
    [],
  );

  function startNewConversation() {
    setConversationId('');
    setMessages([]);
    setResolvedContext(null);
    setRequestState({ status: 'idle', error: '', code: '' });
    setInput(initialPrompt(location, context));
    shouldAutoScrollRef.current = true;
  }

  async function openConversation(id) {
    if (requestState.status === 'sending' || requestState.status === 'generating') return;
    setHistoryState({ status: 'loading', error: '' });
    try {
      const response = await listAiMessages(id);
      shouldAutoScrollRef.current = true;
      setConversationId(id);
      setMessages(response.data || []);
      setResolvedContext(
        response.data?.findLast((item) => item.context)?.context || null,
      );
      setRequestState({ status: 'idle', error: '', code: '' });
      setHistoryState({ status: 'ready', error: '' });
    } catch (error) {
      setHistoryState({ status: 'error', error: error.message });
    }
  }

  async function submitMessage(event, retryMessage = '') {
    event?.preventDefault();
    const message = String(retryMessage || input).trim();
    if (!message || !providerStatus.available) return;
    shouldAutoScrollRef.current = true;
    setLastAttempt(message);
    setInput('');
    setRequestState({ status: 'sending', error: '', code: '' });
    const optimisticId = `pending-${Date.now()}`;
    setMessages((current) => [
      ...current,
      {
        id: optimisticId,
        role: 'user',
        text: message,
        createdAt: new Date().toISOString(),
      },
    ]);
    generatingTimer.current = window.setTimeout(
      () => setRequestState((current) => ({ ...current, status: 'generating' })),
      300,
    );

    try {
      const response = await sendAiMessage({
        conversationId,
        context: resolvedContext?.id
          ? { type: resolvedContext.type, id: resolvedContext.id }
          : context.id
            ? { type: context.type, id: context.id }
            : { type: 'general' },
        message,
      });
      if (generatingTimer.current) window.clearTimeout(generatingTimer.current);
      const result = response.data;
      setConversationId(result.conversation.id);
      setResolvedContext(result.context);
      setMessages((current) => [
        ...current.filter((item) => item.id !== optimisticId),
        result.userMessage,
        result.message,
      ]);
      setRequestState({ status: 'success', error: '', code: '' });
      await loadConversations();
    } catch (error) {
      if (generatingTimer.current) window.clearTimeout(generatingTimer.current);
      setMessages((current) => current.filter((item) => item.id !== optimisticId));
      setRequestState({
        status: error.status === 429 ? 'rate-limited' : 'error',
        error: error.message,
        code: error.payload?.code || '',
      });
    }
  }

  const busy = ['sending', 'generating'].includes(requestState.status);
  const contextLabel = resolvedContext?.label || context.label;

  return (
    <main className="ai-tutor-page">
      <div className="public-container ai-tutor-shell">
        <aside className="ai-tutor-history" aria-label="Lịch sử AI Gia sư">
          <header>
            <div>
              <span className="ai-tutor-mark" aria-hidden="true">
                文
              </span>
              <div>
                <strong>AI Gia sư</strong>
                <small>Mandora</small>
              </div>
            </div>
            <button
              aria-label="Bắt đầu hội thoại mới"
              onClick={startNewConversation}
              title="Hội thoại mới"
              type="button"
            >
              +
            </button>
          </header>
          <div className="ai-tutor-history__list">
            {historyState.status === 'loading' && <p>Đang tải lịch sử…</p>}
            {historyState.status === 'error' && (
              <button
                className="ai-tutor-history__retry"
                onClick={loadConversations}
                type="button"
              >
                Thử tải lại
              </button>
            )}
            {historyState.status === 'ready' && conversations.length === 0 && (
              <p>Chưa có hội thoại.</p>
            )}
            {conversations.map((item) => (
              <button
                aria-current={conversationId === item.id ? 'page' : undefined}
                className={conversationId === item.id ? 'is-active' : undefined}
                key={item.id}
                onClick={() => openConversation(item.id)}
                type="button"
              >
                <strong>{item.title}</strong>
                <time dateTime={item.updatedAt}>{formatTime(item.updatedAt)}</time>
              </button>
            ))}
          </div>
          <p className="ai-tutor-history__notice">
            AI có thể nhầm. Hãy kiểm tra lại kiến thức quan trọng.
          </p>
        </aside>

        <section className="ai-tutor-chat" aria-label="Trò chuyện với AI Gia sư">
          <header className="ai-tutor-chat__header">
            <div>
              <span className="ai-tutor-presence" aria-hidden="true" />
              <div>
                <strong>Mandora AI</strong>
                <small>
                  {providerStatus.available ? 'Sẵn sàng hỗ trợ' : 'Chưa khả dụng'}
                </small>
              </div>
            </div>
            <span className="ai-tutor-context">{contextLabel}</span>
          </header>

          <div
            className="ai-tutor-messages"
            aria-live="polite"
            onScroll={(event) => {
              const element = event.currentTarget;
              const distanceFromBottom =
                element.scrollHeight - element.scrollTop - element.clientHeight;
              shouldAutoScrollRef.current = distanceFromBottom < 120;
            }}
            ref={messagesRef}
          >
            {messages.length === 0 && requestState.status === 'idle' && (
              <div className="ai-tutor-empty">
                <span aria-hidden="true">中</span>
                <h1>Bạn muốn học gì hôm nay?</h1>
                <p>
                  Chọn một chủ đề nhanh hoặc đặt câu hỏi bằng tiếng Việt hay tiếng Trung.
                </p>
                <div className="ai-tutor-quick-actions">
                  {QUICK_ACTIONS.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => setInput(item.prompt)}
                      type="button"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) =>
              message.role === 'assistant' ? (
                <AssistantMessage
                  key={message.id}
                  message={message}
                  onFollowUp={setInput}
                />
              ) : (
                <UserMessage key={message.id} message={message} />
              ),
            )}

            {busy && (
              <div className="ai-tutor-generating" role="status">
                <span />
                <span />
                <span />
                {requestState.status === 'sending'
                  ? 'Đang gửi…'
                  : 'Đang soạn câu trả lời…'}
              </div>
            )}

            {providerStatus.status === 'ready' && !providerStatus.available && (
              <div className="ai-tutor-alert" role="status">
                <strong>AI Gia sư chưa khả dụng</strong>
                <p>
                  Quản trị viên chưa cấu hình nhà cung cấp AI. Các chức năng học khác vẫn
                  hoạt động bình thường.
                </p>
              </div>
            )}

            {['error', 'rate-limited'].includes(requestState.status) && (
              <div className="ai-tutor-alert is-error" role="alert">
                <strong>
                  {requestState.status === 'rate-limited'
                    ? 'Đã chạm giới hạn tạm thời'
                    : 'Chưa nhận được câu trả lời'}
                </strong>
                <p>{requestState.error}</p>
                {requestState.code !== 'AI_DAILY_LIMIT' && (
                  <button
                    onClick={(event) => submitMessage(event, lastAttempt)}
                    type="button"
                  >
                    Thử lại
                  </button>
                )}
              </div>
            )}
          </div>

          <footer className="ai-tutor-composer">
            <form onSubmit={submitMessage}>
              <label className="visually-hidden" htmlFor="ai-tutor-message">
                Câu hỏi cho AI Gia sư
              </label>
              <textarea
                disabled={busy || !providerStatus.available}
                id="ai-tutor-message"
                maxLength={providerStatus.maxInputChars || 3000}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    submitMessage(event);
                  }
                }}
                placeholder="Nhập câu hỏi của bạn…"
                rows="2"
                value={input}
              />
              <button
                aria-label="Gửi câu hỏi"
                disabled={busy || !providerStatus.available || !input.trim()}
                title="Gửi"
                type="submit"
              >
                ↑
              </button>
            </form>
            <small>
              {providerStatus.dailyMessageLimit
                ? `Tối đa ${providerStatus.dailyMessageLimit} lượt hỏi mỗi ngày.`
                : 'Câu trả lời do AI tạo.'}
            </small>
          </footer>
        </section>
      </div>
    </main>
  );
}
