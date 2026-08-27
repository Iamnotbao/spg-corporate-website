import { useCallback, useEffect, useState } from 'react';
import {
  getAdminLearningSummary,
  listAdminCourseOptions,
  listAdminProgress,
} from '../../../services/adminService.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { ADMIN_DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '../constants.js';
import { AdminAlert, AdminEmpty, AdminSkeletonRows } from './AdminFeedback.jsx';
import AdminIcon from './AdminIcon.jsx';
import AdminPageHeader from './AdminPageHeader.jsx';
import AdminPagination from './AdminPagination.jsx';
import AdminStatCard from './AdminStatCard.jsx';

const EMPTY_PAGINATION = { page: 1, pageSize: ADMIN_DEFAULT_PAGE_SIZE, total: 0, totalPages: 1 };

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('vi-VN') : '—';
}

export default function AdminProgressPanel({ onUnauthorized }) {
  const [rows, setRows] = useState([]);
  const [courses, setCourses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);
  const [filters, setFilters] = useState({ search: '', courseId: '', status: '' });
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const search = useDebouncedValue(filters.search, 300);
  const courseId = filters.courseId;
  const enrollmentStatus = filters.status;

  const load = useCallback(
    async (signal) => {
      setStatus('loading');
      setError('');
      try {
        const [reportResponse, summaryResponse] = await Promise.all([
          listAdminProgress({
            courseId,
            search,
            status: enrollmentStatus,
            page: pagination.page,
            pageSize: pagination.pageSize,
            signal,
          }),
          getAdminLearningSummary({ signal }),
        ]);
        setRows(reportResponse.data || []);
        setPagination(reportResponse.pagination || EMPTY_PAGINATION);
        setSummary(summaryResponse.data);
        setStatus('ready');
      } catch (caught) {
        if (caught.name === 'AbortError') return;
        if (caught.status === 401) onUnauthorized(caught);
        setError(caught.message);
        setStatus('error');
      }
    },
    [
      courseId,
      enrollmentStatus,
      onUnauthorized,
      pagination.page,
      pagination.pageSize,
      search,
    ],
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  useEffect(() => {
    const controller = new AbortController();
    listAdminCourseOptions({ pageSize: 100, signal: controller.signal })
      .then((response) => setCourses(response.data || []))
      .catch((caught) => {
        if (caught.name !== 'AbortError' && caught.status === 401) onUnauthorized(caught);
      });
    return () => controller.abort();
  }, [onUnauthorized]);

  function changeFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }));
    setPagination((current) => ({ ...current, page: 1 }));
  }

  return (
    <div className="admin-learning-page admin-progress-page">
      <AdminPageHeader
        description="Tiến độ được tính từ Enrollment và các bài học đang xuất bản; dữ liệu lịch sử không bị xóa khi học viên rời khóa học."
        eyebrow="Learning reporting"
        title="Tiến độ học tập"
      />

      {error && <AdminAlert onRetry={() => load()}>{error}</AdminAlert>}

      <section className="admin-stat-grid" aria-label="Tổng quan tiến độ">
        <AdminStatCard
          helper="Tài khoản vai trò student"
          icon="users"
          label="Học viên"
          value={status === 'loading' ? null : summary?.students}
        />
        <AdminStatCard
          helper="Enrollment đang hoạt động"
          icon="courses"
          label="Đang học"
          value={status === 'loading' ? null : summary?.activeEnrollments}
        />
        <AdminStatCard
          helper="Hoàn thành theo bài đã xuất bản"
          icon="progress"
          label="Khóa hoàn thành"
          value={status === 'loading' ? null : summary?.completedCourses}
        />
        <AdminStatCard
          helper="Tổng lượt nộp Quiz"
          icon="quizzes"
          label="Lượt Quiz"
          value={status === 'loading' ? null : summary?.quizAttempts}
        />
      </section>

      <section className="admin-panel admin-progress-report">
        <div className="admin-learning-toolbar admin-progress-toolbar">
          <label>
            <AdminIcon name="search" size={18} />
            <span className="admin-sr-only">Tìm học viên hoặc khóa học</span>
            <input
              onChange={(event) => changeFilter('search', event.target.value)}
              placeholder="Tìm học viên hoặc khóa học…"
              type="search"
              value={filters.search}
            />
          </label>
          <select
            aria-label="Lọc theo khóa học"
            onChange={(event) => changeFilter('courseId', event.target.value)}
            value={filters.courseId}
          >
            <option value="">Tất cả khóa học</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
          <select
            aria-label="Lọc theo trạng thái Enrollment"
            onChange={(event) => changeFilter('status', event.target.value)}
            value={filters.status}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="active">Đang học</option>
            <option value="archived">Đã rời</option>
          </select>
          <select
            aria-label="Số dòng tiến độ mỗi trang"
            onChange={(event) =>
              setPagination((current) => ({
                ...current,
                page: 1,
                pageSize: Number(event.target.value),
              }))
            }
            value={pagination.pageSize}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}/trang
              </option>
            ))}
          </select>
        </div>

        {status === 'loading' ? (
          <AdminSkeletonRows count={6} />
        ) : rows.length ? (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table admin-progress-table">
                <thead>
                  <tr>
                    <th>Học viên</th>
                    <th>Khóa học</th>
                    <th>Enrollment</th>
                    <th>Bài học</th>
                    <th>Tiến độ</th>
                    <th>Hoạt động gần nhất</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.student.displayName}</strong>
                        <small>@{row.student.username}</small>
                      </td>
                      <td>
                        <strong>{row.course.title}</strong>
                        <small>{row.course.status}</small>
                      </td>
                      <td>
                        <span
                          className={`admin-learning-badge is-${row.enrollmentStatus}`}
                        >
                          {row.enrollmentStatus === 'active' ? 'Đang học' : 'Đã rời'}
                        </span>
                      </td>
                      <td>
                        {row.completedLessons}/{row.totalLessons}
                      </td>
                      <td>
                        <progress max="100" value={row.progressPercentage} />
                        <small>{row.progressPercentage}%</small>
                      </td>
                      <td>{formatDate(row.latestActivity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <AdminPagination
              onPageChange={(page) => setPagination((current) => ({ ...current, page }))}
              pagination={pagination}
            />
          </>
        ) : (
          <AdminEmpty title="Chưa có dữ liệu tiến độ phù hợp">
            Báo cáo chỉ hiển thị Enrollment và lịch sử học tập thực tế.
          </AdminEmpty>
        )}
      </section>
    </div>
  );
}
