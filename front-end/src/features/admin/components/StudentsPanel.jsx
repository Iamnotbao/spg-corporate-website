import { useCallback, useEffect, useState } from 'react';
import { listAdminUsers } from '../../../services/adminService.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { PAGE_SIZE_OPTIONS } from '../constants.js';
import { AdminAlert, AdminEmpty, AdminSkeletonRows } from './AdminFeedback.jsx';
import AdminIcon from './AdminIcon.jsx';
import AdminPageHeader from './AdminPageHeader.jsx';
import AdminPagination from './AdminPagination.jsx';

const EMPTY_PAGINATION = { page: 1, pageSize: 10, total: 0, totalPages: 1 };

export default function StudentsPanel({ onUnauthorized }) {
  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const search = useDebouncedValue(searchInput, 300);

  const load = useCallback(
    async (signal) => {
      setStatus('loading');
      setError('');
      try {
        const response = await listAdminUsers({
          page: pagination.page,
          pageSize: pagination.pageSize,
          role: 'student',
          search,
          signal,
        });
        setStudents(response.data || []);
        setPagination(response.pagination || EMPTY_PAGINATION);
        setStatus('ready');
      } catch (caught) {
        if (caught.name === 'AbortError') return;
        if (caught.status === 401 && onUnauthorized(caught)) return;
        setError(caught.message || 'Không thể tải danh sách học viên.');
        setStatus('error');
      }
    },
    [onUnauthorized, pagination.page, pagination.pageSize, search],
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  function updateSearch(value) {
    setSearchInput(value);
    setPagination((current) => ({ ...current, page: 1 }));
  }

  return (
    <div className="admin-learning-page">
      <AdminPageHeader
        description="Danh sách tài khoản học viên thật; tiến độ chi tiết nằm trong mục Tiến độ."
        eyebrow="Users"
        title="Học viên"
      />
      {error && <AdminAlert onRetry={() => load()}>{error}</AdminAlert>}
      <section className="admin-panel admin-learning-list">
        <div className="admin-learning-toolbar">
          <label>
            <AdminIcon name="search" size={18} />
            <span className="admin-sr-only">Tìm học viên</span>
            <input
              onChange={(event) => updateSearch(event.target.value)}
              placeholder="Tìm tên đăng nhập hoặc tên hiển thị…"
              type="search"
              value={searchInput}
            />
          </label>
          <select
            aria-label="Số học viên mỗi trang"
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
              <option key={size} value={size}>{size}/trang</option>
            ))}
          </select>
        </div>
        {status === 'loading' ? (
          <AdminSkeletonRows count={6} />
        ) : students.length ? (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table admin-learning-table">
                <thead>
                  <tr><th>Học viên</th><th>Tài khoản</th><th>Trạng thái</th></tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id}>
                      <td><strong>{student.displayName || student.username}</strong></td>
                      <td><small>@{student.username}</small></td>
                      <td>
                        <span className={`admin-learning-badge ${student.active === false ? 'is-draft' : 'is-published'}`}>
                          {student.active === false ? 'Đã khóa' : 'Hoạt động'}
                        </span>
                      </td>
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
          <AdminEmpty title="Chưa có học viên phù hợp">
            Học viên đăng ký hoặc được tạo với vai trò student sẽ xuất hiện tại đây.
          </AdminEmpty>
        )}
      </section>
    </div>
  );
}
