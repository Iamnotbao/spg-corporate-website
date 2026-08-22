import { Link } from 'react-router-dom';
import LearningProgress from '../../../components/ui/LearningProgress.jsx';
import '../styles/courses.css';

export default function CourseCard({ course, progress }) {
  const lessonCount = course.units.reduce(
    (total, unit) => total + unit.lessons.length,
    0,
  );

  return (
    <article className="course-card">
      <Link
        aria-label={`Xem ${course.title}`}
        className={`course-card__cover is-${course.tone}`}
        to={`/courses/${course.slug}`}
      >
        <span lang="zh-Hans">{course.coverCharacter}</span>
        {course.isDemo && <small>Minh họa</small>}
      </Link>
      <div className="course-card__body">
        <div className="course-card__meta">
          <span>{course.level}</span>
          <span>{lessonCount} bài mẫu</span>
        </div>
        <h3>
          <Link to={`/courses/${course.slug}`}>{course.title}</Link>
        </h3>
        <p>{course.summary}</p>
        <LearningProgress value={progress} />
        <Link className="course-card__link" to={`/courses/${course.slug}`}>
          Xem khóa học <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}
