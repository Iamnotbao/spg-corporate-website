import { useCallback, useEffect, useMemo, useState } from 'react';
import { ADMIN_DEFAULT_PAGE_SIZE } from '../constants.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import {
  emptyAdminTrash,
  listAdminTrash,
  purgeAdminTrash,
  restoreAdminTrash,
} from '../services/adminTrashService.js';
import {
  AdminAlert,
  AdminConfirmDialog,
  AdminEmpty,
  AdminSkeletonRows,
} from './AdminFeedback.jsx';
import AdminIcon from './AdminIcon.jsx';
import AdminPageHeader from './AdminPageHeader.jsx';
import AdminPagination from './AdminPagination.jsx';
import AdminFilterToolbar from './AdminFilterToolbar.jsx';

const TYPES = [
  ['', 'Tất cả loại'],
  ['course', 'Khóa học'],
  ['unit', 'Chương học'],
  ['lesson', 'Bài học'],
  ['vocabulary', 'Từ vựng'],
  ['quiz', 'Quiz'],
  ['character', 'Hán tự'],
  ['post', 'Blog'],
  ['job', 'Tuyển dụng'],
];

function impactTotal(impact = {}) {
  return Object.values(impact).reduce((sum, value) => sum + (Number(value) || 0), 0);
}

function impactText(impact = {}) {
  const labels = [
    ['units', 'chương'],
    ['lessons', 'bài học'],
    ['vocabularies', 'từ vựng'],
    ['quizzes', 'quiz'],
    ['quizQuestions', 'câu hỏi'],
    ['enrollments', 'ghi danh'],
    ['lessonProgress', 'tiến độ bài học'],
    ['vocabularyProgress', 'tiến độ từ vựng'],
    ['vocabularyReviewHistory', 'lịch sử ôn'],
    ['quizAttempts', 'lượt làm quiz'],
    ['characterAttempts', 'lượt luyện viết'],
  ];
  const parts = labels
    .filter(([key]) => Number(impact[key]) > 0)
    .map(([key, label]) => `${impact[key]} ${label}`);
  return parts.length ? parts.join(', ') : 'Không có dữ liệu phụ thuộc được ghi nhận';
}

function deletedAtText(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

export default function AdminTrashPanel({ onNotify, onUnauthorized }) {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 350);
  const [type, setType] = useState('');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(ADMIN_DEFAULT_PAGE_SIZE);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: ADMIN_DEFAULT_PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [confirmPurge, setConfirmPurge] = useState(null);
  const [confirmEmpty, setConfirmEmpty] = useState(false);

  const load = useCallback(
    async (signal) => {
      setStatus('loading');
      setError('');
      try {
        const response = await listAdminTrash({
          page,
          pageSize,
          search: debouncedSearch,
          type,
          from: dateRange.from,
          to: dateRange.to,
          signal,
        });
        if (signal?.aborted) return;
        setItems(response.data || []);
        setPagination(
          response.pagination || {
            page,
            pageSize,
            total: 0,
            totalPages: 1,
          },
        );
        setSelectedIds(new Set());
        setStatus('ready');
      } catch (caught) {
        if (caught?.name === 'AbortError') return;
        if (caught?.status === 401 && onUnauthorized(caught)) return;
        setError(caught?.message || 'Không thể tải Thùng rác.');
        setStatus('error');
      }
    },
    [dateRange.from, dateRange.to, debouncedSearch, onUnauthorized, page, pageSize, type],
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.has(`${item.type}:${item.id}`)),
    [items, selectedIds],
  );
  const allPageSelected =
    items.length > 0 && items.every((item) => selectedIds.has(`${item.type}:${item.id}`));

  function changeFilter(kind, value) {
    if (kind === 'search') setSearch(value);
    if (kind === 'type') setType(value);
    setPage(1);
  }

  function toggleItem(item) {
    const key = `${item.type}:${item.id}`;
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleCurrentPage() {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const item of items) {
        const key = `${item.type}:${item.id}`;
        if (allPageSelected) next.delete(key);
        else next.add(key);
      }
      return next;
    });
  }

  async function restoreItems(targets) {
    if (!targets.length || busy) return;
    setBusy(true);
    let success = 0;
    const failures = [];
    for (const item of targets) {
      try {
        await restoreAdminTrash(item.type, item.id);
        success += 1;
      } catch (caught) {
        if (caught?.status === 401 && onUnauthorized(caught)) {
          setBusy(false);
          return;
        }
        failures.push(caught?.message || item.label);
      }
    }
    await load();
    setBusy(false);
    if (success) onNotify(`Đã khôi phục ${success} mục về trạng thái an toàn.`);
    if (failures.length) {
      onNotify(`${failures.length} mục chưa thể khôi phục. ${failures[0]}`, 'error');
    }
  }

  async function purgeItems(targets) {
    if (!targets.length || busy) return;
    setBusy(true);
    let success = 0;
    const failures = [];
    for (const item of targets) {
      try {
        await purgeAdminTrash(item.type, item.id);
        success += 1;
      } catch (caught) {
        if (caught?.status === 401 && onUnauthorized(caught)) {
          setBusy(false);
          setConfirmPurge(null);
          return;
        }
        failures.push(caught?.message || item.label);
      }
    }
    setConfirmPurge(null);
    await load();
    setBusy(false);
    if (success) onNotify(`Đã xóa vĩnh viễn ${success} mục và dữ liệu phụ thuộc.`);
    if (failures.length) {
      onNotify(`${failures.length} mục chưa thể xóa vĩnh viễn. ${failures[0]}`, 'error');
    }
  }

  async function emptyTrash() {
    if (busy) return;
    setBusy(true);
    try {
      const response = await emptyAdminTrash();
      setConfirmEmpty(false);
      await load();
      onNotify(`Đã dọn sạch Thùng rác (${response?.data?.deleted || 0} bản ghi).`);
    } catch (caught) {
      if (caught?.status === 401 && onUnauthorized(caught)) return;
      onNotify(caught?.message || 'Không thể dọn sạch Thùng rác.', 'error');
    } finally {
      setBusy(false);
    }
  }

  const purgeTargets = confirmPurge || [];
  const purgeImpact = purgeTargets.reduce(
    (sum, item) => sum + impactTotal(item.impact),
    0,
  );

  return (
    <div className="admin-learning-page">
      <AdminPageHeader
        action={
          <button
            className="admin-button admin-button--danger"
            disabled={!pagination.total || busy}
            onClick={() => setConfirmEmpty(true)}
            type="button"
          >
            <AdminIcon name="trash" size={16} />
            Dọn sạch Thùng rác
          </button>
        }
        description="Mục bị xóa được giữ an toàn ở đây. Khôi phục sẽ đưa nội dung về bản nháp; xóa vĩnh viễn sẽ dọn cả dữ liệu phụ thuộc."
        eyebrow="System"
        title="Thùng rác"
      />

      {error && (
        <AdminAlert onRetry={status === 'error' ? () => load() : undefined}>
          {error}
        </AdminAlert>
      )}

      <section className="admin-panel admin-learning-list">
        <AdminFilterToolbar search={search} onSearchChange={(value) => changeFilter('search', value)} searchPlaceholder="Tìm tên nội dung đã xóa…" filters={[{ key: 'type', label: 'Loại nội dung', value: type, onChange: (value) => changeFilter('type', value), options: TYPES.map(([value, label]) => ({ value, label })) }]} from={dateRange.from} to={dateRange.to} onFromChange={(from) => { setDateRange((current) => ({ ...current, from })); setPage(1); }} onToChange={(to) => { setDateRange((current) => ({ ...current, to })); setPage(1); }} pageSize={pageSize} onPageSizeChange={(value) => { setPageSize(value); setPage(1); }} />

        {selectedItems.length > 0 && (
          <div className="admin-learning-selection-bar">
            <div>
              <strong>{selectedItems.length} mục đã chọn</strong>
              <span>Có thể khôi phục hoặc xóa vĩnh viễn.</span>
            </div>
            <div>
              <button
                className="admin-button admin-button--secondary"
                disabled={busy}
                onClick={() => restoreItems(selectedItems)}
                type="button"
              >
                Khôi phục đã chọn ({selectedItems.length})
              </button>
              <button
                className="admin-button admin-button--danger"
                disabled={busy}
                onClick={() => setConfirmPurge(selectedItems)}
                type="button"
              >
                Xóa vĩnh viễn ({selectedItems.length})
              </button>
              <button
                className="admin-button admin-button--secondary"
                disabled={busy}
                onClick={() => setSelectedIds(new Set())}
                type="button"
              >
                Bỏ chọn
              </button>
            </div>
          </div>
        )}

        {status === 'loading' ? (
          <AdminSkeletonRows count={6} />
        ) : items.length ? (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table admin-learning-table">
                <thead>
                  <tr>
                    <th className="admin-learning-select-cell">
                      <input
                        aria-label="Chọn trang hiện tại"
                        checked={allPageSelected}
                        onChange={toggleCurrentPage}
                        type="checkbox"
                      />
                    </th>
                    <th>Nội dung</th>
                    <th>Loại</th>
                    <th>Đã xóa lúc</th>
                    <th>Dữ liệu liên quan</th>
                    <th className="admin-table__actions-heading">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const key = `${item.type}:${item.id}`;
                    return (
                      <tr className={selectedIds.has(key) ? 'is-selected' : ''} key={key}>
                        <td className="admin-learning-select-cell">
                          <input
                            aria-label={`Chọn ${item.label}`}
                            checked={selectedIds.has(key)}
                            onChange={() => toggleItem(item)}
                            type="checkbox"
                          />
                        </td>
                        <td>
                          <strong>{item.label}</strong>
                          <small>{item.id}</small>
                        </td>
                        <td>{item.typeLabel}</td>
                        <td>{deletedAtText(item.deletedAt)}</td>
                        <td>
                          <small>{impactText(item.impact)}</small>
                        </td>
                        <td className="admin-learning-actions">
                          <button
                            className="admin-button admin-button--secondary"
                            disabled={busy}
                            onClick={() => restoreItems([item])}
                            type="button"
                          >
                            Khôi phục
                          </button>
                          <button
                            className="admin-button admin-button--danger"
                            disabled={busy}
                            onClick={() => setConfirmPurge([item])}
                            type="button"
                          >
                            Xóa vĩnh viễn
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <AdminPagination onPageChange={setPage} pagination={pagination} />
          </>
        ) : (
          <AdminEmpty title="Thùng rác đang trống">
            Các Course, Unit, Lesson, Vocabulary, Quiz, Hán tự, Blog hoặc Job bị xóa sẽ xuất hiện ở đây.
          </AdminEmpty>
        )}
      </section>

      <AdminConfirmDialog
        confirmLabel={`Xóa vĩnh viễn ${purgeTargets.length} mục`}
        description={`Thao tác này không thể hoàn tác. Hệ thống sẽ xóa các mục đã chọn và dữ liệu phụ thuộc của chúng. Tổng tác động được ghi nhận: ${purgeImpact} bản ghi/liên kết.`}
        loading={busy}
        onCancel={() => setConfirmPurge(null)}
        onConfirm={() => purgeItems(purgeTargets)}
        open={Boolean(purgeTargets.length)}
        title="Xóa vĩnh viễn khỏi hệ thống?"
      />

      <AdminConfirmDialog
        confirmLabel="Dọn sạch Thùng rác"
        description="Toàn bộ nội dung trong Thùng rác cùng tiến độ, lịch sử ôn tập, lượt làm quiz và dữ liệu phụ thuộc tương ứng sẽ bị xóa vĩnh viễn. Thao tác này không thể hoàn tác."
        loading={busy}
        onCancel={() => setConfirmEmpty(false)}
        onConfirm={emptyTrash}
        open={confirmEmpty}
        title="Dọn sạch toàn bộ Thùng rác?"
      />
    </div>
  );
}
