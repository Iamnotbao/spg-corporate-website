import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createAdminLearning,
  deleteAdminLearning,
  getAdminLearning,
  listAdminCourseOptions,
  listAdminLearning,
  listAdminUnitOptions,
  updateAdminLearning,
  uploadAdminImage,
} from '../../../services/adminService.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { PAGE_SIZE_OPTIONS } from '../constants.js';
import {
  AdminAlert,
  AdminConfirmDialog,
  AdminEmpty,
  AdminSkeletonRows,
} from './AdminFeedback.jsx';
import AdminIcon from './AdminIcon.jsx';
import AdminPageHeader from './AdminPageHeader.jsx';
import AdminPagination from './AdminPagination.jsx';

const PAGE_SIZE = 10;
const SECTION_COPY = {
  courses: {
    title: 'Khóa học',
    description: 'Quản lý thông tin, thứ tự và trạng thái xuất bản của khóa học.',
    singular: 'khóa học',
  },
  units: {
    title: 'Chương học',
    description: 'Tổ chức các chương theo đúng thứ tự trong từng khóa học.',
    singular: 'chương học',
  },
  lessons: {
    title: 'Bài học',
    description: 'Biên soạn bài học và kiểm soát nội dung được xuất bản công khai.',
    singular: 'bài học',
  },
};

const LESSON_TYPES = [
  ['vocabulary', 'Từ vựng'],
  ['grammar', 'Ngữ pháp'],
  ['character', 'Hán tự'],
  ['listening', 'Luyện nghe'],
  ['reading', 'Đọc hiểu'],
  ['practice', 'Luyện tập'],
  ['quiz', 'Quiz'],
];

function emptyForm(section, parents) {
  if (section === 'courses') {
    return {
      title: '',
      slug: '',
      description: '',
      thumbnail: '',
      level: '',
      estimatedDuration: '',
      status: 'draft',
      order: '0',
    };
  }
  if (section === 'units') {
    return {
      courseId: parents.courses[0]?.id || '',
      title: '',
      description: '',
      order: '0',
    };
  }
  return {
    unitId: parents.units[0]?.id || '',
    title: '',
    slug: '',
    description: '',
    content: '',
    type: 'vocabulary',
    duration: '',
    order: '0',
    status: 'draft',
  };
}

function payloadFor(section, form) {
  const payload = Object.fromEntries(
    Object.entries(form).filter(([key]) => key !== 'id'),
  );
  payload.order = Number(form.order);
  if (section === 'courses') {
    payload.estimatedDuration =
      form.estimatedDuration === '' ? undefined : Number(form.estimatedDuration);
  }
  if (section === 'lessons') {
    payload.duration = form.duration === '' ? undefined : Number(form.duration);
  }
  Object.keys(payload).forEach(
    (key) => payload[key] === undefined && delete payload[key],
  );
  return payload;
}

function LearningForm({
  form,
  onCancel,
  onChange,
  onSubmit,
  onUploadThumbnail,
  parents,
  saving,
  section,
  uploadingThumbnail,
}) {
  const input = (name, label, options = {}) => (
    <label
      className={`admin-form-field${options.full ? ' admin-learning-field--full' : ''}`}
    >
      <span>
        {label} {options.required && <b>*</b>}
      </span>
      {options.textarea ? (
        <textarea
          className={options.long ? 'admin-editor__long-copy' : undefined}
          name={name}
          onChange={onChange}
          required={options.required}
          value={form[name]}
        />
      ) : (
        <input
          min={options.min}
          name={name}
          onChange={onChange}
          required={options.required}
          type={options.type || 'text'}
          value={form[name]}
        />
      )}
    </label>
  );

  return (
    <form className="admin-form-section admin-learning-form" onSubmit={onSubmit}>
      <div className="admin-form-section__heading">
        <span>
          <AdminIcon name="edit" size={16} />
        </span>
        <div>
          <h3>
            {form.id ? 'Chỉnh sửa' : 'Tạo mới'} {SECTION_COPY[section].singular}
          </h3>
          <p>Các trường bắt buộc được kiểm tra lại tại API.</p>
        </div>
      </div>
      <div className="admin-form-grid">
        {section === 'units' && (
          <label className="admin-form-field">
            <span>
              Khóa học <b>*</b>
            </span>
            <select name="courseId" onChange={onChange} required value={form.courseId}>
              <option value="">Chọn khóa học</option>
              {parents.courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </label>
        )}
        {section === 'lessons' && (
          <label className="admin-form-field">
            <span>
              Chương học <b>*</b>
            </span>
            <select name="unitId" onChange={onChange} required value={form.unitId}>
              <option value="">Chọn chương học</option>
              {parents.units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.title}
                </option>
              ))}
            </select>
          </label>
        )}
        {input('title', 'Tiêu đề', { required: true })}
        {(section === 'courses' || section === 'lessons') && input('slug', 'Slug')}
        {section === 'courses' && input('level', 'Cấp độ', { required: true })}
        {section === 'courses' && (
          <div className="admin-form-field admin-learning-field--full">
            <span>Ảnh đại diện khóa học</span>
            {form.thumbnail && (
              <div className="admin-learning-image-preview">
                <img src={form.thumbnail} alt="Ảnh đại diện khóa học" />
              </div>
            )}
            <label className="admin-button admin-button--secondary admin-learning-upload-button">
              {uploadingThumbnail ? 'Đang tải ảnh…' : 'Chọn ảnh từ máy'}
              <input
                hidden
                type="file"
                accept="image/*"
                disabled={uploadingThumbnail}
                onChange={(event) => {
                  onUploadThumbnail(event.target.files?.[0]);
                  event.target.value = '';
                }}
              />
            </label>
            {form.thumbnail && (
              <button
                className="admin-button admin-button--secondary"
                onClick={() => onChange({ target: { name: 'thumbnail', value: '' } })}
                type="button"
              >
                Gỡ ảnh
              </button>
            )}
            <small>Ảnh sẽ được upload qua backend; không cần copy URL thủ công.</small>
          </div>
        )}
        {section === 'courses' &&
          input('estimatedDuration', 'Thời lượng dự kiến (phút)', {
            type: 'number',
            min: 0,
          })}
        {section === 'lessons' &&
          input('duration', 'Thời lượng (phút)', { type: 'number', min: 0 })}
        {(section === 'courses' || section === 'lessons') && (
          <label className="admin-form-field">
            <span>
              Trạng thái <b>*</b>
            </span>
            <select name="status" onChange={onChange} value={form.status}>
              <option value="draft">Bản nháp</option>
              <option value="published">Đã xuất bản</option>
            </select>
          </label>
        )}
        {section === 'lessons' && (
          <label className="admin-form-field">
            <span>
              Loại bài học <b>*</b>
            </span>
            <select name="type" onChange={onChange} value={form.type}>
              {LESSON_TYPES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        )}
        {input('order', 'Thứ tự', { required: true, type: 'number', min: 0 })}
        {input('description', 'Mô tả', {
          textarea: true,
          full: true,
          required: section === 'courses',
        })}
        {section === 'lessons' &&
          input('content', 'Nội dung bài học', {
            textarea: true,
            long: true,
            full: true,
            required: true,
          })}
      </div>
      <div className="admin-learning-form__actions">
        <button
          className="admin-button admin-button--secondary"
          onClick={onCancel}
          type="button"
        >
          Hủy
        </button>
        <button
          className="admin-button admin-button--primary"
          disabled={saving || uploadingThumbnail}
          type="submit"
        >
          {saving ? 'Đang lưu…' : 'Lưu nội dung'}
        </button>
      </div>
    </form>
  );
}

export default function AdminLearningPanel({ onNotify, onUnauthorized, section }) {
  const copy = SECTION_COPY[section];
  const [items, setItems] = useState([]);
  const [parents, setParents] = useState({ courses: [], units: [] });
  const [status, setStatus] = useState('loading');
  const [loadError, setLoadError] = useState('');
  const [parentError, setParentError] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 350);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = useCallback(
    async (signal) => {
      setStatus('loading');
      setLoadError('');
      try {
        const current = await listAdminLearning(section, {
          page,
          pageSize,
          search: debouncedSearch,
          status: section === 'courses' ? filter : '',
          courseId: section === 'units' ? filter : '',
          type: section === 'lessons' ? filter : '',
          signal,
        });
        if (signal?.aborted) return;
        setItems(current.data || []);
        setPagination(
          current.pagination || {
            page,
            pageSize,
            total: 0,
            totalPages: 1,
          },
        );
        setStatus('ready');
      } catch (requestError) {
        if (requestError?.name === 'AbortError') return;
        if (onUnauthorized(requestError)) return;
        setLoadError(requestError.message);
        setStatus('error');
      }
    },
    [debouncedSearch, filter, onUnauthorized, page, pageSize, section],
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const loadParentOptions = useCallback(
    async (signal) => {
      setParentError('');
      if (section === 'courses') {
        setParents({ courses: [], units: [] });
        return;
      }

      try {
        const [coursesResult, unitsResult] = await Promise.allSettled([
          listAdminCourseOptions({ pageSize: 100, signal }),
          section === 'lessons'
            ? listAdminUnitOptions({ pageSize: 100, signal })
            : Promise.resolve({ data: [] }),
        ]);
        if (signal?.aborted) return;

        const optionError = [coursesResult, unitsResult].find(
          (result) => result.status === 'rejected' && result.reason?.name !== 'AbortError',
        );
        if (optionError) throw optionError.reason;

        setParents({
          courses: coursesResult.value.data || [],
          units: unitsResult.value.data || [],
        });
      } catch (requestError) {
        if (requestError?.name === 'AbortError') return;
        if (onUnauthorized(requestError)) return;
        setParentError(
          requestError?.message || 'Không thể tải dữ liệu cho bộ lọc và biểu mẫu.',
        );
      }
    },
    [onUnauthorized, section],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadParentOptions(controller.signal);
    return () => controller.abort();
  }, [loadParentOptions]);

  useEffect(() => {
    setPage(1);
    setFilter('');
    setSearch('');
    setSelectedIds(new Set());
  }, [section]);

  const courseNames = useMemo(
    () => new Map(parents.courses.map((item) => [item.id, item.title])),
    [parents.courses],
  );
  const unitNames = useMemo(
    () => new Map(parents.units.map((item) => [item.id, item.title])),
    [parents.units],
  );
  const visibleItems = { length: pagination.total };
  const totalPages = pagination.totalPages;
  const safePage = pagination.page;
  const pagedItems = items;
  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.has(item.id)),
    [items, selectedIds],
  );
  const allPageSelected =
    pagedItems.length > 0 && pagedItems.every((item) => selectedIds.has(item.id));
  const canBulkPublish = section === 'courses' || section === 'lessons';
  const selectedDrafts = selectedItems.filter((item) => item.status !== 'published');
  const selectedPublished = selectedItems.filter((item) => item.status === 'published');

  function beginCreate() {
    setForm(emptyForm(section, parents));
  }

  async function beginEdit(item) {
    const parentType =
      section === 'units' ? 'courses' : section === 'lessons' ? 'units' : '';
    const parentId =
      section === 'units' ? item.courseId : section === 'lessons' ? item.unitId : '';
    const parentList = section === 'units' ? parents.courses : parents.units;
    if (parentType && parentId && !parentList.some((parent) => parent.id === parentId)) {
      try {
        const response = await getAdminLearning(parentType, parentId);
        if (response?.data) {
          setParents((current) => ({
            ...current,
            [parentType]: [...current[parentType], response.data],
          }));
        }
      } catch {
        // Keep the stored parent id; the backend remains the source of validation.
      }
    }
    const next = emptyForm(section, parents);
    Object.keys(next).forEach((key) => {
      if (item[key] != null) next[key] = String(item[key]);
    });
    setForm({ ...next, id: item.id });
  }

  function changeSearch(value) {
    setSearch(value);
    setPage(1);
  }

  function changeFilter(value) {
    setFilter(value);
    setPage(1);
  }

  function toggleSelected(id) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleCurrentPage() {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allPageSelected) pagedItems.forEach((item) => next.delete(item.id));
      else pagedItems.forEach((item) => next.add(item.id));
      return next;
    });
  }

  async function uploadThumbnail(file) {
    if (!file || section !== 'courses') return;
    setUploadingThumbnail(true);
    try {
      const uploaded = await uploadAdminImage(file, 'mandora/courses');
      setForm((current) => (current ? { ...current, thumbnail: uploaded.url } : current));
      onNotify('Đã upload ảnh khóa học. Nhấn Lưu nội dung để áp dụng.');
    } catch (requestError) {
      if (!onUnauthorized(requestError)) {
        onNotify(requestError?.message || 'Không thể upload ảnh khóa học.', 'error');
      }
    } finally {
      setUploadingThumbnail(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      if (form.id) {
        await updateAdminLearning(section, form.id, payloadFor(section, form));
      } else {
        await createAdminLearning(section, payloadFor(section, form));
      }
      onNotify(`Đã lưu ${copy.singular}.`);
      setForm(null);
      await load();
    } catch (requestError) {
      if (onUnauthorized(requestError)) return;
      onNotify(requestError.message || `Không thể lưu ${copy.singular}.`, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function publishSelected() {
    if (!canBulkPublish || !selectedDrafts.length || bulkBusy) return;
    setBulkBusy(true);
    const failures = [];
    let successCount = 0;
    for (const item of selectedDrafts) {
      try {
        await updateAdminLearning(section, item.id, { status: 'published' });
        successCount += 1;
      } catch (requestError) {
        if (onUnauthorized(requestError)) {
          setBulkBusy(false);
          return;
        }
        failures.push({ item, message: requestError.message });
      }
    }
    await load();
    setSelectedIds(new Set(failures.map(({ item }) => item.id)));
    setBulkBusy(false);
    if (successCount) {
      onNotify(`Đã xuất bản ${successCount} ${copy.singular}.`);
    }
    if (failures.length) {
      const first = failures[0];
      onNotify(
        `${failures.length} mục chưa thể xuất bản. ${first.item.title}: ${first.message}`,
        'error',
      );
    }
  }

  async function unpublishSelected() {
    if (!canBulkPublish || !selectedPublished.length || bulkBusy) return;
    setBulkBusy(true);
    const failures = [];
    let successCount = 0;
    for (const item of selectedPublished) {
      try {
        await updateAdminLearning(section, item.id, { status: 'draft' });
        successCount += 1;
      } catch (requestError) {
        if (onUnauthorized(requestError)) {
          setBulkBusy(false);
          return;
        }
        failures.push({ item, message: requestError.message });
      }
    }
    await load();
    setBulkBusy(false);
    if (successCount) {
      onNotify(`Đã gỡ xuất bản ${successCount} ${copy.singular}.`);
    }
    if (failures.length) {
      const first = failures[0];
      onNotify(
        `${failures.length} mục chưa thể gỡ xuất bản. ${first.item.title}: ${first.message}`,
        'error',
      );
    }
  }

  function requestDelete(itemsToDelete) {
    const normalized = Array.isArray(itemsToDelete) ? itemsToDelete : [itemsToDelete];
    if (!normalized.length) return;
    setConfirmDelete(normalized);
  }

  async function confirmDeletion() {
    if (!confirmDelete?.length || bulkBusy) return;
    setBulkBusy(true);
    const failures = [];
    let successCount = 0;
    for (const item of confirmDelete) {
      try {
        await deleteAdminLearning(section, item.id);
        successCount += 1;
      } catch (requestError) {
        if (onUnauthorized(requestError)) {
          setBulkBusy(false);
          setConfirmDelete(null);
          return;
        }
        failures.push({ item, message: requestError.message });
      }
    }
    await load();
    setConfirmDelete(null);
    setSelectedIds(new Set(failures.map(({ item }) => item.id)));
    setBulkBusy(false);
    if (successCount) onNotify(`Đã xóa ${successCount} ${copy.singular}.`);
    if (failures.length) {
      const first = failures[0];
      onNotify(
        `${failures.length} mục chưa thể xóa. ${first.item.title}: ${first.message}`,
        'error',
      );
    }
  }

  const cannotCreate =
    (section === 'units' && !parents.courses.length) ||
    (section === 'lessons' && !parents.units.length);

  return (
    <div className="admin-learning-page">
      <AdminPageHeader
        action={
          <button
            className="admin-button admin-button--primary"
            disabled={cannotCreate}
            onClick={beginCreate}
            type="button"
          >
            <AdminIcon name="plus" size={17} /> Tạo {copy.singular}
          </button>
        }
        description={copy.description}
        eyebrow="Learning content"
        title={copy.title}
      />
      {status === 'error' && loadError && (
        <AdminAlert onRetry={() => load()}>{loadError}</AdminAlert>
      )}
      {parentError && (
        <AdminAlert onRetry={() => loadParentOptions()}>{parentError}</AdminAlert>
      )}
      {form && (
        <LearningForm
          form={form}
          onCancel={() => setForm(null)}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              [event.target.name]: event.target.value,
            }))
          }
          onSubmit={submit}
          onUploadThumbnail={uploadThumbnail}
          parents={parents}
          saving={saving}
          section={section}
          uploadingThumbnail={uploadingThumbnail}
        />
      )}
      <section className="admin-panel admin-learning-list">
        <div className="admin-learning-toolbar">
          <label>
            <span className="admin-sr-only">Tìm kiếm</span>
            <AdminIcon name="search" size={18} />
            <input
              onChange={(event) => changeSearch(event.target.value)}
              placeholder="Tìm tiêu đề, mô tả, slug, cấp độ, nội dung…"
              type="search"
              value={search}
            />
          </label>
          {section === 'courses' && (
            <select
              aria-label="Lọc trạng thái"
              onChange={(event) => changeFilter(event.target.value)}
              value={filter}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="draft">Bản nháp</option>
              <option value="published">Đã xuất bản</option>
            </select>
          )}
          {section === 'units' && (
            <select
              aria-label="Lọc khóa học"
              onChange={(event) => changeFilter(event.target.value)}
              value={filter}
            >
              <option value="">Tất cả khóa học</option>
              {parents.courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          )}
          {section === 'lessons' && (
            <select
              aria-label="Lọc loại bài học"
              onChange={(event) => changeFilter(event.target.value)}
              value={filter}
            >
              <option value="">Tất cả loại bài</option>
              {LESSON_TYPES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          )}
          <select
            aria-label="Số nội dung mỗi trang"
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              setPage(1);
            }}
            value={pageSize}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}/trang
              </option>
            ))}
          </select>
        </div>

        {selectedItems.length > 0 && (
          <div className="admin-learning-selection-bar">
            <div>
              <strong>{selectedItems.length} mục đã chọn</strong>
              <span>Thao tác hàng loạt vẫn tuân theo validation của backend.</span>
            </div>
            <div>
              {canBulkPublish && (
                <button
                  className="admin-button admin-button--primary"
                  disabled={!selectedDrafts.length || bulkBusy}
                  onClick={publishSelected}
                  type="button"
                >
                  <AdminIcon name="check" size={16} />
                  {bulkBusy
                    ? 'Đang xử lý…'
                    : `Xuất bản đã chọn (${selectedDrafts.length})`}
                </button>
              )}
              {canBulkPublish && (
                <button
                  className="admin-button admin-button--secondary"
                  disabled={!selectedPublished.length || bulkBusy}
                  onClick={unpublishSelected}
                  type="button"
                >
                  <AdminIcon name="refresh" size={16} />
                  {bulkBusy
                    ? 'Đang xử lý…'
                    : `Gỡ xuất bản đã chọn (${selectedPublished.length})`}
                </button>
              )}
              <button
                className="admin-button admin-button--danger"
                disabled={bulkBusy}
                onClick={() => requestDelete(selectedItems)}
                type="button"
              >
                <AdminIcon name="trash" size={16} /> Xóa đã chọn
              </button>
              <button
                className="admin-button admin-button--secondary"
                disabled={bulkBusy}
                onClick={() => setSelectedIds(new Set())}
                type="button"
              >
                Bỏ chọn
              </button>
            </div>
          </div>
        )}

        {status === 'loading' && <AdminSkeletonRows />}
        {status === 'ready' && visibleItems.length === 0 && (
          <AdminEmpty title={`Chưa có ${copy.singular}`}>
            Tạo nội dung đầu tiên hoặc thử bộ lọc khác.
          </AdminEmpty>
        )}
        {status === 'ready' && visibleItems.length > 0 && (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table admin-learning-table">
                <thead>
                  <tr>
                    <th className="admin-learning-select-cell">
                      <input
                        aria-label="Chọn tất cả mục trên trang hiện tại"
                        checked={allPageSelected}
                        onChange={toggleCurrentPage}
                        type="checkbox"
                      />
                    </th>
                    <th>Tiêu đề</th>
                    <th>Thuộc</th>
                    <th>Trạng thái / loại</th>
                    <th>Thứ tự</th>
                    <th className="admin-table__actions-heading">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedItems.map((item) => (
                    <tr
                      className={selectedIds.has(item.id) ? 'is-selected' : undefined}
                      key={item.id}
                    >
                      <td className="admin-learning-select-cell">
                        <input
                          aria-label={`Chọn ${item.title}`}
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelected(item.id)}
                          type="checkbox"
                        />
                      </td>
                      <td>
                        <strong>{item.title}</strong>
                        {item.slug && <small>{item.slug}</small>}
                      </td>
                      <td>
                        {section === 'units'
                          ? courseNames.get(item.courseId)
                          : section === 'lessons'
                            ? unitNames.get(item.unitId)
                            : item.level}
                      </td>
                      <td>
                        <span
                          className={`admin-learning-badge is-${item.status || item.type}`}
                        >
                          {item.status || item.type || '—'}
                        </span>
                      </td>
                      <td>{item.order}</td>
                      <td className="admin-learning-actions">
                        <button
                          className="admin-button admin-button--secondary"
                          onClick={() => beginEdit(item)}
                          type="button"
                        >
                          Sửa
                        </button>
                        <button
                          className="admin-button admin-button--danger"
                          onClick={() => requestDelete(item)}
                          type="button"
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <AdminPagination
              onPageChange={setPage}
              pagination={{
                page: safePage,
                pageSize,
                total: visibleItems.length,
                totalPages,
              }}
            />
          </>
        )}
      </section>

      <AdminConfirmDialog
        confirmLabel={
          confirmDelete?.length > 1 ? `Xóa ${confirmDelete.length} mục` : 'Xóa nội dung'
        }
        description={
          confirmDelete?.length > 1
            ? 'Các mục đang xuất bản hoặc có dữ liệu học tập liên quan có thể bị backend từ chối. Những mục xóa được sẽ bị xóa vĩnh viễn.'
            : confirmDelete?.[0]
              ? `Bạn sắp xóa “${confirmDelete[0].title}”. Backend sẽ chặn nếu nội dung đang xuất bản hoặc còn dữ liệu phụ thuộc.`
              : ''
        }
        loading={bulkBusy}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={confirmDeletion}
        open={Boolean(confirmDelete?.length)}
        title={
          confirmDelete?.length > 1
            ? 'Xác nhận xóa các mục đã chọn?'
            : 'Xác nhận xóa nội dung?'
        }
      />
    </div>
  );
}
