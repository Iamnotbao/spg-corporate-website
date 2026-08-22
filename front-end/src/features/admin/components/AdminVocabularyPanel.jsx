import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { listAdminLearning } from '../../../services/adminService.js';
import {
  createAdminVocabulary,
  deleteAdminVocabulary,
  listAdminVocabulary,
  updateAdminVocabulary,
} from '../services/adminVocabularyService.js';
import {
  downloadCsv,
  parseCsv,
  vocabularyTemplateCsv,
  vocabularyToCsv,
} from '../utils/vocabularyCsv.js';
import { AdminAlert, AdminEmpty, AdminSkeletonRows } from './AdminFeedback.jsx';
import AdminIcon from './AdminIcon.jsx';
import AdminPageHeader from './AdminPageHeader.jsx';
import AdminPagination from './AdminPagination.jsx';

const PAGE_SIZE = 10;
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
  id: '', simplified: '', traditional: '', pinyin: '', meaningVietnamese: '', meaningEnglish: '', hskLevel: 'HSK 1', lessonId: '', status: 'draft', audioUrl: '', exampleChinese: '', examplePinyin: '', exampleVietnamese: '',
};

function payloadFrom(form) {
  return Object.fromEntries(
    EDITABLE_FIELDS.map((key) => [key, String(form?.[key] || '').trim()]),
  );
}

function importedPayload(row) {
  return payloadFrom({
    simplified: row.simplified,
    traditional: row.traditional,
    pinyin: row.pinyin,
    meaningVietnamese: row.meaningVietnamese,
    meaningEnglish: row.meaningEnglish,
    hskLevel: row.hskLevel || 'HSK 1',
    lessonId: row.lessonId,
    status: row.status || 'draft',
    audioUrl: row.audioUrl,
    exampleChinese: row.exampleChinese,
    examplePinyin: row.examplePinyin,
    exampleVietnamese: row.exampleVietnamese,
  });
}

export default function AdminVocabularyPanel({ onNotify, onUnauthorized }) {
  const [items, setItems] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef(null);

  const load = useCallback(async () => {
    setStatus('loading'); setError('');
    try {
      const [vocabularyResponse, lessonsResponse] = await Promise.all([listAdminVocabulary(), listAdminLearning('lessons')]);
      setItems(vocabularyResponse.data || []); setLessons(lessonsResponse.data || []); setStatus('ready');
    } catch (caught) {
      if (caught.status === 401 && onUnauthorized(caught)) return;
      setError(caught.message || 'Không thể tải từ vựng.'); setStatus('error');
    }
  }, [onUnauthorized]);
  useEffect(() => { load(); }, [load]);

  const levels = useMemo(() => [...new Set(items.map((item) => item.hskLevel).filter(Boolean))].sort(), [items]);
  const visible = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase('vi');
    return items.filter((item) => (!level || item.hskLevel === level) && (!normalized || `${item.simplified} ${item.traditional || ''} ${item.pinyin} ${item.meaningVietnamese}`.toLocaleLowerCase('vi').includes(normalized)));
  }, [items, level, search]);
  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = visible.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const lessonNames = useMemo(() => new Map(lessons.map((lesson) => [lesson.id, lesson.title])), [lessons]);
  const lessonIds = useMemo(() => new Set(lessons.map((lesson) => lesson.id)), [lessons]);

  function changeFilter(kind, value) { if (kind === 'search') setSearch(value); if (kind === 'level') setLevel(value); setPage(1); }
  function beginCreate() { setForm({ ...EMPTY_FORM, lessonId: lessons[0]?.id || '' }); }
  function beginEdit(item) {
    setForm({
      ...EMPTY_FORM,
      ...Object.fromEntries(EDITABLE_FIELDS.map((key) => [key, item?.[key] == null ? '' : String(item[key])])),
      id: item.id,
    });
  }

  async function submit(event) {
    event.preventDefault(); setSaving(true); setError('');
    try {
      if (form.id) await updateAdminVocabulary(form.id, payloadFrom(form)); else await createAdminVocabulary(payloadFrom(form));
      onNotify(form.id ? 'Đã cập nhật từ vựng.' : 'Đã tạo từ vựng.'); setForm(null); await load();
    } catch (caught) { if (caught.status === 401 && onUnauthorized(caught)) return; setError(caught.message || 'Không thể lưu từ vựng.'); }
    finally { setSaving(false); }
  }

  async function remove(item) {
    if (!window.confirm(`Xóa từ “${item.simplified}”?`)) return;
    try { await deleteAdminVocabulary(item.id); onNotify('Đã xóa từ vựng.'); await load(); }
    catch (caught) { if (caught.status === 401 && onUnauthorized(caught)) return; setError(caught.message || 'Không thể xóa từ vựng.'); }
  }

  function exportVocabulary() { downloadCsv('mandora-vocabulary.csv', vocabularyToCsv(items)); onNotify(`Đã export ${items.length} từ vựng.`); }
  function downloadTemplate() { downloadCsv('mandora-vocabulary-template.csv', vocabularyTemplateCsv(lessons[0]?.id || '')); onNotify(lessons.length ? 'Đã tải file mẫu CSV.' : 'Đã tải mẫu CSV. Tạo Lesson rồi điền lessonId trước khi import.'); }

  async function importVocabulary(event) {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    setImporting(true); setError('');
    try {
      const rows = parseCsv(await file.text());
      if (!rows.length) throw new Error('CSV không có dữ liệu để import.');
      if (rows.length > 500) throw new Error('Mỗi lần chỉ import tối đa 500 từ.');
      const invalidLessons = rows.filter((row) => !lessonIds.has(String(row.lessonId || '').trim()));
      if (invalidLessons.length) throw new Error(`lessonId không hợp lệ ở dòng ${invalidLessons.slice(0, 5).map((row) => row.__row).join(', ')}. Hãy tải file mẫu để lấy lessonId đúng.`);
      let created = 0; const failures = [];
      for (const row of rows) {
        try { await createAdminVocabulary(importedPayload(row)); created += 1; }
        catch (caught) { if (caught.status === 401 && onUnauthorized(caught)) return; failures.push(`dòng ${row.__row}: ${caught.message || 'không thể tạo'}`); }
      }
      await load();
      if (failures.length) { setError(`Đã import ${created}/${rows.length}. Lỗi: ${failures.slice(0, 5).join(' · ')}`); onNotify(`Import được ${created}/${rows.length} từ.`, 'error'); }
      else onNotify(`Đã import ${created} từ vựng từ CSV.`);
    } catch (caught) { setError(caught.message || 'Không thể import CSV.'); }
    finally { setImporting(false); }
  }

  return (
    <div className="admin-learning-page">
      <AdminPageHeader
        action={<div className="admin-vocabulary-actions">
          <button className="admin-button admin-button--secondary" onClick={downloadTemplate} type="button">Mẫu CSV</button>
          <button className="admin-button admin-button--secondary" disabled={!items.length} onClick={exportVocabulary} type="button">Export CSV</button>
          <button className="admin-button admin-button--secondary" disabled={!lessons.length || importing} onClick={() => importInputRef.current?.click()} type="button">{importing ? 'Đang import…' : 'Import CSV'}</button>
          <input ref={importInputRef} accept=".csv,text/csv" hidden onChange={importVocabulary} type="file" />
          <button className="admin-button admin-button--primary" disabled={!lessons.length} onClick={beginCreate} type="button"><AdminIcon name="plus" size={17} /> Tạo từ vựng</button>
        </div>}
        description="Quản lý từ vựng gắn với bài học, HSK và trạng thái xuất bản. Có thể tạo tay hoặc nhập/xuất hàng loạt bằng CSV."
        eyebrow="Learning content" title="Từ vựng"
      />
      {!lessons.length && status === 'ready' && (
        <AdminAlert>
          Chưa có Lesson nên Mandora chưa thể gắn từ vựng vào lộ trình học. Hãy tạo Course → Unit →{' '}
          <Link className="admin-inline-link" to="/admin/lessons">Lesson trước</Link>; sau đó nút Tạo từ vựng và Import CSV sẽ tự bật.
        </AdminAlert>
      )}
      {error && <AdminAlert onRetry={status === 'error' ? load : undefined}>{error}</AdminAlert>}

      {form && <form className="admin-form-section admin-learning-form" onSubmit={submit}>
        <div className="admin-form-section__heading"><span><AdminIcon name="edit" size={16} /></span><div><h3>{form.id ? 'Chỉnh sửa từ vựng' : 'Tạo từ vựng'}</h3><p>Backend sẽ kiểm tra lại bài học, trạng thái và các trường bắt buộc.</p></div></div>
        <div className="admin-form-grid">
          <label className="admin-form-field"><span>Giản thể *</span><input required value={form.simplified} onChange={(e) => setForm({ ...form, simplified: e.target.value })} /></label>
          <label className="admin-form-field"><span>Phồn thể</span><input value={form.traditional} onChange={(e) => setForm({ ...form, traditional: e.target.value })} /></label>
          <label className="admin-form-field"><span>Pinyin *</span><input required value={form.pinyin} onChange={(e) => setForm({ ...form, pinyin: e.target.value })} /></label>
          <label className="admin-form-field"><span>Nghĩa tiếng Việt *</span><input required value={form.meaningVietnamese} onChange={(e) => setForm({ ...form, meaningVietnamese: e.target.value })} /></label>
          <label className="admin-form-field"><span>Nghĩa tiếng Anh</span><input value={form.meaningEnglish} onChange={(e) => setForm({ ...form, meaningEnglish: e.target.value })} /></label>
          <label className="admin-form-field"><span>HSK *</span><input required value={form.hskLevel} onChange={(e) => setForm({ ...form, hskLevel: e.target.value })} /></label>
          <label className="admin-form-field"><span>Bài học *</span><select required value={form.lessonId} onChange={(e) => setForm({ ...form, lessonId: e.target.value })}><option value="">Chọn bài học</option>{lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}</select></label>
          <label className="admin-form-field"><span>Trạng thái *</span><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="draft">Bản nháp</option><option value="published">Đã xuất bản</option></select></label>
          <label className="admin-form-field admin-learning-field--full"><span>Audio URL</span><input type="url" value={form.audioUrl} onChange={(e) => setForm({ ...form, audioUrl: e.target.value })} /></label>
          <label className="admin-form-field admin-learning-field--full"><span>Ví dụ tiếng Trung</span><textarea rows="2" value={form.exampleChinese} onChange={(e) => setForm({ ...form, exampleChinese: e.target.value })} /></label>
          <label className="admin-form-field admin-learning-field--full"><span>Pinyin ví dụ</span><textarea rows="2" value={form.examplePinyin} onChange={(e) => setForm({ ...form, examplePinyin: e.target.value })} /></label>
          <label className="admin-form-field admin-learning-field--full"><span>Nghĩa ví dụ</span><textarea rows="2" value={form.exampleVietnamese} onChange={(e) => setForm({ ...form, exampleVietnamese: e.target.value })} /></label>
        </div>
        <div className="admin-learning-form__actions"><button className="admin-button admin-button--secondary" onClick={() => setForm(null)} type="button">Hủy</button><button className="admin-button admin-button--primary" disabled={saving} type="submit">{saving ? 'Đang lưu…' : 'Lưu từ vựng'}</button></div>
      </form>}

      <section className="admin-panel admin-learning-list">
        <div className="admin-learning-toolbar"><label><AdminIcon name="search" size={18} /><span className="admin-sr-only">Tìm từ vựng</span><input type="search" value={search} onChange={(e) => changeFilter('search', e.target.value)} placeholder="Tìm chữ, Pinyin hoặc nghĩa…" /></label><select aria-label="Lọc theo HSK" value={level} onChange={(e) => changeFilter('level', e.target.value)}><option value="">Tất cả cấp độ</option>{levels.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
        {status === 'loading' ? <AdminSkeletonRows count={6} /> : paged.length ? <><div className="admin-table-wrap"><table className="admin-table admin-learning-table"><thead><tr><th>Từ</th><th>Nghĩa</th><th>HSK</th><th>Bài học</th><th>Trạng thái</th><th className="admin-table__actions-heading">Thao tác</th></tr></thead><tbody>{paged.map((item) => <tr key={item.id}><td><strong>{item.simplified}</strong><small>{item.traditional || '—'} · {item.pinyin}</small></td><td>{item.meaningVietnamese}</td><td>{item.hskLevel}</td><td>{lessonNames.get(item.lessonId) || '—'}</td><td><span className={`admin-learning-badge is-${item.status}`}>{item.status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}</span></td><td className="admin-learning-actions"><button className="admin-button admin-button--secondary" onClick={() => beginEdit(item)} type="button">Sửa</button><button className="admin-button admin-button--danger" onClick={() => remove(item)} type="button">Xóa</button></td></tr>)}</tbody></table></div><AdminPagination onPageChange={setPage} pagination={{ page: safePage, pageSize: PAGE_SIZE, total: visible.length, totalPages }} /></> : <AdminEmpty title="Chưa có từ vựng phù hợp">Tạo từ mới, import CSV hoặc thử bộ lọc khác.</AdminEmpty>}
      </section>
    </div>
  );
}
