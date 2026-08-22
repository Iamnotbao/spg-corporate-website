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
import {
  archiveEnrollment,
  listMyCourses,
} from '../services/studentLearningService.js';
import '../../courses/styles/courses.css';
import '../styles/progress.css';

export default function MyCoursesPage() {
  usePageTitle('Khóa học của tôi');
  const [state, setState] = useState({ status: 'loading', data: [], error: '' });
  const [archiving, setArchiving] = useState('');
  const [actionError, setActionError] = useState('');

  const load = useCallback(async () => {
    setState((current) => ({ ...current, status: 'loading', error: '' }));
    try {
      const result = await listMyCourses();
      setState({ status: 'ready', data: result?.data || [], error: '' });
    } catch (error) {
      setState({
        status: 'error',
        data: [],
        error: error?.message || 'Không thể tải khóa học của bạn.',
      });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function leaveCourse(item) {
    if (!item?.course?.id) return;
    if (!window.confirm(`Rời khóa học “${item.course.title}”? Lịch sử học vẫn được giữ lại.`)) {
      return;
    }
    setArchiving(item.course.id);
    setActionError('');
    try {
      await archiveEnrollment(item.course.id);
      await load();
    } catch (error) {
      setActionError(error?.message || 'Không thể rời khóa học.');
    } finally {
      setArchiving('');
    }
  }

  const validItems = state.data.filter((item) => item?.enrollment?.id && item?.course?.id);

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
          {actionError && (
            <p className="student-action-error" role="alert">
              {actionError}
            </p>
          )}
          {state.status === 'ready' && !validItems.length && (
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
          {state.status === 'ready' && validItems.length > 0 && (
            <div className="course-grid">
              {validItems.map((item) => (
                <article className="course-card my-course-card" key={item.enrollment.id}>
                  <div className="course-card__body">
                    <p className="public-eyebrow">{item.course.level}</p>
                    <h2>{item.course.title}</h2>
                    <p>{item.course.description}</p>
                    <LearningProgress value={item.progressPercentage} />
                    <small>
                      {item.completedLessons}/{item.totalLessons} bài học hoàn thành
                    </small>
                    <div className="my-course-card__actions">
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
                      <button
                        className="button button--secondary"
                        disabled={archiving === item.course.id}
                        onClick={() => leaveCourse(item)}
                        type="button"
                      >
                        {archiving === item.course.id ? 'Đang rời…' : 'Rời khóa học'}
                      </button>
                    </div>
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
