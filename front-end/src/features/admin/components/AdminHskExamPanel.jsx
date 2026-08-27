import { useCallback, useEffect, useState } from 'react';
import { ADMIN_DEFAULT_PAGE_SIZE } from '../constants.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import {
  createAdminHskExam,
  createAdminHskQuestion,
  createAdminHskSection,
  deleteAdminHskExam,
  deleteAdminHskQuestion,
  deleteAdminHskSection,
  getAdminHskExam,
  listAdminHskExams,
  updateAdminHskExam,
  updateAdminHskQuestion,
  updateAdminHskSection,
} from '../services/adminHskExamService.js';
import { AdminAlert, AdminEmpty, AdminSkeletonRows } from './AdminFeedback.jsx';
import AdminFilterToolbar from './AdminFilterToolbar.jsx';
import AdminIcon from './AdminIcon.jsx';
import AdminPageHeader from './AdminPageHeader.jsx';
import AdminPagination from './AdminPagination.jsx';
import AdminQuestionEditor from './AdminQuestionEditor.jsx';

const EMPTY_EXAM = { title: '', description: '', level: '1', durationMinutes: '35', passingScore: '60', status: 'draft', featured: false };
const EMPTY_SECTION = { title: '', type: 'listening', description: '', order: '0' };

export default function AdminHskExamPanel({ onNotify, onUnauthorized }) {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: ADMIN_DEFAULT_PAGE_SIZE, total: 0, totalPages: 1 });
  const [filters, setFilters] = useState({ search: '', status: '', level: '', from: '', to: '' });
  const debouncedSearch = useDebouncedValue(filters.search, 350);
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');
  const [examForm, setExamForm] = useState(null);
  const [selected, setSelected] = useState(null);
  const [sectionForm, setSectionForm] = useState(null);
  const [questionForm, setQuestionForm] = useState(null);
  const [questionSectionId, setQuestionSectionId] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (signal) => {
    setState('loading');
    setError('');
    try {
      const response = await listAdminHskExams({ ...filters, search: debouncedSearch, page: pagination.page, pageSize: pagination.pageSize, signal });
      if (signal?.aborted) return;
      setItems(response.data || []);
      setPagination((current) => ({ ...current, ...response.pagination }));
      setState('ready');
    } catch (caught) {
      if (caught.name === 'AbortError') return;
      if (caught.status === 401 && onUnauthorized(caught)) return;
      setError(caught.message);
      setState('error');
    }
  }, [debouncedSearch, filters.from, filters.level, filters.status, onUnauthorized, pagination.page, pagination.pageSize]);

  useEffect(() => { const controller = new AbortController(); load(controller.signal); return () => controller.abort(); }, [load]);

  function changeFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPagination((current) => ({ ...current, page: 1 }));
  }

  async function openExam(id) {
    try {
      const response = await getAdminHskExam(id);
      setSelected(response.data);
      setExamForm(null);
    } catch (caught) { onNotify(caught.message, 'error'); }
  }

  async function saveExam(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = { ...examForm, level: Number(examForm.level), durationMinutes: Number(examForm.durationMinutes), passingScore: Number(examForm.passingScore) };
      if (examForm.id) await updateAdminHskExam(examForm.id, payload);
      else await createAdminHskExam(payload);
      onNotify(examForm.id ? 'Đã cập nhật đề thi thử HSK.' : 'Đã tạo đề thi thử HSK.');
      setExamForm(null);
      await load();
    } catch (caught) { onNotify(caught.message, 'error'); } finally { setSaving(false); }
  }

  async function saveSection(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = { ...sectionForm, order: Number(sectionForm.order) };
      if (sectionForm.id) await updateAdminHskSection(sectionForm.id, payload);
      else await createAdminHskSection(selected.id, payload);
      await openExam(selected.id);
      setSectionForm(null);
      onNotify('Đã lưu phần thi.');
    } catch (caught) { onNotify(caught.message, 'error'); } finally { setSaving(false); }
  }

  async function saveQuestion(payload) {
    setSaving(true);
    try {
      if (questionForm?.id) await updateAdminHskQuestion(questionForm.id, payload);
      else await createAdminHskQuestion(questionSectionId, payload);
      await openExam(selected.id);
      setQuestionForm(null);
      setQuestionSectionId('');
      onNotify('Đã lưu câu hỏi thi thử.');
    } catch (caught) { onNotify(caught.message, 'error'); } finally { setSaving(false); }
  }

  if (selected) {
    return (
      <div className="admin-learning-page">
        <AdminPageHeader eyebrow={`HSK ${selected.level}`} title={selected.title} description="Cấu trúc đề thi độc lập với Quiz bài học; đáp án chỉ xuất hiện sau khi backend chấm." action={<button className="admin-button admin-button--secondary" onClick={() => setSelected(null)} type="button">Quay lại danh sách</button>} />
        <section className="admin-panel">
          <div className="admin-learning-selection-bar">
            <div><strong>{selected.sections.length} phần thi</strong><span>{selected.status === 'published' ? 'Đang xuất bản' : selected.status === 'archived' ? 'Đã lưu trữ' : 'Bản nháp'}</span></div>
            <div>
              <button className="admin-button admin-button--secondary" onClick={() => setExamForm({ ...selected, level: String(selected.level), durationMinutes: String(selected.durationMinutes), passingScore: String(selected.passingScore) })} type="button">Sửa thông tin</button>
              {selected.status !== 'published' && <button className="admin-button admin-button--primary" onClick={async () => { try { await updateAdminHskExam(selected.id, { status: 'published' }); await openExam(selected.id); onNotify('Đã xuất bản đề thi.'); } catch (caught) { onNotify(caught.message, 'error'); } }} type="button">Xuất bản</button>}
              {selected.status === 'published' && <button className="admin-button admin-button--secondary" onClick={async () => { await updateAdminHskExam(selected.id, { status: 'archived' }); await openExam(selected.id); }} type="button">Lưu trữ</button>}
            </div>
          </div>
          {examForm && <ExamForm form={examForm} setForm={setExamForm} onSubmit={saveExam} saving={saving} />}
          <button className="admin-button admin-button--primary" disabled={selected.status === 'published'} onClick={() => setSectionForm({ ...EMPTY_SECTION })} type="button"><AdminIcon name="plus" size={16} /> Thêm phần thi</button>
          {sectionForm && <SectionForm form={sectionForm} setForm={setSectionForm} onSubmit={saveSection} saving={saving} />}
          <div className="admin-hsk-section-list">
            {selected.sections.map((section) => (
              <article className="admin-form-section" key={section.id}>
                <div className="admin-form-section__heading"><span>{section.order + 1}</span><div><h3>{section.title}</h3><p>{section.type} · {section.questions.length} câu</p></div></div>
                <div className="admin-learning-form__actions">
                  <button className="admin-button admin-button--secondary" disabled={selected.status === 'published'} onClick={() => setSectionForm({ ...section, order: String(section.order) })} type="button">Sửa phần</button>
                  <button className="admin-button admin-button--secondary" disabled={selected.status === 'published'} onClick={() => { setQuestionSectionId(section.id); setQuestionForm({}); }} type="button">Thêm câu hỏi</button>
                  <button className="admin-button admin-button--danger" disabled={selected.status === 'published'} onClick={async () => { if (!window.confirm(`Xóa phần “${section.title}”?`)) return; try { await deleteAdminHskSection(section.id); await openExam(selected.id); } catch (caught) { onNotify(caught.message, 'error'); } }} type="button">Xóa</button>
                </div>
                {section.questions.map((question) => (
                  <div className="admin-hsk-question-row" key={question.id}><span><strong>{question.order + 1}. {question.question}</strong><small>{question.type} · {question.points} điểm</small></span><span><button className="admin-icon-button" aria-label="Sửa câu hỏi" disabled={selected.status === 'published'} onClick={() => { setQuestionSectionId(section.id); setQuestionForm(question); }} type="button"><AdminIcon name="edit" size={15} /></button><button className="admin-icon-button admin-icon-button--danger" aria-label="Xóa câu hỏi" disabled={selected.status === 'published'} onClick={async () => { if (!window.confirm('Xóa câu hỏi này?')) return; await deleteAdminHskQuestion(question.id); await openExam(selected.id); }} type="button"><AdminIcon name="trash" size={15} /></button></span></div>
                ))}
              </article>
            ))}
          </div>
          {questionForm && <AdminQuestionEditor allowMedia onCancel={() => setQuestionForm(null)} onSave={saveQuestion} question={questionForm.id ? questionForm : null} saving={saving} />}
        </section>
      </div>
    );
  }

  return (
    <div className="admin-learning-page">
      <AdminPageHeader eyebrow="Assessment" title="Thi thử HSK" description="Quản lý đề thi thử HSK 1–6, thời lượng, phần thi và câu hỏi nghe/đọc." action={<button className="admin-button admin-button--primary" onClick={() => setExamForm({ ...EMPTY_EXAM })} type="button"><AdminIcon name="plus" size={16} /> Tạo đề</button>} />
      {examForm && <ExamForm form={examForm} setForm={setExamForm} onSubmit={saveExam} saving={saving} />}
      <section className="admin-panel">
        <AdminFilterToolbar search={filters.search} onSearchChange={(value) => changeFilter('search', value)} filters={[{ key: 'status', label: 'Trạng thái', value: filters.status, onChange: (value) => changeFilter('status', value), options: [{ value: '', label: 'Tất cả trạng thái' }, { value: 'draft', label: 'Bản nháp' }, { value: 'published', label: 'Đã xuất bản' }, { value: 'archived', label: 'Đã lưu trữ' }] }, { key: 'level', label: 'Cấp HSK', value: filters.level, onChange: (value) => changeFilter('level', value), options: [{ value: '', label: 'Tất cả HSK' }, ...[1,2,3,4,5,6].map((level) => ({ value: String(level), label: `HSK ${level}` }))] }]} from={filters.from} to={filters.to} onFromChange={(value) => changeFilter('from', value)} onToChange={(value) => changeFilter('to', value)} pageSize={pagination.pageSize} onPageSizeChange={(value) => setPagination((current) => ({ ...current, page: 1, pageSize: value }))} />
        {error && <AdminAlert onRetry={() => load()}>{error}</AdminAlert>}
        {state === 'loading' ? <AdminSkeletonRows count={4} /> : items.length ? <><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Đề thi</th><th>Thời lượng</th><th>Điểm đạt</th><th>Trạng thái</th><th><span className="admin-sr-only">Thao tác</span></th></tr></thead><tbody>{items.map((exam) => <tr key={exam.id}><td><strong>{exam.title}</strong><small>HSK {exam.level}</small></td><td>{exam.durationMinutes} phút</td><td>{exam.passingScore}%</td><td><span className={`admin-learning-badge is-${exam.status}`}>{exam.status}</span></td><td className="admin-learning-actions"><button className="admin-icon-button" aria-label={`Mở ${exam.title}`} onClick={() => openExam(exam.id)} type="button"><AdminIcon name="edit" size={16} /></button>{exam.status === 'draft' && <button className="admin-icon-button admin-icon-button--danger" aria-label={`Xóa ${exam.title}`} onClick={async () => { if (!window.confirm(`Xóa “${exam.title}”?`)) return; try { await deleteAdminHskExam(exam.id); await load(); } catch (caught) { onNotify(caught.message, 'error'); } }} type="button"><AdminIcon name="trash" size={16} /></button>}</td></tr>)}</tbody></table></div><AdminPagination pagination={pagination} onPageChange={(page) => setPagination((current) => ({ ...current, page }))} /></> : <AdminEmpty title="Chưa có đề thi thử">Tạo đề HSK nháp, thêm phần và câu hỏi trước khi xuất bản.</AdminEmpty>}
      </section>
    </div>
  );
}

function ExamForm({ form, setForm, onSubmit, saving }) {
  return <form className="admin-form-section admin-learning-form" onSubmit={onSubmit}><div className="admin-form-grid"><Field label="Tiêu đề" name="title" form={form} setForm={setForm} required /><Field label="Cấp HSK" name="level" form={form} setForm={setForm} type="number" min="1" max="6" required /><Field label="Thời lượng (phút)" name="durationMinutes" form={form} setForm={setForm} type="number" min="1" required /><Field label="Điểm đạt (%)" name="passingScore" form={form} setForm={setForm} type="number" min="1" max="100" required /><label className="admin-form-field"><span>Trạng thái</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="draft">Bản nháp</option><option value="published">Đã xuất bản</option><option value="archived">Lưu trữ</option></select></label><label className="admin-form-field admin-learning-field--full"><span>Mô tả</span><textarea required value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label></div><div className="admin-learning-form__actions"><button className="admin-button admin-button--secondary" onClick={() => setForm(null)} type="button">Hủy</button><button className="admin-button admin-button--primary" disabled={saving} type="submit">{saving ? 'Đang lưu…' : 'Lưu đề thi'}</button></div></form>;
}
function SectionForm({ form, setForm, onSubmit, saving }) {
  return <form className="admin-form-section admin-learning-form" onSubmit={onSubmit}><div className="admin-form-grid"><Field label="Tên phần thi" name="title" form={form} setForm={setForm} required /><label className="admin-form-field"><span>Loại phần thi</span><select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}><option value="listening">Listening</option><option value="reading">Reading</option><option value="writing">Writing</option></select></label><Field label="Thứ tự" name="order" form={form} setForm={setForm} type="number" min="0" required /><label className="admin-form-field admin-learning-field--full"><span>Mô tả</span><textarea value={form.description || ''} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label></div><div className="admin-learning-form__actions"><button className="admin-button admin-button--secondary" onClick={() => setForm(null)} type="button">Hủy</button><button className="admin-button admin-button--primary" disabled={saving} type="submit">Lưu phần thi</button></div></form>;
}
function Field({ form, label, name, setForm, ...props }) { return <label className="admin-form-field"><span>{label}</span><input {...props} value={form[name]} onChange={(event) => setForm({ ...form, [name]: event.target.value })} /></label>; }
