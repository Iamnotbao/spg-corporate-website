import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/ContentState.jsx';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import { usePageTitle } from '../../../hooks/usePageTitle.js';
import {
  getVocabularyReviewQueue,
  submitVocabularyReview,
} from '../services/vocabularyReviewService.js';
import '../styles/vocabulary-review.css';

const RATINGS = [
  { value: 'again', label: 'Không nhớ', hint: 'Ôn lại sớm' },
  { value: 'hard', label: 'Khó nhớ', hint: 'Còn do dự' },
  { value: 'good', label: 'Nhớ được', hint: 'Trả lời ổn' },
  { value: 'easy', label: 'Rất dễ', hint: 'Nhớ ngay' },
];

const MODES = [
  {
    value: 'mixed',
    icon: '混',
    label: 'Hỗn hợp',
    description: 'Luân phiên lật thẻ, nhập đáp án và trắc nghiệm.',
  },
  {
    value: 'flip',
    icon: '↻',
    label: 'Lật thẻ',
    description: 'Tự nhớ đáp án rồi lật thẻ để kiểm tra.',
  },
  {
    value: 'typing',
    icon: '⌨',
    label: 'Nhập đáp án',
    description: 'Nhập pinyin hoặc nghĩa tiếng Việt của từ.',
  },
  {
    value: 'choice',
    icon: '✓',
    label: 'Trắc nghiệm',
    description: 'Chọn nghĩa đúng trong các đáp án có sẵn.',
  },
];

const MODE_LABELS = Object.fromEntries(MODES.map((item) => [item.value, item.label]));

function normalizeAnswer(value) {
  return String(value || '')
    .trim()
    .toLocaleLowerCase('vi')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9\p{Script=Han}]+/gu, ' ')
    .trim();
}

function acceptedAnswers(vocabulary) {
  const values = [vocabulary?.pinyin, vocabulary?.meaningVietnamese];
  const meaningParts = String(vocabulary?.meaningVietnamese || '').split(/[;,/|]/);
  return [...values, ...meaningParts].map(normalizeAnswer).filter(Boolean);
}

function isTypedAnswerCorrect(value, vocabulary) {
  const normalized = normalizeAnswer(value);
  return Boolean(normalized) && acceptedAnswers(vocabulary).includes(normalized);
}

function stableHash(value) {
  return Array.from(String(value)).reduce(
    (hash, character) => (hash * 31 + character.codePointAt(0)) >>> 0,
    7,
  );
}

function buildChoiceOptions(current, queue) {
  if (!current?.vocabulary) return [];
  const correct = String(current.vocabulary.meaningVietnamese || '').trim();
  if (!correct) return [];
  const distractors = queue
    .filter((item) => item.vocabulary.id !== current.vocabulary.id)
    .map((item) => String(item.vocabulary.meaningVietnamese || '').trim())
    .filter((value) => value && value !== correct);
  const unique = [...new Set(distractors)].slice(0, 3);
  return [correct, ...unique].sort(
    (left, right) =>
      stableHash(`${current.vocabulary.id}:${left}`) -
      stableHash(`${current.vocabulary.id}:${right}`),
  );
}

function resolveMode(selectedMode, reviewedCount, choiceCount) {
  if (selectedMode === 'choice' && choiceCount < 2) return 'flip';
  if (selectedMode !== 'mixed') return selectedMode;
  const rotation = ['typing', 'choice', 'flip'];
  const candidate = rotation[reviewedCount % rotation.length];
  return candidate === 'choice' && choiceCount < 2 ? 'flip' : candidate;
}

export default function VocabularyReviewPage() {
  usePageTitle('Ôn tập từ vựng');
  const [state, setState] = useState({ status: 'loading', data: [], summary: null, error: '' });
  const [selectedMode, setSelectedMode] = useState('mixed');
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [sessionReviewed, setSessionReviewed] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [selectedChoice, setSelectedChoice] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const current = state.data[0];

  const load = useCallback(() => {
    setState((value) => ({ ...value, status: 'loading', error: '' }));
    getVocabularyReviewQueue(20)
      .then((response) => {
        const data = response.data || [];
        setState({
          status: 'ready',
          data,
          summary: response.summary || { due: 0, saved: 0 },
          error: '',
        });
        setSessionTotal(data.length);
        setSessionReviewed(0);
        setSessionStarted(false);
      })
      .catch((error) =>
        setState({ status: 'error', data: [], summary: null, error: error.message }),
      );
  }, []);

  useEffect(load, [load]);

  const remaining = useMemo(() => state.data.length, [state.data.length]);
  const choices = useMemo(() => buildChoiceOptions(current, state.data), [current, state.data]);
  const activeMode = useMemo(
    () => resolveMode(selectedMode, sessionReviewed, choices.length),
    [choices.length, selectedMode, sessionReviewed],
  );
  const progress = sessionTotal ? Math.round((sessionReviewed / sessionTotal) * 100) : 0;
  const recommendedRating = feedback?.status === 'incorrect' ? 'again' : feedback?.status === 'correct' ? 'good' : '';

  function resetInteraction() {
    setRevealed(false);
    setTypedAnswer('');
    setSelectedChoice('');
    setFeedback(null);
  }

  function startSession(mode) {
    setSelectedMode(mode);
    setSessionStarted(true);
    resetInteraction();
  }

  function toggleFlipCard() {
    if (activeMode !== 'flip') return;
    setFeedback(null);
    setRevealed((value) => !value);
  }

  function checkTypedAnswer(event) {
    event.preventDefault();
    if (!typedAnswer.trim()) return;
    const correct = isTypedAnswerCorrect(typedAnswer, current.vocabulary);
    setFeedback({
      status: correct ? 'correct' : 'incorrect',
      message: correct ? 'Chính xác' : 'Chưa đúng',
    });
    setRevealed(true);
  }

  function checkChoiceAnswer(event) {
    event.preventDefault();
    if (!selectedChoice) return;
    const correct = selectedChoice === current.vocabulary.meaningVietnamese;
    setFeedback({
      status: correct ? 'correct' : 'incorrect',
      message: correct ? 'Chính xác' : 'Chưa đúng',
    });
    setRevealed(true);
  }

  async function rate(rating) {
    if (!current || submitting) return;
    setSubmitting(true);
    try {
      await submitVocabularyReview(current.vocabulary.id, rating);
      setState((value) => ({
        ...value,
        data: value.data.slice(1),
        summary: {
          ...value.summary,
          due: Math.max(0, Number(value.summary?.due || 0) - 1),
        },
      }));
      setSessionReviewed((count) => count + 1);
      resetInteraction();
    } catch (error) {
      setState((value) => ({ ...value, error: error.message }));
    } finally {
      setSubmitting(false);
    }
  }

  const reviewPrompt = activeMode === 'typing' ? 'Nhập pinyin hoặc nghĩa tiếng Việt' : activeMode === 'choice' ? 'Chọn nghĩa đúng' : 'Nhấp cạnh trái/phải hoặc nhấp đúp để lật thẻ';

  return (
    <>
      <PageHeader
        eyebrow="Active recall · SRS"
        title="Ôn tập từ vựng"
        description="Nhớ chủ động bằng flashcard, nhập đáp án hoặc trắc nghiệm. Hanyora dùng kết quả tự đánh giá để xếp lịch ôn tiếp theo."
      />
      <section className="vocabulary-review-page">
        <div className="public-container">
          {state.status === 'loading' && <LoadingState count={2} label="Đang chuẩn bị phiên ôn tập" />}
          {state.status === 'error' && <ErrorState message={state.error} onRetry={load} />}

          {state.status === 'ready' && state.summary && (
            <div className="review-summary" aria-label="Tổng quan ôn tập">
              <article><span>Đến hạn</span><strong>{state.summary.due}</strong></article>
              <article><span>Từ đã lưu</span><strong>{state.summary.saved}</strong></article>
              <article><span>Trong phiên này</span><strong>{remaining}</strong></article>
            </div>
          )}

          {state.status === 'ready' && !current && (
            <EmptyState
              icon="复"
              title={sessionReviewed ? 'Bạn đã ôn xong phiên này' : 'Hiện chưa có từ đến hạn'}
              description={
                sessionReviewed
                  ? `Bạn vừa hoàn thành ${sessionReviewed} thẻ. Lịch ôn tiếp theo đã được cập nhật.`
                  : 'Hãy lưu thêm từ vựng hoặc quay lại sau khi tới lịch ôn tiếp theo.'
              }
              action={<Link className="button button--primary" to="/vocabulary">Khám phá từ vựng</Link>}
            />
          )}

          {state.status === 'ready' && current && !sessionStarted && (
            <section className="review-mode-picker" aria-labelledby="review-mode-title">
              <div className="review-mode-picker__heading">
                <span>Chọn cách ôn</span>
                <h2 id="review-mode-title">Bạn muốn nhớ từ theo cách nào?</h2>
                <p>Chế độ Hỗn hợp được khuyên dùng để tránh chỉ quen một kiểu câu hỏi.</p>
              </div>
              <div className="review-mode-grid">
                {MODES.map((mode) => (
                  <button
                    className={mode.value === 'mixed' ? 'is-recommended' : undefined}
                    key={mode.value}
                    onClick={() => startSession(mode.value)}
                    type="button"
                  >
                    <span aria-hidden="true">{mode.icon}</span>
                    <strong>{mode.label}</strong>
                    <small>{mode.description}</small>
                    {mode.value === 'mixed' && <i>Khuyên dùng</i>}
                  </button>
                ))}
              </div>
            </section>
          )}

          {state.status === 'ready' && current && sessionStarted && (
            <div className="review-session">
              <div className="review-session-toolbar">
                <div>
                  <span>Thẻ {Math.min(sessionReviewed + 1, sessionTotal)} / {sessionTotal}</span>
                  <strong>{MODE_LABELS[activeMode]}</strong>
                </div>
                <button
                  onClick={() => {
                    setSessionStarted(false);
                    resetInteraction();
                  }}
                  type="button"
                >
                  Đổi chế độ
                </button>
              </div>
              <div className="review-progress" aria-label={`Đã hoàn thành ${progress}%`}>
                <span style={{ width: `${progress}%` }} />
              </div>

              <div className="review-flip-scene">
                <article
                  className={`review-flashcard${revealed ? ' is-revealed' : ''}${activeMode === 'flip' ? ' is-interactive' : ''}`}
                  onDoubleClick={activeMode === 'flip' ? toggleFlipCard : undefined}
                >
                  <div className="review-flashcard__inner">
                    <div className="review-flashcard__face review-flashcard__front">
                      <div className="review-card-topline">
                        <span>{current.vocabulary.hskLevel}</span>
                        <small>{reviewPrompt}</small>
                      </div>
                      <strong lang="zh-Hans">{current.vocabulary.simplified}</strong>
                      {current.vocabulary.traditional && current.vocabulary.traditional !== current.vocabulary.simplified && (
                        <small lang="zh-Hant">{current.vocabulary.traditional}</small>
                      )}

                      {activeMode === 'flip' && (
                        <div className="review-flip-zones" aria-label="Lật flashcard">
                          <button aria-label="Lật thẻ từ cạnh trái" onClick={toggleFlipCard} type="button"><span>‹</span></button>
                          <button aria-label="Lật thẻ từ cạnh phải" onClick={toggleFlipCard} type="button"><span>›</span></button>
                        </div>
                      )}

                      {activeMode === 'typing' && (
                        <form className="review-answer-form" onSubmit={checkTypedAnswer}>
                          <label htmlFor="review-typed-answer">Pinyin hoặc nghĩa tiếng Việt</label>
                          <input
                            autoComplete="off"
                            autoFocus
                            id="review-typed-answer"
                            onChange={(event) => setTypedAnswer(event.target.value)}
                            placeholder="Ví dụ: tuần trước"
                            value={typedAnswer}
                          />
                          <button className="button button--primary" disabled={!typedAnswer.trim()} type="submit">
                            Kiểm tra đáp án
                          </button>
                        </form>
                      )}

                      {activeMode === 'choice' && (
                        <form className="review-choice-form" onSubmit={checkChoiceAnswer}>
                          <div className="review-choice-grid" role="radiogroup" aria-label="Chọn nghĩa đúng">
                            {choices.map((choice) => (
                              <label className={selectedChoice === choice ? 'is-selected' : undefined} key={choice}>
                                <input
                                  checked={selectedChoice === choice}
                                  name="review-choice"
                                  onChange={() => setSelectedChoice(choice)}
                                  type="radio"
                                  value={choice}
                                />
                                <span>{choice}</span>
                              </label>
                            ))}
                          </div>
                          <button className="button button--primary" disabled={!selectedChoice} type="submit">
                            Kiểm tra đáp án
                          </button>
                        </form>
                      )}
                    </div>

                    <div className="review-flashcard__face review-flashcard__back">
                      <div className="review-answer-status" data-status={feedback?.status || 'self'}>
                        <span aria-hidden="true">{feedback?.status === 'correct' ? '✓' : feedback?.status === 'incorrect' ? '×' : '↻'}</span>
                        <strong>{feedback?.message || 'Tự đánh giá mức độ nhớ'}</strong>
                      </div>
                      <div className="review-flashcard__answer">
                        <span lang="zh-Hans">{current.vocabulary.simplified}</span>
                        <strong>{current.vocabulary.pinyin}</strong>
                        <p>{current.vocabulary.meaningVietnamese}</p>
                        {feedback?.status === 'incorrect' && typedAnswer && (
                          <small>Bạn đã nhập: “{typedAnswer}”</small>
                        )}
                        {current.vocabulary.exampleChinese && (
                          <blockquote>
                            <strong lang="zh-Hans">{current.vocabulary.exampleChinese}</strong>
                            {current.vocabulary.examplePinyin && <span>{current.vocabulary.examplePinyin}</span>}
                            {current.vocabulary.exampleVietnamese && <p>{current.vocabulary.exampleVietnamese}</p>}
                          </blockquote>
                        )}
                        <div className="review-rating-heading">
                          <strong>Thẻ này với bạn thế nào?</strong>
                          <small>Hanyora dùng lựa chọn này để tính lịch ôn tiếp theo.</small>
                        </div>
                        <div className="review-rating-grid">
                          {RATINGS.map((item) => (
                            <button
                              className={recommendedRating === item.value ? 'is-recommended' : undefined}
                              key={item.value}
                              disabled={submitting}
                              onClick={() => rate(item.value)}
                              type="button"
                              data-rating={item.value}
                            >
                              <strong>{item.label}</strong>
                              <small>{item.hint}</small>
                              {recommendedRating === item.value && <i>Gợi ý</i>}
                            </button>
                          ))}
                        </div>
                        {activeMode === 'flip' && (
                          <button className="review-flip-back" onClick={toggleFlipCard} type="button">
                            Xem lại mặt trước
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              </div>

              <p className="review-session__meta">
                Lần ôn: {current.srs.reviewCount || 0} · Giai đoạn: {current.srs.stage || 'new'} · Không dùng AI
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
