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
import { listMyCourses } from '../services/studentLearningService.js';
import '../../courses/styles/courses.css';

export default function MyCoursesPage() {
  usePageTitle('Khóa học của tôi');
  const [state, setState] = useState({ status: 'loading', data: [], error: '' });
  const load = useCallback(() => {
    setState((current) => ({ ...current, status: 'loading', error: '' }));
    listMyCourses()
      .then((result) => setState({ status: 'ready', data: result.data || [], error: '' }))
      .catch((error) => setState({ status: 'error', data: [], error: error.message }));
  }, []);
  useEffect(load, [load]);

  return (
    <>
      <PageHeader
        description="Tiếp tục bài học và theo dõi tiến độ từ dữ liệu học tập của bạn."
        eyebrow="Không gian học viên"
        title="Khóa học của tôi"
      />
      <section className="catalog-section">
        <div className="public-container">
          {state.status === 'loading' && (
            <LoadingState count={3} label="Đang tải khóa học" />
          )}
          {state.status === 'error' && (
            <ErrorState message={state.error} onRetry={load} />
          )}
          {state.status === 'ready' && !state.data.length && (
            <EmptyState
              action={
                <Link className="button button--primary" to="/courses">
                  Khám phá khóa học
                </Link>
              }
              description="Hãy chọn một khóa học đã xuất bản để bắt đầu."
              icon="课"
              title="Bạn chưa tham gia khóa học nào"
            />
          )}
          {state.status === 'ready' && state.data.length > 0 && (
            <div className="course-grid">
              {state.data.map((item) => (
                <article className="course-card my-course-card" key={item.enrollment.id}>
                  <div className="course-card__body">
                    <p className="public-eyebrow">{item.course.level}</p>
                    <h2>{item.course.title}</h2>
                    <p>{item.course.description}</p>
                    <LearningProgress value={item.progressPercentage} />
                    <small>
                      {item.completedLessons}/{item.totalLessons} bài học hoàn thành
                    </small>
                    {item.continueLesson ? (
                      <Link
                        className="button button--primary"
                        to={`/courses/${item.course.slug}/lessons/${item.continueLesson.slug}`}
                      >
                        Tiếp tục học
                      </Link>
                    ) : (
                      <Link
                        className="button button--secondary"
                        to={`/courses/${item.course.slug}`}
                      >
                        {item.completed ? 'Xem lại khóa học' : 'Xem khóa học'}
                      </Link>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
