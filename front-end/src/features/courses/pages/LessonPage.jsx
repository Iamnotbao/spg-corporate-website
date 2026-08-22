import { useCallback, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ErrorState, LoadingState } from '../../../components/ui/ContentState.jsx';
import { usePageTitle } from '../../../hooks/usePageTitle.js';
import NotFoundPage from '../../public/pages/NotFoundPage.jsx';
import { usePublicDetail } from '../../public/hooks/usePublicContent.js';
import CourseOutline from '../components/CourseOutline.jsx';
import LessonNavigation from '../components/LessonNavigation.jsx';
import { getPublicCourse, getPublicLesson } from '../services/courseCatalogService.js';
import '../styles/courses.css';

const TYPE_LABELS = {
  character: 'Hán tự',
  grammar: 'Ngữ pháp',
  listening: 'Luyện nghe',
  practice: 'Luyện tập',
  quiz: 'Quiz',
  reading: 'Đọc hiểu',
  vocabulary: 'Từ vựng',
};

export default function LessonPage() {
  const { courseSlug, lessonSlug } = useParams();
  const loadCourse = useCallback((slug) => getPublicCourse(slug), []);
  const loadLesson = useCallback((slug) => getPublicLesson(slug), []);
  const course = usePublicDetail(loadCourse, courseSlug);
  const lesson = usePublicDetail(loadLesson, lessonSlug);
  const lessons = useMemo(
    () =>
      (course.data?.units || []).flatMap((unit) =>
        unit.lessons.map((item) => ({ ...item, unitTitle: unit.title })),
      ),
    [course.data],
  );
  const lessonIndex = lessons.findIndex((item) => item.slug === lessonSlug);
  usePageTitle(lesson.data?.title || 'Bài học');

  if (course.status === 'loading' || lesson.status === 'loading') {
    return (
      <section className="course-detail-loading">
        <LoadingState count={1} label="Đang tải bài học" />
      </section>
    );
  }
  if (
    (course.status === 'error' && course.errorStatus === 404) ||
    (lesson.status === 'error' && lesson.errorStatus === 404)
  ) {
    return <NotFoundPage />;
  }
  if (course.status === 'error' || lesson.status === 'error') {
    return (
      <section className="course-detail-loading">
        <ErrorState
          message={course.error || lesson.error}
          onRetry={course.status === 'error' ? course.retry : lesson.retry}
        />
      </section>
    );
  }
  if (
    !course.data ||
    !lesson.data ||
    lesson.data.course?.slug !== course.data.slug ||
    lessonIndex < 0
  ) {
    return <NotFoundPage />;
  }

  return (
    <section className="lesson-page">
      <div className="public-container lesson-page__grid">
        <aside className="lesson-sidebar">
          <Link className="breadcrumb-link" to={`/courses/${course.data.slug}`}>
            ← {course.data.title}
          </Link>
          <CourseOutline
            compact
            course={course.data}
            currentLessonSlug={lesson.data.slug}
          />
        </aside>

        <article className="lesson-content">
          <header className="lesson-header">
            <div>
              <span>{lesson.data.unit?.title}</span>
              <span>{TYPE_LABELS[lesson.data.type] || lesson.data.type}</span>
            </div>
            <h1>{lesson.data.title}</h1>
            {lesson.data.description && <p>{lesson.data.description}</p>}
          </header>

          <div className="lesson-body lesson-body--plain">
            {lesson.data.content
              .split(/\r?\n/)
              .map((paragraph, index) =>
                paragraph ? (
                  <p key={`${paragraph.slice(0, 24)}-${index}`}>{paragraph}</p>
                ) : (
                  <br key={index} />
                ),
              )}
          </div>

          <LessonNavigation
            courseSlug={course.data.slug}
            next={lessons[lessonIndex + 1]}
            previous={lessons[lessonIndex - 1]}
          />
        </article>
      </div>
    </section>
  );
}
