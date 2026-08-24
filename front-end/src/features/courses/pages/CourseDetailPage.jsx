import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import LearningProgress from '../../../components/ui/LearningProgress.jsx';
import { ErrorState, LoadingState } from '../../../components/ui/ContentState.jsx';
import PublicToast from '../../../components/ui/PublicToast.jsx';
import { usePageTitle } from '../../../hooks/usePageTitle.js';
import { useStudentAuth } from '../../auth/StudentAuthContext.jsx';
import NotFoundPage from '../../public/pages/NotFoundPage.jsx';
import { usePublicDetail } from '../../public/hooks/usePublicContent.js';
import {
  enrollInCourse,
  getStudentCourseState,
} from '../../student/services/studentLearningService.js';
import CourseOutline from '../components/CourseOutline.jsx';
import { getPublicCourse } from '../services/courseCatalogService.js';
import '../styles/courses.css';

export default function CourseDetailPage() {
  const { courseSlug } = useParams();
  const location = useLocation();
  const auth = useStudentAuth();
  const loadCourse = useCallback((slug) => getPublicCourse(slug), []);
  const course = usePublicDetail(loadCourse, courseSlug);
  const [studentState, setStudentState] = useState(null);
  const [studentError, setStudentError] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [notice, setNotice] = useState({ message: '', variant: 'success' });
  usePageTitle(course.data?.title || 'Chi tiết khóa học');

  useEffect(() => {
    if (auth.status !== 'signed-in') {
      setStudentState(null);
      return;
    }
    getStudentCourseState(courseSlug)
      .then((result) => setStudentState(result.data))
      .catch((error) => setStudentError(error.message));
  }, [auth.status, courseSlug]);

  async function enroll() {
    setEnrolling(true);
    setStudentError('');
    try {
      const result = await enrollInCourse(course.data.id);
      setStudentState(result.data);
      setNotice({
        message: 'Đã đăng ký khóa học. Bạn có thể bắt đầu học ngay.',
        variant: 'success',
      });
    } catch (error) {
      setStudentError(error.message);
      setNotice({
        message: error.message || 'Không thể đăng ký khóa học.',
        variant: 'error',
      });
    } finally {
      setEnrolling(false);
    }
  }

  if (course.status === 'loading')
    return (
      <section className="course-detail-loading">
        <LoadingState count={1} label="Đang tải khóa học" />
      </section>
    );
  if (course.status === 'error' && course.errorStatus === 404) return <NotFoundPage />;
  if (course.status === 'error')
    return (
      <section className="course-detail-loading">
        <ErrorState message={course.error} onRetry={course.retry} />
      </section>
    );
  if (!course.data) return <NotFoundPage />;

  const firstLesson = course.data.units.flatMap((unit) => unit.lessons)[0];
  const continueLesson = studentState?.continueLesson || firstLesson;
  const learningUrl = continueLesson
    ? `/courses/${course.data.slug}/lessons/${continueLesson.slug}`
    : '';
  const action =
    auth.status !== 'signed-in' ? (
      <Link
        className="button button--primary"
        state={{ from: location.pathname }}
        to="/login"
      >
        Đăng nhập để bắt đầu
      </Link>
    ) : studentState?.enrolled ? (
      learningUrl ? (
        <Link className="button button--primary" to={learningUrl}>
          Tiếp tục học
        </Link>
      ) : (
        <span className="course-completed-label">Khóa học đã hoàn thành</span>
      )
    ) : (
      <button
        className="button button--primary"
        disabled={enrolling}
        onClick={enroll}
        type="button"
      >
        {enrolling ? 'Đang đăng ký…' : 'Bắt đầu học'}
      </button>
    );

  const progressValue = Number(studentState?.progressPercentage) || 0;

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
            <div className="course-detail-hero__actions">{action}</div>
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
            <div className="course-enrollment-card__topline">
              <span aria-hidden="true">学</span>
              <div>
                <small>{studentState?.enrolled ? 'Đang học' : 'Khóa học'}</small>
                <strong>{course.data.level}</strong>
              </div>
            </div>
            <h2>{studentState?.enrolled ? 'Tiến độ của bạn' : 'Bắt đầu lộ trình'}</h2>
            {studentState?.enrolled ? (
              <>
                <div className="course-progress-summary">
                  <div
                    aria-label={`Tiến độ ${progressValue}%`}
                    className="course-progress-ring"
                    style={{ '--course-progress': `${progressValue * 3.6}deg` }}
                  >
                    <span>{progressValue}%</span>
                  </div>
                  <div className="course-progress-summary__copy">
                    <strong>
                      {studentState.completedLessons}/{studentState.totalLessons} bài học
                    </strong>
                    <span>
                      {studentState.completed
                        ? 'Bạn đã hoàn thành toàn bộ khóa học.'
                        : 'Hoàn thành từng bài để mở rộng tiến độ.'}
                    </span>
                  </div>
                </div>
                <LearningProgress label="Hoàn thành khóa học" value={progressValue} />
              </>
            ) : (
              <p>
                Tham gia khóa học để lưu tiến độ, tiếp tục từ bài gần nhất và theo dõi kết
                quả.
              </p>
            )}
            {studentError && (
              <p className="course-enrollment-card__error" role="alert">
                {studentError}
              </p>
            )}
            {action}
          </aside>
        </div>
      </section>
      <PublicToast
        message={notice.message}
        onClose={() => setNotice((current) => ({ ...current, message: '' }))}
        variant={notice.variant}
      />
    </>
  );
}
