import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ErrorState, LoadingState } from '../../../components/ui/ContentState.jsx';
import PublicToast from '../../../components/ui/PublicToast.jsx';
import { usePageTitle } from '../../../hooks/usePageTitle.js';
import { getStudentCourseState } from '../../student/services/studentLearningService.js';
import QuizQuestion from '../components/QuizQuestion.jsx';
import QuizResult from '../components/QuizResult.jsx';
import { getLessonQuiz, submitQuizAttempt } from '../services/quizService.js';
import '../styles/quiz.css';

const QUESTIONS_PER_PAGE = 5;

function isAnswered(answer) {
  return Array.isArray(answer) ? answer.length > 0 : Boolean(String(answer || '').trim());
}

export default function QuizPage() {
  const { courseSlug, lessonSlug } = useParams();
  const [state, setState] = useState({
    status: 'loading',
    quiz: null,
    course: null,
    error: '',
  });
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [page, setPage] = useState(1);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [notice, setNotice] = useState({ message: '', variant: 'success' });
  usePageTitle(state.quiz?.title || 'Quiz');

  const load = useCallback(async () => {
    setState((current) => ({ ...current, status: 'loading', error: '' }));
    try {
      const [quizResponse, courseResponse] = await Promise.all([
        getLessonQuiz(lessonSlug),
        getStudentCourseState(courseSlug),
      ]);
      setState({
        status: 'ready',
        quiz: quizResponse.data,
        course: courseResponse.data,
        error: '',
      });
    } catch (error) {
      setState({ status: 'error', quiz: null, course: null, error: error.message });
    }
  }, [courseSlug, lessonSlug]);

  useEffect(() => {
    load();
  }, [load]);

  const questions = state.quiz?.questions || [];
  const totalPages = Math.max(1, Math.ceil(questions.length / QUESTIONS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pageQuestions = useMemo(() => {
    const start = (safePage - 1) * QUESTIONS_PER_PAGE;
    return questions.slice(start, start + QUESTIONS_PER_PAGE);
  }, [questions, safePage]);
  const answeredCount = questions.filter((question) => isAnswered(answers[question.id])).length;

  function retry() {
    setAnswers({});
    setResult(null);
    setPage(1);
    setConfirmOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function goToPage(nextPage) {
    setPage(Math.min(Math.max(nextPage, 1), totalPages));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function requestSubmit(event) {
    event.preventDefault();
    const firstMissingIndex = questions.findIndex(
      (question) => !isAnswered(answers[question.id]),
    );
    if (firstMissingIndex >= 0) {
      const missingPage = Math.floor(firstMissingIndex / QUESTIONS_PER_PAGE) + 1;
      setPage(missingPage);
      setNotice({
        message: `Bạn còn ${questions.length - answeredCount} câu chưa trả lời. Mình đã đưa bạn tới câu còn thiếu.`,
        variant: 'error',
      });
      return;
    }
    setConfirmOpen(true);
  }

  async function submitQuiz() {
    const payload = questions.map((question) => ({
      questionId: question.id,
      answer: answers[question.id],
    }));
    setSubmitting(true);
    setConfirmOpen(false);
    try {
      const response = await submitQuizAttempt(state.quiz.id, payload);
      setResult(response.data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      setNotice({ message: error.message || 'Không thể nộp Quiz.', variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  if (state.status === 'loading') {
    return (
      <section className="quiz-page">
        <div className="public-container">
          <LoadingState count={2} label="Đang tải Quiz" />
        </div>
      </section>
    );
  }
  if (state.status === 'error' && !state.quiz) {
    return (
      <section className="quiz-page">
        <div className="public-container">
          <ErrorState message={state.error} onRetry={load} />
        </div>
      </section>
    );
  }
  if (!state.course?.enrolled) {
    return (
      <section className="quiz-page">
        <div className="public-container">
          <ErrorState message="Bạn cần đăng ký khóa học trước khi làm Quiz." />
          <Link className="button button--primary" to={`/courses/${courseSlug}`}>
            Về khóa học
          </Link>
        </div>
      </section>
    );
  }
  if (result)
    return (
      <main className="quiz-page">
        <div className="public-container">
          <QuizResult courseSlug={courseSlug} onRetry={retry} result={result} />
        </div>
      </main>
    );

  return (
    <main className="quiz-page">
      <div className="public-container quiz-page__inner">
        <Link
          className="breadcrumb-link"
          to={`/courses/${courseSlug}/lessons/${lessonSlug}`}
        >
          ← Về bài học
        </Link>
        <header className="quiz-page__header">
          <p className="public-eyebrow">Quiz · Điểm đạt {state.quiz.passingScore}%</p>
          <h1>{state.quiz.title}</h1>
          {state.quiz.description && <p>{state.quiz.description}</p>}
        </header>

        <section className="quiz-answer-guide" aria-label="Cách trả lời Quiz">
          <div>
            <strong>Trả lời trực tiếp trên máy</strong>
            <p>
              Câu chọn đáp án dùng chuột/chạm, câu điền trống gõ bằng bàn phím và câu sắp
              xếp chọn từng thẻ theo thứ tự. Luyện viết tay Hán tự nằm riêng trong mục Hán tự.
            </p>
          </div>
          <span>{answeredCount}/{questions.length} đã trả lời</span>
        </section>

        <div className="quiz-page-progress" aria-label="Tiến độ Quiz">
          <div>
            <strong>Trang {safePage}/{totalPages}</strong>
            <span>
              Câu {(safePage - 1) * QUESTIONS_PER_PAGE + 1}–{Math.min(safePage * QUESTIONS_PER_PAGE, questions.length)} / {questions.length}
            </span>
          </div>
          <div className="quiz-page-progress__bar" aria-hidden="true">
            <span style={{ width: `${questions.length ? (answeredCount / questions.length) * 100 : 0}%` }} />
          </div>
        </div>

        <form onSubmit={requestSubmit}>
          {pageQuestions.map((question, index) => {
            const absoluteIndex = (safePage - 1) * QUESTIONS_PER_PAGE + index;
            return (
              <QuizQuestion
                answer={answers[question.id]}
                index={absoluteIndex}
                key={question.id}
                onChange={(answer) =>
                  setAnswers((current) => ({ ...current, [question.id]: answer }))
                }
                question={question}
              />
            );
          })}

          <nav className="quiz-page-pagination" aria-label="Phân trang câu hỏi">
            <button
              className="button button--secondary"
              disabled={safePage === 1}
              onClick={() => goToPage(safePage - 1)}
              type="button"
            >
              ← Trang trước
            </button>
            <div>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                <button
                  aria-current={pageNumber === safePage ? 'page' : undefined}
                  className={pageNumber === safePage ? 'is-active' : ''}
                  key={pageNumber}
                  onClick={() => goToPage(pageNumber)}
                  type="button"
                >
                  {pageNumber}
                </button>
              ))}
            </div>
            {safePage < totalPages ? (
              <button
                className="button button--primary"
                onClick={() => goToPage(safePage + 1)}
                type="button"
              >
                Trang sau →
              </button>
            ) : (
              <button
                className="button button--primary quiz-page__submit"
                disabled={submitting}
                type="submit"
              >
                {submitting ? 'Đang chấm điểm…' : 'Nộp bài'}
              </button>
            )}
          </nav>
        </form>
      </div>

      {confirmOpen && (
        <div className="quiz-confirm" role="presentation" onMouseDown={() => setConfirmOpen(false)}>
          <section
            aria-labelledby="quiz-confirm-title"
            aria-modal="true"
            className="quiz-confirm__dialog"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <span aria-hidden="true">✓</span>
            <div>
              <h2 id="quiz-confirm-title">Nộp bài và chấm điểm?</h2>
              <p>Bạn đã trả lời đủ {questions.length} câu. Sau khi nộp, backend sẽ chấm và hiển thị kết quả.</p>
            </div>
            <div className="quiz-confirm__actions">
              <button className="button button--secondary" onClick={() => setConfirmOpen(false)} type="button">
                Xem lại
              </button>
              <button className="button button--primary" onClick={submitQuiz} type="button">
                Nộp bài
              </button>
            </div>
          </section>
        </div>
      )}

      <PublicToast
        message={notice.message}
        onClose={() => setNotice((current) => ({ ...current, message: '' }))}
        variant={notice.variant}
      />
    </main>
  );
}
