import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import DemoNotice from '../../../components/ui/DemoNotice.jsx';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../../components/ui/ContentState.jsx';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import { usePageTitle } from '../../../hooks/usePageTitle.js';
import { usePublicCollection } from '../../public/hooks/usePublicContent.js';
import CourseCard from '../components/CourseCard.jsx';
import { listPublicCourses } from '../services/courseCatalogService.js';
import '../styles/courses.css';

const LEVELS = ['Tất cả', 'HSK 1', 'HSK 2', 'HSK 3', 'HSK 4', 'HSK 5', 'HSK 6'];

export default function CoursesPage() {
  usePageTitle('Khóa học');
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const level = searchParams.get('level') || 'Tất cả';
  const loadCourses = useCallback(() => listPublicCourses(), []);
  const courses = usePublicCollection(loadCourses);

  const visibleCourses = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi');
    return courses.data.filter((course) => {
      const matchesLevel = level === 'Tất cả' || course.level === level;
      const matchesSearch =
        !query ||
        `${course.title} ${course.summary}`.toLocaleLowerCase('vi').includes(query);
      return matchesLevel && matchesSearch;
    });
  }, [courses.data, level, search]);

  function selectLevel(nextLevel) {
    const params = new URLSearchParams(searchParams);
    if (nextLevel === 'Tất cả') params.delete('level');
    else params.set('level', nextLevel);
    setSearchParams(params);
  }

  return (
    <>
      <PageHeader
        description="Tìm lộ trình phù hợp với trình độ và mục tiêu học tiếng Trung của bạn."
        eyebrow="Lộ trình học tập"
        title="Khóa học"
      />
      <section className="catalog-section">
        <div className="public-container">
          <DemoNotice />
          <div className="catalog-toolbar">
            <label className="catalog-search">
              <span className="visually-hidden">Tìm khóa học</span>
              <span aria-hidden="true">⌕</span>
              <input
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm theo tên hoặc nội dung…"
                type="search"
                value={search}
              />
            </label>
            <div aria-label="Lọc theo cấp độ" className="filter-chips" role="group">
              {LEVELS.map((item) => (
                <button
                  aria-pressed={level === item}
                  className={level === item ? 'is-active' : undefined}
                  key={item}
                  onClick={() => selectLevel(item)}
                  type="button"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {courses.status === 'loading' && <LoadingState label="Đang tải khóa học" />}
          {courses.status === 'error' && (
            <ErrorState message={courses.error} onRetry={courses.retry} />
          )}
          {courses.status === 'ready' && visibleCourses.length === 0 && (
            <EmptyState
              description="Hãy thử từ khóa khác hoặc chọn một cấp độ khác."
              icon="课"
              title="Chưa có khóa học phù hợp"
            />
          )}
          {courses.status === 'ready' && visibleCourses.length > 0 && (
            <div className="course-grid">
              {visibleCourses.map((course) => (
                <CourseCard course={course} key={course.slug} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
