import { Link } from 'react-router-dom';

const TYPE_LABELS = {
  character: 'Hán tự',
  grammar: 'Ngữ pháp',
  listening: 'Nghe',
  practice: 'Luyện tập',
  quiz: 'Quiz',
  reading: 'Đọc',
  vocabulary: 'Từ vựng',
};

export default function CourseOutline({ course, currentLessonSlug, compact = false }) {
  return (
    <div className={`course-outline${compact ? ' course-outline--compact' : ''}`}>
      {course.units.map((unit, unitIndex) => (
        <section className="course-unit" key={unit.id}>
          <header>
            <span>{String(unitIndex + 1).padStart(2, '0')}</span>
            <div>
              <small>Unit</small>
              <h3>{unit.title}</h3>
            </div>
          </header>
          <ol>
            {unit.lessons.map((lesson, lessonIndex) => (
              <li
                className={lesson.slug === currentLessonSlug ? 'is-current' : undefined}
                key={lesson.slug}
              >
                <Link to={`/courses/${course.slug}/lessons/${lesson.slug}`}>
                  <span>{String(lessonIndex + 1).padStart(2, '0')}</span>
                  <div>
                    <strong>{lesson.title}</strong>
                    <small>{TYPE_LABELS[lesson.type] || lesson.type}</small>
                  </div>
                  <i aria-hidden="true">→</i>
                </Link>
              </li>
            ))}
          </ol>
          {unit.lessons.length === 0 && (
            <p className="course-unit__empty">Chưa có bài học được xuất bản.</p>
          )}
        </section>
      ))}
    </div>
  );
}
