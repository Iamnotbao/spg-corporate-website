import { Link } from 'react-router-dom';

export default function LessonNavigation({ courseSlug, next, previous }) {
  return (
    <nav aria-label="Điều hướng bài học" className="lesson-navigation">
      {previous ? (
        <Link to={`/courses/${courseSlug}/lessons/${previous.slug}`}>
          <span>← Bài trước</span>
          <strong>{previous.title}</strong>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link
          className="lesson-navigation__next"
          to={`/courses/${courseSlug}/lessons/${next.slug}`}
        >
          <span>Bài tiếp theo →</span>
          <strong>{next.title}</strong>
        </Link>
      ) : (
        <Link className="lesson-navigation__next" to={`/courses/${courseSlug}`}>
          <span>Hoàn tất phần xem trước →</span>
          <strong>Về tổng quan khóa học</strong>
        </Link>
      )}
    </nav>
  );
}
