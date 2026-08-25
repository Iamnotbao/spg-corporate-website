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
  { value: 'again', label: 'Again', hint: '10 phút' },
  { value: 'hard', label: 'Hard', hint: 'Khó' },
  { value: 'good', label: 'Good', hint: 'Ổn' },
  { value: 'easy', label: 'Easy', hint: 'Dễ' },
];

export default function VocabularyReviewPage() {
  usePageTitle('Ôn tập từ vựng');
  const [state, setState] = useState({ status: 'loading', data: [], summary: null, error: '' });
  const [revealed, setRevealed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const current = state.data[0];

  const load = useCallback(() => {
    setState((value) => ({ ...value, status: 'loading', error: '' }));
    getVocabularyReviewQueue(20)
      .then((response) =>
        setState({
          status: 'ready',
          data: response.data || [],
          summary: response.summary || { due: 0, saved: 0 },
          error: '',
        }),
      )
      .catch((error) =>
        setState({ status: 'error', data: [], summary: null, error: error.message }),
      );
  }, []);

  useEffect(load, [load]);

  const remaining = useMemo(() => state.data.length, [state.data.length]);

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
      setRevealed(false);
    } catch (error) {
      setState((value) => ({ ...value, error: error.message }));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="SRS · Spaced repetition"
        title="Ôn tập từ vựng"
        description="Ôn lại các từ đã lưu theo lịch nhắc tự động. Bạn tự đánh giá mức độ nhớ để Mandora tính lần ôn tiếp theo."
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
              title="Bạn đã ôn xong"
              description="Hiện không còn từ nào đến hạn. Hãy lưu thêm từ vựng hoặc quay lại sau khi tới lịch ôn tiếp theo."
              action={<Link className="button button--primary" to="/vocabulary">Khám phá từ vựng</Link>}
            />
          )}

          {state.status === 'ready' && current && (
            <div className="review-session">
              <article className={`review-flashcard${revealed ? ' is-revealed' : ''}`}>
                <div className="review-flashcard__front">
                  <span>{current.vocabulary.hskLevel}</span>
                  <strong lang="zh-Hans">{current.vocabulary.simplified}</strong>
                  {current.vocabulary.traditional && current.vocabulary.traditional !== current.vocabulary.simplified && (
                    <small lang="zh-Hant">{current.vocabulary.traditional}</small>
                  )}
                  {!revealed && (
                    <button className="button button--primary" type="button" onClick={() => setRevealed(true)}>
                      Hiện đáp án
                    </button>
                  )}
                </div>
                {revealed && (
                  <div className="review-flashcard__answer">
                    <strong>{current.vocabulary.pinyin}</strong>
                    <p>{current.vocabulary.meaningVietnamese}</p>
                    {current.vocabulary.exampleChinese && (
                      <blockquote>
                        <strong lang="zh-Hans">{current.vocabulary.exampleChinese}</strong>
                        {current.vocabulary.examplePinyin && <span>{current.vocabulary.examplePinyin}</span>}
                        {current.vocabulary.exampleVietnamese && <p>{current.vocabulary.exampleVietnamese}</p>}
                      </blockquote>
                    )}
                    <div className="review-rating-grid">
                      {RATINGS.map((item) => (
                        <button
                          key={item.value}
                          disabled={submitting}
                          onClick={() => rate(item.value)}
                          type="button"
                          data-rating={item.value}
                        >
                          <strong>{item.label}</strong>
                          <small>{item.hint}</small>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </article>
              <p className="review-session__meta">
                Lần ôn: {current.srs.reviewCount || 0} · Giai đoạn: {current.srs.stage || 'new'}
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
