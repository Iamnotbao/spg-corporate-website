import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LearningProgress from '../../../components/ui/LearningProgress.jsx';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../../components/ui/ContentState.jsx';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import { usePageTitle } from '../../../hooks/usePageTitle.js';
import { getStudentProgress } from '../services/studentLearningService.js';
import '../styles/progress.css';

function ProgressCourse({ item }) {
  return (
    <article className="student-progress-course">
      <div>
        <p className="public-eyebrow">
          {item.enrollment.status === 'active' ? 'Đang học' : 'Đã rời khóa học'}
        </p>
        <h3>{item.course.title}</h3>
        <p>
          {item.completedLessons}/{item.totalLessons} bài học đã hoàn thành
        </p>
      </div>
      <LearningProgress value={item.progressPercentage} />
      {item.enrollment.status === 'active' && item.continueLesson ? (
        <Link
          className="button button--primary"
          to={`/courses/${item.course.slug}/lessons/${item.continueLesson.slug}`}
        >
          Tiếp tục học
        </Link>
      ) : (
        <Link className="button button--secondary" to={`/courses/${item.course.slug}`}>
          {item.enrollment.status === 'archived' ? 'Đăng ký lại' : 'Xem khóa học'}
        </Link>
      )}
    </article>
  );
}

export default function ProgressPage() {
  usePageTitle('Tiến độ học tập');
  const [state, setState] = useState({ status: 'loading', data: null, error: '' });
  const load = useCallback(() => {
    setState((current) => ({ ...current, status: 'loading', error: '' }));
    getStudentProgress()
      .then((response) => setState({ status: 'ready', data: response.data, error: '' }))
      .catch((error) => setState({ status: 'error', data: null, error: error.message }));
  }, []);
  useEffect(load, [load]);

  const overview = state.data?.overview;
  const activeCourses = state.data?.courses?.filter(
    (item) => item.enrollment.status === 'active',
  );
  const archivedCourses = state.data?.courses?.filter(
    (item) => item.enrollment.status === 'archived',
  );

  return (
    <>
      <PageHeader
        description="Theo dõi tiến độ được tính từ bài học đã xuất bản và lịch sử Quiz của chính bạn."
        eyebrow="Không gian học viên"
        title="Tiến độ học tập"
      />
      <section className="student-progress-page">
        <div className="public-container">
          {state.status === 'loading' && (
            <LoadingState count={3} label="Đang tải tiến độ" />
          )}
          {state.status === 'error' && (
            <ErrorState message={state.error} onRetry={load} />
          )}
          {state.status === 'ready' && overview && (
            <>
              <div className="student-progress-overview" aria-label="Tổng quan học tập">
                <article>
                  <span>Khóa học đang học</span>
                  <strong>{overview.activeCourses}</strong>
                </article>
                <article>
                  <span>Bài học hoàn thành</span>
                  <strong>{overview.completedLessons}</strong>
                  <small>trên {overview.totalPublishedLessons} bài đã xuất bản</small>
                </article>
                <article>
                  <span>Khóa học hoàn thành</span>
                  <strong>{overview.completedCourses}</strong>
                </article>
                <article>
                  <span>Lượt làm Quiz</span>
                  <strong>{overview.quizAttempts}</strong>
                </article>
                <article>
                  <span>Từ vựng đã lưu</span>
                  <strong>{overview.savedVocabulary}</strong>
                </article>
              </div>

              <section className="student-progress-section">
                <header>
                  <p className="public-eyebrow">Lộ trình hiện tại</p>
                  <h2>Khóa học đang học</h2>
                </header>
                {activeCourses.length ? (
                  <div className="student-progress-courses">
                    {activeCourses.map((item) => (
                      <ProgressCourse item={item} key={item.enrollment.id} />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    action={
                      <Link className="button button--primary" to="/courses">
                        Khám phá khóa học
                      </Link>
                    }
                    description="Đăng ký một khóa học đã xuất bản để bắt đầu theo dõi tiến độ."
                    icon="进"
                    title="Chưa có khóa học đang học"
                  />
                )}
              </section>

              <section className="student-progress-section">
                <header>
                  <p className="public-eyebrow">Kết quả gần đây</p>
                  <h2>Quiz</h2>
                </header>
                {state.data.recentQuizResults.length ? (
                  <div className="student-quiz-history">
                    {state.data.recentQuizResults.map((attempt) => (
                      <article key={attempt.id}>
                        <div>
                          <strong>{attempt.quizTitle}</strong>
                          <small>
                            {new Date(attempt.submittedAt).toLocaleDateString('vi-VN')}
                          </small>
                        </div>
                        <span className={attempt.passed ? 'is-passed' : 'is-failed'}>
                          {attempt.score}% · {attempt.passed ? 'Đạt' : 'Chưa đạt'}
                        </span>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="student-progress-muted">Bạn chưa có kết quả Quiz.</p>
                )}
              </section>

              {archivedCourses.length > 0 && (
                <section className="student-progress-section">
                  <header>
                    <p className="public-eyebrow">Lịch sử được bảo lưu</p>
                    <h2>Khóa học đã rời</h2>
                  </header>
                  <div className="student-progress-courses">
                    {archivedCourses.map((item) => (
                      <ProgressCourse item={item} key={item.enrollment.id} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
