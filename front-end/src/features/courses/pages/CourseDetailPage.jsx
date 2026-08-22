import { useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import DemoNotice from '../../../components/ui/DemoNotice.jsx';
import { ErrorState, LoadingState } from '../../../components/ui/ContentState.jsx';
import { usePageTitle } from '../../../hooks/usePageTitle.js';
import NotFoundPage from '../../public/pages/NotFoundPage.jsx';
import { usePublicDetail } from '../../public/hooks/usePublicContent.js';
import CourseOutline from '../components/CourseOutline.jsx';
import { getPublicCourse } from '../services/courseCatalogService.js';
import '../styles/courses.css';

export default function CourseDetailPage() {
  const { courseSlug } = useParams();
  const loadCourse = useCallback((slug) => getPublicCourse(slug), []);
  const course = usePublicDetail(loadCourse, courseSlug);
  usePageTitle(course.data?.title || 'Chi tiết khóa học');

  if (course.status === 'loading') {
    return (
      <section className="course-detail-loading">
        <LoadingState count={1} label="Đang tải khóa học" />
      </section>
    );
  }

  if (course.status === 'error') {
    return (
      <section className="course-detail-loading">
        <ErrorState message={course.error} onRetry={course.retry} />
      </section>
    );
  }

  if (!course.data) return <NotFoundPage />;

  const firstLesson = course.data.units[0]?.lessons[0];

  return (
    <>
      <section className="course-detail-hero">
        <div className="public-container course-detail-hero__grid">
          <div className="course-detail-hero__copy">
            <Link className="breadcrumb-link" to="/courses">
              ← Tất cả khóa học
            </Link>
            <p className="public-eyebrow">{course.data.level}</p>
            <h1>{course.data.title}</h1>
            <p>{course.data.description}</p>
            <div className="course-detail-hero__actions">
              {firstLesson && (
                <Link
                  className="button button--primary"
                  to={`/courses/${course.data.slug}/lessons/${firstLesson.slug}`}
                >
                  Xem bài học đầu tiên <span aria-hidden="true">→</span>
                </Link>
              )}
              <Link className="button button--secondary" to="/login">
                Đăng nhập để học
              </Link>
            </div>
          </div>
          <div className={`course-detail-cover is-${course.data.tone}`}>
            <span lang="zh-Hans">{course.data.coverCharacter}</span>
            <small>{course.data.level}</small>
          </div>
        </div>
      </section>

      <section className="course-detail-content">
        <div className="public-container course-detail-content__grid">
          <div>
            <DemoNotice>
              {' '}
              Khóa học và bài học bên dưới chỉ minh họa cấu trúc Course → Unit → Lesson.
            </DemoNotice>
            <div className="course-detail-heading">
              <p className="public-eyebrow">Nội dung khóa học</p>
              <h2>Học theo từng Unit rõ ràng.</h2>
            </div>
            <CourseOutline course={course.data} />
          </div>
          <aside className="course-enrollment-card">
            <span aria-hidden="true">学</span>
            <h2>Bắt đầu khi bạn sẵn sàng</h2>
            <p>
              Đăng nhập học viên, ghi danh và tiến độ sẽ được kết nối khi API tương ứng
              được triển khai.
            </p>
            <Link className="button button--primary" to="/login">
              Mở cổng học viên
            </Link>
          </aside>
        </div>
      </section>
    </>
  );
}
