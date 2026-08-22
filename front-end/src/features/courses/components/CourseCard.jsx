import { Link } from 'react-router-dom';
import '../styles/courses.css';

export default function CourseCard({ course }) {
  const lessonCount = Array.isArray(course.units)
    ? course.units.reduce((total, unit) => total + (unit.lessons?.length || 0), 0)
    : null;

  return (
    <article className="course-card">
      <Link
        aria-label={`Xem ${course.title}`}
        className="course-card__cover"
        to={`/courses/${course.slug}`}
      >
        {course.thumbnail ? (
          <img alt="" loading="lazy" src={course.thumbnail} />
        ) : (
          <span lang="zh-Hans">课</span>
        )}
      </Link>
      <div className="course-card__body">
        <div className="course-card__meta">
          <span>{course.level}</span>
          <span>
            {lessonCount == null
              ? course.estimatedDuration
                ? `${course.estimatedDuration} phút`
                : 'Lộ trình học'
              : `${lessonCount} bài học`}
          </span>
        </div>
        <h3>
          <Link to={`/courses/${course.slug}`}>{course.title}</Link>
        </h3>
        <p>{course.description}</p>
        <Link className="course-card__link" to={`/courses/${course.slug}`}>
          Xem khóa học <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}
