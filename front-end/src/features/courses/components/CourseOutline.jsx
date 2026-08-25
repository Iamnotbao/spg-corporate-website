import { useEffect, useMemo, useState } from 'react';
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

export default function CourseOutline({
  course,
  currentLessonSlug,
  compact = false,
  completedLessonIds = [],
  onLessonNavigate,
}) {
  const completedIds = useMemo(() => new Set(completedLessonIds), [completedLessonIds]);
  const currentUnitId = useMemo(
    () =>
      course.units.find((unit) =>
        unit.lessons.some((lesson) => lesson.slug === currentLessonSlug),
      )?.id,
    [course.units, currentLessonSlug],
  );
  const [openUnitIds, setOpenUnitIds] = useState(() => new Set(currentUnitId ? [currentUnitId] : []));

  useEffect(() => {
    if (!compact || !currentUnitId) return;
    setOpenUnitIds((current) => {
      if (current.has(currentUnitId)) return current;
      const next = new Set(current);
      next.add(currentUnitId);
      return next;
    });
  }, [compact, currentUnitId]);

  function toggleUnit(unitId) {
    setOpenUnitIds((current) => {
      const next = new Set(current);
      if (next.has(unitId)) next.delete(unitId);
      else next.add(unitId);
      return next;
    });
  }

  if (!course.units.length) {
    return <p className="course-outline-empty">Không tìm thấy bài học phù hợp.</p>;
  }

  return (
    <div className={`course-outline${compact ? ' course-outline--compact' : ''}`}>
      {course.units.map((unit, unitIndex) => {
        const unitOpen = !compact || openUnitIds.has(unit.id);
        return (
          <section className="course-unit" key={unit.id}>
            <header>
              <span>{String(unitIndex + 1).padStart(2, '0')}</span>
              <div>
                <small>Unit</small>
                <h3>{unit.title}</h3>
              </div>
              {compact && (
                <button
                  aria-expanded={unitOpen}
                  aria-label={`${unitOpen ? 'Thu gọn' : 'Mở'} ${unit.title}`}
                  className="course-unit__toggle"
                  onClick={() => toggleUnit(unit.id)}
                  type="button"
                >
                  <span aria-hidden="true">⌄</span>
                </button>
              )}
            </header>
            {unitOpen && (
              <ol>
                {unit.lessons.map((lesson, lessonIndex) => {
                  const completed = completedIds.has(lesson.id);
                  const current = lesson.slug === currentLessonSlug;
                  const lessonNumber = Number.isFinite(Number(lesson.order))
                    ? Number(lesson.order)
                    : lessonIndex + 1;
                  return (
                    <li className={current ? 'is-current' : undefined} key={lesson.slug}>
                      <Link
                        onClick={onLessonNavigate}
                        to={`/courses/${course.slug}/lessons/${lesson.slug}`}
                      >
                        <span>{String(lessonNumber).padStart(2, '0')}</span>
                        <div>
                          <strong>{lesson.title}</strong>
                          <small>{TYPE_LABELS[lesson.type] || lesson.type}</small>
                        </div>
                        <i
                          aria-label={completed ? 'Đã hoàn thành' : undefined}
                          className={completed ? 'is-complete' : undefined}
                        >
                          {completed ? '✓' : current ? '•' : '→'}
                        </i>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}
            {unitOpen && unit.lessons.length === 0 && (
              <p className="course-unit__empty">Chưa có bài học được xuất bản.</p>
            )}
          </section>
        );
      })}
    </div>
  );
}
