import { Link, useParams } from 'react-router-dom';
import DemoNotice from '../../../components/ui/DemoNotice.jsx';
import { usePageTitle } from '../../../hooks/usePageTitle.js';
import NotFoundPage from '../../public/pages/NotFoundPage.jsx';
import CourseOutline from '../components/CourseOutline.jsx';
import LessonNavigation from '../components/LessonNavigation.jsx';
import { findDemoCourse, flattenDemoLessons } from '../data/demoCourses.js';
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

function LessonBlock({ block }) {
  if (block.type === 'example') {
    return (
      <figure className="lesson-example">
        <strong lang="zh-Hans">{block.chinese}</strong>
        <span>{block.pinyin}</span>
        <figcaption>{block.meaning}</figcaption>
      </figure>
    );
  }

  return (
    <section className={`lesson-block lesson-block--${block.type}`}>
      <h2>{block.title}</h2>
      <p>{block.text}</p>
    </section>
  );
}

export default function LessonPage() {
  const { courseSlug, lessonSlug } = useParams();
  const course = findDemoCourse(courseSlug);
  const lessons = flattenDemoLessons(course);
  const lessonIndex = lessons.findIndex((item) => item.slug === lessonSlug);
  const lesson = lessons[lessonIndex];
  usePageTitle(lesson?.title || 'Bài học');

  if (!course || !lesson) return <NotFoundPage />;

  return (
    <section className="lesson-page">
      <div className="public-container lesson-page__grid">
        <aside className="lesson-sidebar">
          <Link className="breadcrumb-link" to={`/courses/${course.slug}`}>
            ← {course.title}
          </Link>
          <CourseOutline compact course={course} currentLessonSlug={lesson.slug} />
        </aside>

        <article className="lesson-content">
          <header className="lesson-header">
            <div>
              <span>{lesson.unitTitle}</span>
              <span>{TYPE_LABELS[lesson.type] || lesson.type}</span>
            </div>
            <h1>{lesson.title}</h1>
            <p>{lesson.summary}</p>
          </header>

          <DemoNotice>
            {' '}
            Đây là nội dung minh họa bố cục bài học; trạng thái hoàn thành chưa được lưu.
          </DemoNotice>

          <div className="lesson-body">
            {lesson.content.map((block, index) => (
              <LessonBlock block={block} key={`${block.type}-${index}`} />
            ))}
          </div>

          <section className="lesson-completion-foundation">
            <div>
              <span aria-hidden="true">✓</span>
              <div>
                <strong>Tiến độ bài học</strong>
                <p>
                  Sẽ khả dụng sau khi xác thực học viên và quy tắc hoàn thành được thống
                  nhất.
                </p>
              </div>
            </div>
            <button disabled type="button">
              Đánh dấu hoàn thành
            </button>
          </section>

          <LessonNavigation
            courseSlug={course.slug}
            next={lessons[lessonIndex + 1]}
            previous={lessons[lessonIndex - 1]}
          />
        </article>
      </div>
    </section>
  );
}
