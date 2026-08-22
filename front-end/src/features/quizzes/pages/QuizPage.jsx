import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ErrorState, LoadingState } from '../../../components/ui/ContentState.jsx';
import { usePageTitle } from '../../../hooks/usePageTitle.js';
import { getStudentCourseState } from '../../student/services/studentLearningService.js';
import QuizQuestion from '../components/QuizQuestion.jsx';
import QuizResult from '../components/QuizResult.jsx';
import { getLessonQuiz, submitQuizAttempt } from '../services/quizService.js';
import '../styles/quiz.css';

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

  function retry() {
    setAnswers({});
    setResult(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submit(event) {
    event.preventDefault();
    const payload = state.quiz.questions.map((question) => ({
      questionId: question.id,
      answer: answers[question.id],
    }));
    const complete = payload.every((item) =>
      Array.isArray(item.answer)
        ? item.answer.length > 0
        : String(item.answer || '').trim(),
    );
    if (!complete) {
      setState((current) => ({ ...current, error: 'Vui lòng trả lời tất cả câu hỏi.' }));
      return;
    }
    if (!window.confirm('Nộp bài và chấm điểm ngay?')) return;
    setSubmitting(true);
    setState((current) => ({ ...current, error: '' }));
    try {
      const response = await submitQuizAttempt(state.quiz.id, payload);
      setResult(response.data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      setState((current) => ({ ...current, error: error.message }));
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
        <form onSubmit={submit}>
          {state.quiz.questions.map((question, index) => (
            <QuizQuestion
              answer={answers[question.id]}
              index={index}
              key={question.id}
              onChange={(answer) =>
                setAnswers((current) => ({ ...current, [question.id]: answer }))
              }
              question={question}
            />
          ))}
          {state.error && (
            <p className="quiz-page__error" role="alert">
              {state.error}
            </p>
          )}
          <button
            className="button button--primary quiz-page__submit"
            disabled={submitting}
            type="submit"
          >
            {submitting ? 'Đang chấm điểm…' : 'Nộp bài'}
          </button>
        </form>
      </div>
    </main>
  );
}
