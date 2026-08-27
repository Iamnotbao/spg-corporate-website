import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getAdminLearning,
  listAdminLessonOptions,
} from '../../../services/adminService.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { PAGE_SIZE_OPTIONS } from '../constants.js';
import {
  analyzeAdminVocabularyDuplicates,
  cleanupAdminVocabularyDuplicates,
  createAdminVocabulary,
  deleteAdminVocabulary,
  listAdminVocabulary,
  updateAdminVocabulary,
} from '../services/adminVocabularyService.js';
import {
  downloadCsv,
  vocabularyTemplateCsv,
  vocabularyToCsv,
} from '../utils/vocabularyCsv.js';
import {
  AdminAlert,
  AdminConfirmDialog,
  AdminEmpty,
  AdminSkeletonRows,
} from './AdminFeedback.jsx';
import AdminIcon from './AdminIcon.jsx';
import AdminPageHeader from './AdminPageHeader.jsx';
import AdminPagination from './AdminPagination.jsx';
import AdminVocabularyImportDialog from './AdminVocabularyImportDialog.jsx';

const PAGE_SIZE = 10;
const HSK_LEVELS = ['HSK 1', 'HSK 2', 'HSK 3', 'HSK 4', 'HSK 5', 'HSK 6', 'NgoÃ i HSK'];
const EDITABLE_FIELDS = [
  'simplified',
  'traditional',
  'pinyin',
  'meaningVietnamese',
  'meaningEnglish',
  'hskLevel',
  'lessonId',
  'status',
  'audioUrl',
  'exampleChinese',
  'examplePinyin',
  'exampleVietnamese',
];

const EMPTY_FORM = {
  id: '',
  simplified: '',
  traditional: '',
  pinyin: '',
  meaningVietnamese: '',
  meaningEnglish: '',
  hskLevel: 'HSK 1',
  lessonId: '',
  status: 'draft',
  audioUrl: '',
  exampleChinese: '',
  examplePinyin: '',
  exampleVietnamese: '',
};

function payloadFrom(form) {
  return Object.fromEntries(
    EDITABLE_FIELDS.map((key) => [key, String(form?.[key] || '').trim()]),
  );
}

export default function AdminVocabularyPanel({ onNotify, onUnauthorized }) {
  const [items, setItems] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [lessonError, setLessonError] = useState('');
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 350);
  const [level, setLevel] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
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
  const [importOpen, setImportOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [duplicateReport, setDuplicateReport] = useState(null);
  const [duplicateBusy, setDuplicateBusy] = useState(false);
  const [confirmDuplicateCleanup, setConfirmDuplicateCleanup] = useState(false);

  const load = useCallback(
    async (signal) => {
      setStatus('loading');
      setError('');
      try {
        const vocabularyResponse = await listAdminVocabulary({
          page,
          pageSize,
          search: debouncedSearch,
          hskLevel: level,
          status: statusFilter,
          signal,
        });
        if (signal?.aborted) return;
        setItems(vocabularyResponse.data || []);
        setPagination(
          vocabularyResponse.pagination || {
            page,
            pageSize,
            total: 0,
            totalPages: 1,
          },
        );
        setStatus('ready');
      } catch (caught) {
        if (caught?.name === 'AbortError') return;
        if (caught.status === 401 && onUnauthorized(caught)) return;
        setError(caught.message || 'Không thể tải từ vựng.');
        setStatus('error');
      }
    },
    [debouncedSearch, level, onUnauthorized, page, pageSize, statusFilter],
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const loadLessonOptions = useCallback(
    async (signal) => {
      setLessonError('');
      try {
        const response = await listAdminLessonOptions({ pageSize: 100, signal });
        if (!signal?.aborted) setLessons(response.data || []);
      } catch (caught) {
        if (caught?.name === 'AbortError') return;
        if (caught?.status === 401 && onUnauthorized(caught)) return;
        setLessonError(
          caught?.message || 'Không thể tải danh sách bài học cho biểu mẫu.',
        );
      }
    },
    [onUnauthorized],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadLessonOptions(controller.signal);
    return () => controller.abort();
  }, [loadLessonOptions]);

  const lessonNames = useMemo(
    () => new Map(lessons.map((lesson) => [lesson.id, lesson.title])),
    [lessons],
  );
  const levels = HSK_LEVELS;
  const visible = { length: pagination.total };
  const totalPages = pagination.totalPages;
  const safePage = pagination.page;
  const paged = items;
  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.has(item.id)),
    [items, selectedIds],
  );
  const selectedDrafts = selectedItems.filter((item) => item.status !== 'published');
  const selectedPublished = selectedItems.filter((item) => item.status === 'published');
  const allPageSelected =
    items.length > 0 && items.every((item) => selectedIds.has(item.id));

  function changeFilter(kind, value) {
    if (kind === 'search') setSearch(value);
    if (kind === 'level') setLevel(value);
    if (kind === 'status') setStatusFilter(value);
    setPage(1);
  }

  function beginCreate() {
    setForm({ ...EMPTY_FORM, lessonId: lessons[0]?.id || '' });
  }

  async function beginEdit(item) {
    if (item.lessonId && !lessons.some((lesson) => lesson.id === item.lessonId)) {
      try {
        const response = await getAdminLearning('lessons', item.lessonId);
        if (response?.data) setLessons((current) => [...current, response.data]);
      } catch {
        // The form still preserves the parent id; the backend will validate it on save.
      }
    }
    setForm({
      ...EMPTY_FORM,
      ...Object.fromEntries(
        EDITABLE_FIELDS.map((key) => [key, item?.[key] == null ? '' : String(item[key])]),
      ),
      id: item.id,
    });
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
      if (allPageSelected) items.forEach((item) => next.delete(item.id));
      else items.forEach((item) => next.add(item.id));
      return next;
    });
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (form.id) await updateAdminVocabulary(form.id, payloadFrom(form));
      else await createAdminVocabulary(payloadFrom(form));
      onNotify(form.id ? 'Đã cập nhật từ vựng.' : 'Đã tạo từ vựng.');
      setForm(null);
      await load();
    } catch (caught) {
      if (caught.status === 401 && onUnauthorized(caught)) return;
      onNotify(caught.message || 'Không thể lưu từ vựng.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function publishSelected() {
    if (!selectedDrafts.length || bulkBusy) return;
    setBulkBusy(true);
    let success = 0;
    const failures = [];
    for (const item of selectedDrafts) {
      try {
        await updateAdminVocabulary(item.id, { status: 'published' });
        success += 1;
      } catch (caught) {
        if (caught.status === 401 && onUnauthorized(caught)) {
          setBulkBusy(false);
          return;
        }
        failures.push({ item, message: caught.message });
      }
    }
    await load();
    setSelectedIds(new Set(failures.map(({ item }) => item.id)));
    setBulkBusy(false);
    if (success) onNotify(`Đã xuất bản ${success} từ vựng.`);
    if (failures.length) {
      onNotify(
        `${failures.length} từ chưa thể xuất bản. ${failures[0].message}`,
        'error',
      );
    }
  }

  async function unpublishSelected() {
    if (!selectedPublished.length || bulkBusy) return;
    setBulkBusy(true);
    let success = 0;
    const failures = [];
    for (const item of selectedPublished) {
      try {
        await updateAdminVocabulary(item.id, { status: 'draft' });
        success += 1;
      } catch (caught) {
        if (caught.status === 401 && onUnauthorized(caught)) {
          setBulkBusy(false);
          return;
        }
        failures.push({ item, message: caught.message });
      }
    }
    await load();
    setBulkBusy(false);
    if (success) onNotify(`ÄÃ£ gá»¡ xuáº¥t báº£n ${success} tá»« vá»±ng.`);
    if (failures.length) {
      onNotify(
        `${failures.length} tá»« chÆ°a thá»ƒ gá»¡ xuáº¥t báº£n. ${failures[0].message}`,
        'error',
      );
    }
  }

  async function inspectDuplicates() {
    if (duplicateBusy) return;
    setDuplicateBusy(true);
    try {
      const response = await analyzeAdminVocabularyDuplicates();
      const report = response.data;
      setDuplicateReport(report);
      if (!report?.summary?.duplicateGroups) {
        onNotify('Không phát hiện từ vựng trùng lặp.');
        return;
      }
      if (!report.summary.deletableRecords) {
        onNotify(
          `Phát hiện ${report.summary.duplicateGroups} nhóm trùng nhưng các bản ghi dư đều có lịch sử học viên nên chưa thể xóa tự động.`,
          'error',
        );
        return;
      }
      setConfirmDuplicateCleanup(true);
    } catch (caught) {
      if (caught.status === 401 && onUnauthorized(caught)) return;
      onNotify(caught.message || 'Không thể kiểm tra từ trùng.', 'error');
    } finally {
      setDuplicateBusy(false);
    }
  }

  async function cleanupDuplicates() {
    if (duplicateBusy) return;
    setDuplicateBusy(true);
    try {
      const response = await cleanupAdminVocabularyDuplicates();
      const result = response.data;
      setConfirmDuplicateCleanup(false);
      setDuplicateReport(result);
      await load();
      const protectedText = result?.summary?.protectedRecords
        ? ` ${result.summary.protectedRecords} bản ghi có lịch sử học viên được giữ lại.`
        : '';
      onNotify(`Đã xóa ${result?.deleted || 0} bản ghi từ vựng trùng.${protectedText}`);
    } catch (caught) {
      if (caught.status === 401 && onUnauthorized(caught)) return;
      onNotify(caught.message || 'Không thể xóa các từ trùng.', 'error');
    } finally {
      setDuplicateBusy(false);
    }
  }

  async function confirmDeletion() {
    if (!confirmDelete?.length || bulkBusy) return;
    setBulkBusy(true);
    let success = 0;
    const failures = [];
    for (const item of confirmDelete) {
      try {
        await deleteAdminVocabulary(item.id);
        success += 1;
      } catch (caught) {
        if (caught.status === 401 && onUnauthorized(caught)) {
          setBulkBusy(false);
          setConfirmDelete(null);
          return;
        }
        failures.push({ item, message: caught.message });
      }
    }
    await load();
    setSelectedIds(new Set(failures.map(({ item }) => item.id)));
    setConfirmDelete(null);
    setBulkBusy(false);
    if (success) onNotify(`Đã xóa ${success} từ vựng.`);
    if (failures.length) {
      onNotify(`${failures.length} từ chưa thể xóa. ${failures[0].message}`, 'error');
    }
  }

  function exportVocabulary() {
    downloadCsv('mandora-vocabulary.csv', vocabularyToCsv(items));
    onNotify(`Đã export ${items.length} từ vựng.`);
  }

  function downloadTemplate() {
    downloadCsv('mandora-vocabulary-template.csv', vocabularyTemplateCsv());
    onNotify('Đã tải mẫu CSV. Không cần lessonId hoặc status trong file.');
  }

  return (
    <div className="admin-learning-page">
      <AdminPageHeader
        action={
          <div className="admin-vocabulary-actions">
            <button
              className="admin-button admin-button--secondary"
              onClick={downloadTemplate}
              type="button"
            >
              Mẫu CSV
            </button>
            <button
              className="admin-button admin-button--secondary"
              disabled={!items.length}
              onClick={exportVocabulary}
              type="button"
            >
              Export CSV
            </button>
            <button
              className="admin-button admin-button--secondary"
              disabled={!items.length || duplicateBusy}
              onClick={inspectDuplicates}
              type="button"
            >
              <AdminIcon name="search" size={16} />
              {duplicateBusy ? 'Đang kiểm tra…' : 'Tìm từ trùng'}
            </button>
            <button
              className="admin-button admin-button--secondary"
              disabled={!lessons.length}
              onClick={() => setImportOpen(true)}
              type="button"
            >
              <AdminIcon name="upload" size={16} /> Import
            </button>
            <button
              className="admin-button admin-button--primary"
              disabled={!lessons.length}
              onClick={beginCreate}
              type="button"
            >
              <AdminIcon name="plus" size={17} /> Tạo từ vựng
            </button>
          </div>
        }
        description="Tạo tay, import có review hoặc thao tác hàng loạt. Import hỗ trợ Excel/CSV và không cần copy lessonId."
        eyebrow="Learning content"
        title="Từ vựng"
      />

      {!lessons.length && status === 'ready' && (
        <AdminAlert>
          Chưa có Lesson nên Mandora chưa thể gắn từ vựng vào lộ trình học. Hãy tạo Course
          → Unit →{' '}
          <Link className="admin-inline-link" to="/admin/lessons">
            Lesson trước
          </Link>
          .
        </AdminAlert>
      )}

      {duplicateReport?.summary?.protectedRecords > 0 && (
        <AdminAlert>
          Còn {duplicateReport.summary.protectedRecords} bản ghi trùng có dữ liệu học tập
          của học viên. Hệ thống giữ lại các bản ghi này thay vì xóa tự động để tránh mất
          lịch sử học.
        </AdminAlert>
      )}

      {error && (
        <AdminAlert onRetry={status === 'error' ? () => load() : undefined}>
          {error}
        </AdminAlert>
      )}
      {lessonError && (
        <AdminAlert onRetry={() => loadLessonOptions()}>{lessonError}</AdminAlert>
      )}

      {form && (
        <form className="admin-form-section admin-learning-form" onSubmit={submit}>
          <div className="admin-form-section__heading">
            <span>
              <AdminIcon name="edit" size={16} />
            </span>
            <div>
              <h3>{form.id ? 'Chỉnh sửa từ vựng' : 'Tạo từ vựng'}</h3>
              <p>Backend sẽ kiểm tra lại bài học, trạng thái và các trường bắt buộc.</p>
            </div>
          </div>
          <div className="admin-form-grid">
            <label className="admin-form-field">
              <span>Giản thể *</span>
              <input
                required
                value={form.simplified}
                onChange={(e) => setForm({ ...form, simplified: e.target.value })}
              />
            </label>
            <label className="admin-form-field">
              <span>Phồn thể</span>
              <input
                value={form.traditional}
                onChange={(e) => setForm({ ...form, traditional: e.target.value })}
              />
            </label>
            <label className="admin-form-field">
              <span>Pinyin *</span>
              <input
                required
                value={form.pinyin}
                onChange={(e) => setForm({ ...form, pinyin: e.target.value })}
              />
            </label>
            <label className="admin-form-field">
              <span>Nghĩa tiếng Việt *</span>
              <input
                required
                value={form.meaningVietnamese}
                onChange={(e) => setForm({ ...form, meaningVietnamese: e.target.value })}
              />
            </label>
            <label className="admin-form-field">
              <span>Nghĩa tiếng Anh</span>
              <input
                value={form.meaningEnglish}
                onChange={(e) => setForm({ ...form, meaningEnglish: e.target.value })}
              />
            </label>
            <label className="admin-form-field">
              <span>HSK *</span>
              <input
                required
                value={form.hskLevel}
                onChange={(e) => setForm({ ...form, hskLevel: e.target.value })}
              />
            </label>
            <label className="admin-form-field">
              <span>Bài học *</span>
              <select
                required
                value={form.lessonId}
                onChange={(e) => setForm({ ...form, lessonId: e.target.value })}
              >
                <option value="">Chọn bài học</option>
                {lessons.map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-form-field">
              <span>Trạng thái *</span>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="draft">Bản nháp</option>
                <option value="published">Đã xuất bản</option>
              </select>
            </label>
            <label className="admin-form-field admin-learning-field--full">
              <span>Audio URL</span>
              <input
                type="url"
                value={form.audioUrl}
                onChange={(e) => setForm({ ...form, audioUrl: e.target.value })}
              />
            </label>
            <label className="admin-form-field admin-learning-field--full">
              <span>Ví dụ tiếng Trung</span>
              <textarea
                rows="2"
                value={form.exampleChinese}
                onChange={(e) => setForm({ ...form, exampleChinese: e.target.value })}
              />
            </label>
            <label className="admin-form-field admin-learning-field--full">
              <span>Pinyin ví dụ</span>
              <textarea
                rows="2"
                value={form.examplePinyin}
                onChange={(e) => setForm({ ...form, examplePinyin: e.target.value })}
              />
            </label>
            <label className="admin-form-field admin-learning-field--full">
              <span>Nghĩa ví dụ</span>
              <textarea
                rows="2"
                value={form.exampleVietnamese}
                onChange={(e) => setForm({ ...form, exampleVietnamese: e.target.value })}
              />
            </label>
          </div>
          <div className="admin-learning-form__actions">
            <button
              className="admin-button admin-button--secondary"
              onClick={() => setForm(null)}
              type="button"
            >
              Hủy
            </button>
            <button
              className="admin-button admin-button--primary"
              disabled={saving}
              type="submit"
            >
              {saving ? 'Đang lưu…' : 'Lưu từ vựng'}
            </button>
          </div>
        </form>
      )}

      <section className="admin-panel admin-learning-list">
        <div className="admin-learning-toolbar">
          <label>
            <AdminIcon name="search" size={18} />
            <span className="admin-sr-only">Tìm từ vựng</span>
            <input
              type="search"
              value={search}
              onChange={(e) => changeFilter('search', e.target.value)}
              placeholder="Tìm chữ, Pinyin, nghĩa, ví dụ hoặc bài học…"
            />
          </label>
          <select
            aria-label="Lọc theo HSK"
            value={level}
            onChange={(e) => changeFilter('level', e.target.value)}
          >
            <option value="">Tất cả cấp độ</option>
            {levels.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            aria-label="Lọc trạng thái"
            value={statusFilter}
            onChange={(e) => changeFilter('status', e.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="draft">Bản nháp</option>
            <option value="published">Đã xuất bản</option>
          </select>
          <select
            aria-label="Số từ vựng mỗi trang"
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
              <strong>{selectedItems.length} từ đã chọn</strong>
              <span>{selectedDrafts.length} bản nháp có thể xuất bản</span>
            </div>
            <div>
              <button
                className="admin-button admin-button--primary"
                disabled={!selectedDrafts.length || bulkBusy}
                onClick={publishSelected}
                type="button"
              >
                Xuất bản đã chọn ({selectedDrafts.length})
              </button>
              <button
                className="admin-button admin-button--secondary"
                disabled={!selectedPublished.length || bulkBusy}
                onClick={unpublishSelected}
                type="button"
              >
                Gỡ xuất bản đã chọn ({selectedPublished.length})
              </button>
              <button
                className="admin-button admin-button--danger"
                disabled={bulkBusy}
                onClick={() => setConfirmDelete(selectedItems)}
                type="button"
              >
                Xóa đã chọn
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

        {status === 'loading' ? (
          <AdminSkeletonRows count={6} />
        ) : paged.length ? (
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
                    <th>Từ</th>
                    <th>Nghĩa</th>
                    <th>HSK</th>
                    <th>Bài học</th>
                    <th>Trạng thái</th>
                    <th className="admin-table__actions-heading">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((item) => (
                    <tr
                      className={selectedIds.has(item.id) ? 'is-selected' : ''}
                      key={item.id}
                    >
                      <td className="admin-learning-select-cell">
                        <input
                          aria-label={`Chọn ${item.simplified}`}
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelected(item.id)}
                          type="checkbox"
                        />
                      </td>
                      <td>
                        <strong>{item.simplified}</strong>
                        <small>
                          {item.traditional || '—'} · {item.pinyin}
                        </small>
                      </td>
                      <td>{item.meaningVietnamese}</td>
                      <td>{item.hskLevel}</td>
                      <td>{lessonNames.get(item.lessonId) || '—'}</td>
                      <td>
                        <span className={`admin-learning-badge is-${item.status}`}>
                          {item.status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}
                        </span>
                      </td>
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
                          onClick={() => setConfirmDelete([item])}
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
                total: visible.length,
                totalPages,
              }}
            />
          </>
        ) : (
          <AdminEmpty title="Chưa có từ vựng phù hợp">
            Tạo từ mới, import Excel/CSV hoặc thử bộ lọc khác.
          </AdminEmpty>
        )}
      </section>

      <AdminVocabularyImportDialog
        existingItems={items}
        onClose={() => setImportOpen(false)}
        onImported={load}
        onNotify={onNotify}
        onUnauthorized={onUnauthorized}
        open={importOpen}
      />

      <AdminConfirmDialog
        confirmLabel={
          confirmDelete?.length > 1 ? `Xóa ${confirmDelete.length} từ` : 'Xóa từ vựng'
        }
        description={
          confirmDelete?.length > 1
            ? 'Các từ đã xuất bản hoặc đã được học viên lưu có thể bị backend chặn để bảo vệ lịch sử học.'
            : `Bạn sắp xóa “${confirmDelete?.[0]?.simplified || ''}”. Backend vẫn kiểm tra trạng thái và dữ liệu phụ thuộc.`
        }
        loading={bulkBusy}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={confirmDeletion}
        open={Boolean(confirmDelete?.length)}
        title="Xác nhận xóa từ vựng?"
      />

      <AdminConfirmDialog
        confirmLabel={`Xóa ${duplicateReport?.summary?.deletableRecords || 0} bản ghi trùng`}
        description={`Phát hiện ${duplicateReport?.summary?.duplicateGroups || 0} nhóm từ trùng và ${duplicateReport?.summary?.redundantRecords || 0} bản ghi dư. Hệ thống chỉ xóa ${duplicateReport?.summary?.deletableRecords || 0} bản ghi không có dữ liệu học tập. ${duplicateReport?.summary?.protectedRecords || 0} bản ghi có lịch sử học viên sẽ được giữ lại.`}
        loading={duplicateBusy}
        onCancel={() => setConfirmDuplicateCleanup(false)}
        onConfirm={cleanupDuplicates}
        open={confirmDuplicateCleanup}
        title="Xóa các từ vựng trùng?"
      />
    </div>
  );
}
