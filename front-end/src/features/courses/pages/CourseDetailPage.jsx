import { useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
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
  if (course.status === 'error' && course.errorStatus === 404) return <NotFoundPage />;
  if (course.status === 'error') {
    return (
      <section className="course-detail-loading">
        <ErrorState message={course.error} onRetry={course.retry} />
      </section>
    );
  }
  if (!course.data) return <NotFoundPage />;

  const firstLesson = course.data.units.flatMap((unit) => unit.lessons)[0];

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
            {firstLesson && (
              <div className="course-detail-hero__actions">
                <Link
                  className="button button--primary"
                  to={`/courses/${course.data.slug}/lessons/${firstLesson.slug}`}
                >
                  Xem bài học đầu tiên <span aria-hidden="true">→</span>
                </Link>
              </div>
            )}
          </div>
          <div className="course-detail-cover">
            {course.data.thumbnail ? (
              <img alt="" src={course.data.thumbnail} />
            ) : (
              <span lang="zh-Hans">课</span>
            )}
            <small>{course.data.level}</small>
          </div>
        </div>
      </section>

      <section className="course-detail-content">
        <div className="public-container course-detail-content__grid">
          <div>
            <div className="course-detail-heading">
              <p className="public-eyebrow">Nội dung khóa học</p>
              <h2>Học theo từng Unit rõ ràng.</h2>
            </div>
            {course.data.units.length ? (
              <CourseOutline course={course.data} />
            ) : (
              <p className="course-outline-empty">
                Khóa học chưa có nội dung được xuất bản.
              </p>
            )}
          </div>
          <aside className="course-enrollment-card">
            <span aria-hidden="true">学</span>
            <h2>Thông tin khóa học</h2>
            <p>Cấp độ: {course.data.level}</p>
            {course.data.estimatedDuration != null && (
              <p>Thời lượng dự kiến: {course.data.estimatedDuration} phút</p>
            )}
            {firstLesson && (
              <Link
                className="button button--primary"
                to={`/courses/${course.data.slug}/lessons/${firstLesson.slug}`}
              >
                Mở bài học đầu tiên
              </Link>
            )}
          </aside>
        </div>
      </section>
    </>
  );
}
