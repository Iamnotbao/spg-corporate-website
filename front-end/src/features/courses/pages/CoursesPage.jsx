import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../../components/ui/ContentState.jsx';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import PublicPagination from '../../../components/ui/PublicPagination.jsx';
import { usePageTitle } from '../../../hooks/usePageTitle.js';
import { usePublicCollection } from '../../public/hooks/usePublicContent.js';
import CourseCard from '../components/CourseCard.jsx';
import { listPublicCourses } from '../services/courseCatalogService.js';
import '../styles/courses.css';

const ALL_LEVELS = 'Tất cả';
const PAGE_SIZE = 9;

export default function CoursesPage() {
  usePageTitle('Khóa học');
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [page, setPage] = useState(1);
  const level = searchParams.get('level') || ALL_LEVELS;
  const loadCourses = useCallback(() => listPublicCourses(), []);
  const courses = usePublicCollection(loadCourses);

  const visibleCourses = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi');
    return courses.data.filter((course) => {
      const matchesLevel = level === ALL_LEVELS || course.level === level;
      const matchesSearch =
        !query ||
        `${course.title} ${course.description}`.toLocaleLowerCase('vi').includes(query);
      return matchesLevel && matchesSearch;
    });
  }, [courses.data, level, search]);
  const pagedCourses = useMemo(
    () => visibleCourses.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [page, visibleCourses],
  );
  const levels = useMemo(
    () => [
      ALL_LEVELS,
      ...new Set(courses.data.map((course) => course.level).filter(Boolean)),
    ],
    [courses.data],
  );

  function updateSearch(value) {
    setSearch(value);
    setPage(1);
  }

  function selectLevel(nextLevel) {
    const params = new URLSearchParams(searchParams);
    if (nextLevel === ALL_LEVELS) params.delete('level');
    else params.set('level', nextLevel);
    setSearchParams(params);
    setPage(1);
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
          <div className="catalog-toolbar">
            <label className="catalog-search">
              <span className="visually-hidden">Tìm khóa học</span>
              <span aria-hidden="true">⌕</span>
              <input
                onChange={(event) => updateSearch(event.target.value)}
                placeholder="Tìm theo tên hoặc nội dung…"
                type="search"
                value={search}
              />
            </label>
            <div aria-label="Lọc theo cấp độ" className="filter-chips" role="group">
              {levels.map((item) => (
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
              description={
                courses.data.length
                  ? 'Hãy thử từ khóa khác hoặc chọn một cấp độ khác.'
                  : 'Các khóa học đã xuất bản sẽ xuất hiện tại đây.'
              }
              icon="课"
              title="Chưa có khóa học phù hợp"
            />
          )}
          {courses.status === 'ready' && visibleCourses.length > 0 && (
            <>
              <div className="course-grid">
                {pagedCourses.map((course) => (
                  <CourseCard course={course} key={course.slug} />
                ))}
              </div>
              <PublicPagination
                onPageChange={setPage}
                page={page}
                pageSize={PAGE_SIZE}
                total={visibleCourses.length}
              />
            </>
          )}
        </div>
      </section>
    </>
  );
}
