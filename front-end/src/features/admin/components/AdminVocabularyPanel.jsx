import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { ADMIN_DEFAULT_PAGE_SIZE } from '../constants.js';
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
import AdminCopyButton from './AdminCopyButton.jsx';
import AdminFilterToolbar from './AdminFilterToolbar.jsx';
import AdminIcon from './AdminIcon.jsx';
import AdminPageHeader from './AdminPageHeader.jsx';
import AdminPagination from './AdminPagination.jsx';
import AdminVocabularyImportDialog from './AdminVocabularyImportDialog.jsx';

const PAGE_SIZE = ADMIN_DEFAULT_PAGE_SIZE;
const HSK_LEVELS = ['HSK 1', 'HSK 2', 'HSK 3', 'HSK 4', 'HSK 5', 'HSK 6', 'Ngoài HSK'];
const EDITABLE_FIELDS = [
  'simplified', 'traditional', 'pinyin', 'meaningVietnamese', 'meaningEnglish',
  'hskLevel', 'status', 'audioUrl', 'exampleChinese', 'examplePinyin', 'exampleVietnamese',
];

const EMPTY_FORM = {
  id: '', simplified: '', traditional: '', pinyin: '', meaningVietnamese: '',
  meaningEnglish: '', hskLevel: 'HSK 1', status: 'draft', audioUrl: '',
  exampleChinese: '', examplePinyin: '', exampleVietnamese: '',
};

function payloadFrom(form) {
  return Object.fromEntries(
    EDITABLE_FIELDS.map((key) => [key, String(form?.[key] || '').trim()]),
  );
}

export default function AdminVocabularyPanel({ onNotify, onUnauthorized }) {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 350);
  const [level, setLevel] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [pagination, setPagination] = useState({ page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 1 });
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [duplicateReport, setDuplicateReport] = useState(null);
  const [duplicateBusy, setDuplicateBusy] = useState(false);
  const [confirmDuplicateCleanup, setConfirmDuplicateCleanup] = useState(false);

  const load = useCallback(async (signal) => {
    setStatus('loading');
    setError('');
    try {
      const response = await listAdminVocabulary({
        page, pageSize, search: debouncedSearch, hskLevel: level,
        status: statusFilter, from: dateRange.from, to: dateRange.to, signal,
      });
      if (signal?.aborted) return;
      setItems(response.data || []);
      setPagination(response.pagination || { page, pageSize, total: 0, totalPages: 1 });
      setStatus('ready');
    } catch (caught) {
      if (caught?.name === 'AbortError') return;
      if (caught.status === 401 && onUnauthorized(caught)) return;
      setError(caught.message || 'Không thể tải từ vựng.');
      setStatus('error');
    }
  }, [dateRange.from, dateRange.to, debouncedSearch, level, onUnauthorized, page, pageSize, statusFilter]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const selectedItems = useMemo(() => items.filter((item) => selectedIds.has(item.id)), [items, selectedIds]);
  const selectedDrafts = selectedItems.filter((item) => item.status !== 'published');
  const selectedPublished = selectedItems.filter((item) => item.status === 'published');
  const allPageSelected = items.length > 0 && items.every((item) => selectedIds.has(item.id));

  function beginCreate() {
    setForm({ ...EMPTY_FORM });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function beginEdit(item) {
    setForm({
      ...EMPTY_FORM,
      ...Object.fromEntries(EDITABLE_FIELDS.map((key) => [key, item?.[key] == null ? '' : String(item[key])])),
      id: item.id,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function changeFilter(kind, value) {
    if (kind === 'search') setSearch(value);
    if (kind === 'level') setLevel(value);
    if (kind === 'status') setStatusFilter(value);
    setPage(1);
  }

  function toggleSelected(id) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
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
    try {
      if (form.id) await updateAdminVocabulary(form.id, payloadFrom(form));
      else await createAdminVocabulary(payloadFrom(form));
      onNotify(form.id ? 'Đã cập nhật từ vựng.' : 'Đã tạo từ vựng trong kho.');
      setForm(null);
      await load();
    } catch (caught) {
      if (!(caught.status === 401 && onUnauthorized(caught))) {
        onNotify(caught.message || 'Không thể lưu từ vựng.', 'error');
      }
    } finally { setSaving(false); }
  }

  async function setSelectedStatus(targets, nextStatus) {
    if (!targets.length || bulkBusy) return;
    setBulkBusy(true);
    const failures = [];
    let success = 0;
    for (const item of targets) {
      try { await updateAdminVocabulary(item.id, { status: nextStatus }); success += 1; }
      catch (caught) {
        if (caught.status === 401 && onUnauthorized(caught)) { setBulkBusy(false); return; }
        failures.push({ item, message: caught.message });
      }
    }
    await load();
    setSelectedIds(new Set(failures.map(({ item }) => item.id)));
    setBulkBusy(false);
    if (success) onNotify(`${nextStatus === 'published' ? 'Đã xuất bản' : 'Đã gỡ xuất bản'} ${success} từ vựng.`);
    if (failures.length) onNotify(`${failures.length} từ chưa thể xử lý. ${failures[0].message}`, 'error');
  }

  async function confirmDeletion() {
    if (!confirmDelete?.length || bulkBusy) return;
    setBulkBusy(true);
    const failures = [];
    let success = 0;
    for (const item of confirmDelete) {
      try { await deleteAdminVocabulary(item.id); success += 1; }
      catch (caught) {
        if (caught.status === 401 && onUnauthorized(caught)) { setBulkBusy(false); setConfirmDelete(null); return; }
        failures.push({ item, message: caught.message });
      }
    }
    await load();
    setConfirmDelete(null);
    setSelectedIds(new Set(failures.map(({ item }) => item.id)));
    setBulkBusy(false);
    if (success) onNotify(`Đã xóa ${success} từ vựng.`);
    if (failures.length) onNotify(`${failures.length} từ chưa thể xóa. ${failures[0].message}`, 'error');
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
      const actionable = (report.summary.deletableRecords || 0) + (report.summary.mergeableRecords || 0);
      if (!actionable) {
        onNotify(`Phát hiện ${report.summary.duplicateGroups} nhóm trùng nhưng cần kiểm tra thủ công.`, 'error');
        return;
      }
      setConfirmDuplicateCleanup(true);
    } catch (caught) {
      if (!(caught.status === 401 && onUnauthorized(caught))) onNotify(caught.message || 'Không thể kiểm tra từ trùng.', 'error');
    } finally { setDuplicateBusy(false); }
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
      onNotify(`Đã xử lý từ trùng: gộp ${result?.merged || 0}, xóa ${result?.deleted || 0}.`);
    } catch (caught) {
      if (!(caught.status === 401 && onUnauthorized(caught))) onNotify(caught.message || 'Không thể xử lý từ trùng.', 'error');
    } finally { setDuplicateBusy(false); }
  }

  function exportVocabulary() {
    downloadCsv('hanyora-vocabulary.csv', vocabularyToCsv(items));
    onNotify(`Đã export ${items.length} từ vựng trên trang hiện tại.`);
  }

  function downloadTemplate() {
    downloadCsv('hanyora-vocabulary-template.csv', vocabularyTemplateCsv());
    onNotify('Đã tải mẫu CSV. Từ sẽ được nhập vào kho trước, không cần lessonId.');
  }

  const duplicateActionableRecords = (duplicateReport?.summary?.deletableRecords || 0) + (duplicateReport?.summary?.mergeableRecords || 0);

  return (
    <div className="admin-learning-page">
      <AdminPageHeader
        action={
          <div className="admin-vocabulary-actions">
            <button className="admin-button admin-button--secondary" onClick={downloadTemplate} type="button">Mẫu CSV</button>
            <button className="admin-button admin-button--secondary" disabled={!items.length} onClick={exportVocabulary} type="button">Export CSV</button>
            <button className="admin-button admin-button--secondary" disabled={!items.length || duplicateBusy} onClick={inspectDuplicates} type="button"><AdminIcon name="search" size={16} /> {duplicateBusy ? 'Đang kiểm tra…' : 'Tìm từ trùng'}</button>
            <button className="admin-button admin-button--secondary" onClick={() => setImportOpen(true)} type="button"><AdminIcon name="upload" size={16} /> Import</button>
            <button className="admin-button admin-button--primary" onClick={beginCreate} type="button"><AdminIcon name="plus" size={17} /> Tạo từ vựng</button>
          </div>
        }
        description="Kho từ dùng chung. Tạo/import từ trước, sau đó qua Bài học → Chọn từ để gắn đúng từ vào từng lesson."
        eyebrow="Learning content"
        title="Từ vựng"
      />

      <AdminAlert>
        Từ vựng không còn bắt buộc thuộc một Lesson khi tạo. Một từ có thể được tái sử dụng ở nhiều bài học khác nhau.
      </AdminAlert>

      {error && <AdminAlert onRetry={status === 'error' ? () => load() : undefined}>{error}</AdminAlert>}

      {form && (
        <section className="admin-learning-editor-shell">
          <button className="admin-button admin-button--secondary admin-learning-editor-back" onClick={() => setForm(null)} type="button">← Về danh sách từ</button>
          <form className="admin-form-section admin-learning-form" onSubmit={submit}>
            <div className="admin-form-section__heading">
              <span><AdminIcon name="edit" size={16} /></span>
              <div><h3>{form.id ? 'Chỉnh sửa từ vựng' : 'Tạo từ vựng'}</h3><p>Lưu vào kho từ trước; việc gắn Lesson được thực hiện tại trang Bài học.</p></div>
            </div>
            <div className="admin-form-grid">
              <label className="admin-form-field"><span>Giản thể *</span><input required value={form.simplified} onChange={(e) => setForm({ ...form, simplified: e.target.value })} /></label>
              <label className="admin-form-field"><span>Phồn thể</span><input value={form.traditional} onChange={(e) => setForm({ ...form, traditional: e.target.value })} /></label>
              <label className="admin-form-field"><span>Pinyin *</span><input required value={form.pinyin} onChange={(e) => setForm({ ...form, pinyin: e.target.value })} /></label>
              <label className="admin-form-field"><span>Nghĩa tiếng Việt *</span><input required value={form.meaningVietnamese} onChange={(e) => setForm({ ...form, meaningVietnamese: e.target.value })} /></label>
              <label className="admin-form-field"><span>Nghĩa tiếng Anh</span><input value={form.meaningEnglish} onChange={(e) => setForm({ ...form, meaningEnglish: e.target.value })} /></label>
              <label className="admin-form-field"><span>HSK *</span><select value={form.hskLevel} onChange={(e) => setForm({ ...form, hskLevel: e.target.value })}>{HSK_LEVELS.map((value) => <option key={value}>{value}</option>)}</select></label>
              <label className="admin-form-field"><span>Trạng thái *</span><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="draft">Bản nháp</option><option value="published">Đã xuất bản</option></select></label>
              <label className="admin-form-field admin-learning-field--full"><span>Audio URL</span><input type="url" value={form.audioUrl} onChange={(e) => setForm({ ...form, audioUrl: e.target.value })} /></label>
              <label className="admin-form-field admin-learning-field--full"><span>Ví dụ tiếng Trung</span><textarea rows="2" value={form.exampleChinese} onChange={(e) => setForm({ ...form, exampleChinese: e.target.value })} /></label>
              <label className="admin-form-field admin-learning-field--full"><span>Pinyin ví dụ</span><textarea rows="2" value={form.examplePinyin} onChange={(e) => setForm({ ...form, examplePinyin: e.target.value })} /></label>
              <label className="admin-form-field admin-learning-field--full"><span>Nghĩa ví dụ</span><textarea rows="2" value={form.exampleVietnamese} onChange={(e) => setForm({ ...form, exampleVietnamese: e.target.value })} /></label>
            </div>
            <div className="admin-learning-form__actions">
              <button className="admin-button admin-button--secondary" onClick={() => setForm(null)} type="button">Hủy</button>
              <button className="admin-button admin-button--primary" disabled={saving} type="submit">{saving ? 'Đang lưu…' : 'Lưu vào kho từ'}</button>
            </div>
          </form>
        </section>
      )}

      <section className="admin-panel admin-learning-list">
        <AdminFilterToolbar
          search={search}
          onSearchChange={(value) => changeFilter('search', value)}
          searchPlaceholder="Tìm chữ, Pinyin, nghĩa hoặc ví dụ…"
          filters={[
            { key: 'level', label: 'Cấp HSK', value: level, onChange: (value) => changeFilter('level', value), options: [{ value: '', label: 'Tất cả cấp độ' }, ...HSK_LEVELS.map((value) => ({ value, label: value }))] },
            { key: 'status', label: 'Trạng thái', value: statusFilter, onChange: (value) => changeFilter('status', value), options: [{ value: '', label: 'Tất cả trạng thái' }, { value: 'draft', label: 'Bản nháp' }, { value: 'published', label: 'Đã xuất bản' }] },
          ]}
          from={dateRange.from}
          to={dateRange.to}
          onFromChange={(from) => { setDateRange((current) => ({ ...current, from })); setPage(1); }}
          onToChange={(to) => { setDateRange((current) => ({ ...current, to })); setPage(1); }}
          pageSize={pageSize}
          onPageSizeChange={(value) => { setPageSize(value); setPage(1); }}
        />

        {selectedItems.length > 0 && (
          <div className="admin-learning-selection-bar">
            <div><strong>{selectedItems.length} từ đã chọn</strong><span>{selectedDrafts.length} bản nháp có thể xuất bản</span></div>
            <div>
              <button className="admin-button admin-button--primary" disabled={!selectedDrafts.length || bulkBusy} onClick={() => setSelectedStatus(selectedDrafts, 'published')} type="button">Xuất bản ({selectedDrafts.length})</button>
              <button className="admin-button admin-button--secondary" disabled={!selectedPublished.length || bulkBusy} onClick={() => setSelectedStatus(selectedPublished, 'draft')} type="button">Gỡ xuất bản ({selectedPublished.length})</button>
              <button className="admin-button admin-button--danger" disabled={bulkBusy} onClick={() => setConfirmDelete(selectedItems)} type="button">Xóa đã chọn</button>
              <button className="admin-button admin-button--secondary" onClick={() => setSelectedIds(new Set())} type="button">Bỏ chọn</button>
            </div>
          </div>
        )}

        {status === 'loading' ? <AdminSkeletonRows count={6} /> : items.length ? (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table admin-learning-table">
                <thead><tr><th className="admin-learning-select-cell"><input aria-label="Chọn trang hiện tại" checked={allPageSelected} onChange={toggleCurrentPage} type="checkbox" /></th><th>Từ</th><th>Nghĩa</th><th>HSK</th><th>Trạng thái</th><th className="admin-table__actions-heading">Thao tác</th></tr></thead>
                <tbody>
                  {items.map((item) => (
                    <tr className={selectedIds.has(item.id) ? 'is-selected' : ''} key={item.id}>
                      <td className="admin-learning-select-cell"><input aria-label={`Chọn ${item.simplified}`} checked={selectedIds.has(item.id)} onChange={() => toggleSelected(item.id)} type="checkbox" /></td>
                      <td><strong lang="zh-Hans">{item.simplified}</strong><small>{item.traditional || '—'} · {item.pinyin}</small></td>
                      <td>{item.meaningVietnamese}</td>
                      <td>{item.hskLevel}</td>
                      <td><span className={`admin-learning-badge is-${item.status}`}>{item.status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}</span></td>
                      <td className="admin-learning-actions">
                        <AdminCopyButton label="ID" onNotify={onNotify} value={item.id} />
                        <button className="admin-button admin-button--secondary" onClick={() => beginEdit(item)} type="button">Sửa</button>
                        <button className="admin-button admin-button--danger" onClick={() => setConfirmDelete([item])} type="button">Xóa</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <AdminPagination onPageChange={setPage} pagination={pagination} />
          </>
        ) : <AdminEmpty title="Chưa có từ vựng phù hợp">Tạo từ mới, import Excel/CSV hoặc thử bộ lọc khác.</AdminEmpty>}
      </section>

      <AdminVocabularyImportDialog existingItems={items} onClose={() => setImportOpen(false)} onImported={load} onNotify={onNotify} onUnauthorized={onUnauthorized} open={importOpen} />

      <AdminConfirmDialog
        confirmLabel={confirmDelete?.length > 1 ? `Xóa ${confirmDelete.length} từ` : 'Xóa từ vựng'}
        description={confirmDelete?.length > 1 ? 'Các từ đã xuất bản hoặc đã được học viên lưu có thể bị backend chặn.' : `Bạn sắp xóa “${confirmDelete?.[0]?.simplified || ''}”. Các liên kết Lesson mới cũng sẽ được dọn nếu xóa hợp lệ.`}
        loading={bulkBusy}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={confirmDeletion}
        open={Boolean(confirmDelete?.length)}
        title="Xác nhận xóa từ vựng?"
      />

      <AdminConfirmDialog
        confirmLabel={`Gộp & xóa ${duplicateActionableRecords} bản trùng`}
        description={`Phát hiện ${duplicateReport?.summary?.duplicateGroups || 0} nhóm từ trùng. Hệ thống sẽ giữ lại các bản cần kiểm tra thủ công.`}
        loading={duplicateBusy}
        onCancel={() => setConfirmDuplicateCleanup(false)}
        onConfirm={cleanupDuplicates}
        open={confirmDuplicateCleanup}
        title="Gộp & xóa từ vựng trùng?"
      />
    </div>
  );
}
