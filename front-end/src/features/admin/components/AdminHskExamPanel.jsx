import { useCallback, useEffect, useMemo, useState } from 'react';
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

const EMPTY_EXAM = {
  title: '',
  description: '',
  level: '1',
  durationMinutes: '35',
  passingScore: '60',
  status: 'draft',
  featured: false,
};

const SECTION_META = {
  listening: {
    label: 'Nghe',
    defaultTitle: 'Listening',
    allowedTypes: ['multiple_choice', 'true_false'],
    requireAudio: true,
    hint: 'Câu nghe bắt buộc có Audio URL.',
  },
  reading: {
    label: 'Đọc',
    defaultTitle: 'Reading',
    allowedTypes: ['multiple_choice', 'true_false', 'fill_blank'],
    requireAudio: false,
    hint: 'Phần đọc dùng lựa chọn, đúng/sai hoặc điền đáp án ngắn.',
  },
  writing: {
    label: 'Viết',
    defaultTitle: 'Writing',
    allowedTypes: ['fill_blank', 'arrange_sentence'],
    requireAudio: false,
    hint: 'Phần viết không dùng Đúng/Sai. MVP tự chấm câu điền và sắp xếp; bài luận tự do cần chấm thủ công ở phase sau.',
  },
};

function statusLabel(status) {
  return status === 'published'
    ? 'Đang xuất bản'
    : status === 'archived'
      ? 'Đã gỡ xuất bản'
      : 'Bản nháp';
}

function requiredTypes(level) {
  return Number(level) <= 2
    ? ['listening', 'reading']
    : ['listening', 'reading', 'writing'];
}

export default function AdminHskExamPanel({ onNotify, onUnauthorized }) {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: ADMIN_DEFAULT_PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    level: '',
    from: '',
    to: '',
  });
  const debouncedSearch = useDebouncedValue(filters.search, 350);
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');
  const [examForm, setExamForm] = useState(null);
  const [selected, setSelected] = useState(null);
  const [activeSectionId, setActiveSectionId] = useState('');
  const [sectionForm, setSectionForm] = useState(null);
  const [questionForm, setQuestionForm] = useState(null);
  const [questionSectionId, setQuestionSectionId] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(
    async (signal) => {
      setState('loading');
      setError('');
      try {
        const response = await listAdminHskExams({
          ...filters,
          search: debouncedSearch,
          page: pagination.page,
          pageSize: pagination.pageSize,
          signal,
        });
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
    },
    [
      debouncedSearch,
      filters.from,
      filters.level,
      filters.status,
      onUnauthorized,
      pagination.page,
      pagination.pageSize,
    ],
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  function changeFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPagination((current) => ({ ...current, page: 1 }));
  }

  async function openExam(id, { preserveSection = true } = {}) {
    try {
      const response = await getAdminHskExam(id);
      const exam = response.data;
      setSelected(exam);
      setExamForm(null);
      setActiveSectionId((current) => {
        if (preserveSection && exam.sections.some((section) => section.id === current)) {
          return current;
        }
        return exam.sections[0]?.id || '';
      });
      return exam;
    } catch (caught) {
      onNotify(caught.message, 'error');
      return null;
    }
  }

  async function refreshSelected(id = selected?.id) {
    if (!id) return;
    await Promise.all([openExam(id), load()]);
  }

  async function saveExam(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...examForm,
        level: Number(examForm.level),
        durationMinutes: Number(examForm.durationMinutes),
        passingScore: Number(examForm.passingScore),
      };
      if (examForm.id) {
        await updateAdminHskExam(examForm.id, payload);
        onNotify('Đã cập nhật đề thi thử HSK.');
        setExamForm(null);
        if (selected?.id === examForm.id) await refreshSelected(examForm.id);
        else await load();
      } else {
        const response = await createAdminHskExam({ ...payload, status: 'draft' });
        onNotify('Đã tạo đề thi nháp. Hãy thêm đủ phần thi và câu hỏi rồi xuất bản.');
        setExamForm(null);
        await load();
        if (response?.data?.id) await openExam(response.data.id, { preserveSection: false });
      }
    } catch (caught) {
      onNotify(caught.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function saveSection(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = { ...sectionForm, order: Number(sectionForm.order) };
      if (sectionForm.id) await updateAdminHskSection(sectionForm.id, payload);
      else await createAdminHskSection(selected.id, payload);
      setSectionForm(null);
      await refreshSelected();
      onNotify('Đã lưu phần thi.');
    } catch (caught) {
      onNotify(caught.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function saveQuestion(payload) {
    setSaving(true);
    try {
      if (questionForm?.id) await updateAdminHskQuestion(questionForm.id, payload);
      else await createAdminHskQuestion(questionSectionId, payload);
      setQuestionForm(null);
      setQuestionSectionId('');
      await refreshSelected();
      onNotify('Đã lưu câu hỏi thi thử.');
    } catch (caught) {
      onNotify(caught.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(status) {
    try {
      await updateAdminHskExam(selected.id, { status });
      await refreshSelected();
      onNotify(
        status === 'published'
          ? 'Đã xuất bản đề thi.'
          : 'Đã gỡ đề khỏi phía học viên. Bạn có thể chỉnh sửa rồi xuất bản lại.',
      );
    } catch (caught) {
      onNotify(caught.message, 'error');
    }
  }

  const activeSection = useMemo(
    () => selected?.sections?.find((section) => section.id === activeSectionId) || selected?.sections?.[0],
    [activeSectionId, selected],
  );

  if (selected) {
    const expectedTypes = selected.requiredSectionTypes || requiredTypes(selected.level);
    const existingTypes = selected.sections.map((section) => section.type);
    const missingTypes = expectedTypes.filter((type) => !existingTypes.includes(type));
    const invalidTypes = existingTypes.filter((type) => !expectedTypes.includes(type));
    const canEdit = selected.status !== 'published';
    const sectionRule = activeSection ? SECTION_META[activeSection.type] : null;
    const maxScore = Number(selected.level) <= 2 ? 200 : 300;
    const passScore = Math.round((selected.passingScore / 100) * maxScore);

    return (
      <div className="admin-learning-page admin-hsk-builder">
        <AdminPageHeader
          eyebrow={`HSK ${selected.level}`}
          title={selected.title}
          description="Soạn đề theo từng phần. Đáp án chỉ xuất hiện sau khi backend chấm."
          action={
            <button
              className="admin-button admin-button--secondary"
              onClick={() => {
                setSelected(null);
                setQuestionForm(null);
                setSectionForm(null);
                load();
              }}
              type="button"
            >
              Quay lại danh sách
            </button>
          }
        />

        <section className="admin-panel admin-hsk-summary">
          <div className="admin-hsk-summary__copy">
            <div>
              <span className={`admin-learning-badge is-${selected.status}`}>
                {statusLabel(selected.status)}
              </span>
              <strong>{selected.sections.length} phần thi</strong>
            </div>
            <p>
              {selected.durationMinutes} phút · Ngưỡng luyện tập {selected.passingScore}%
              {' '}≈ {passScore}/{maxScore} điểm HSK quy đổi.
            </p>
          </div>
          <div className="admin-hsk-summary__actions">
            <button
              className="admin-button admin-button--secondary"
              onClick={() =>
                setExamForm({
                  ...selected,
                  level: String(selected.level),
                  durationMinutes: String(selected.durationMinutes),
                  passingScore: String(selected.passingScore),
                })
              }
              type="button"
            >
              Sửa thông tin
            </button>
            {selected.status === 'published' ? (
              <button
                className="admin-button admin-button--secondary"
                onClick={() => changeStatus('archived')}
                type="button"
              >
                Gỡ xuất bản để chỉnh sửa
              </button>
            ) : (
              <button
                className="admin-button admin-button--primary"
                onClick={() => changeStatus('published')}
                type="button"
              >
                {selected.status === 'archived' ? 'Xuất bản lại' : 'Xuất bản'}
              </button>
            )}
          </div>
        </section>

        {examForm && (
          <ExamForm
            editing
            form={examForm}
            onSubmit={saveExam}
            saving={saving}
            setForm={setExamForm}
          />
        )}

        {(missingTypes.length > 0 || invalidTypes.length > 0) && (
          <AdminAlert>
            {invalidTypes.length > 0
              ? `HSK ${selected.level} không dùng phần ${invalidTypes.map((type) => SECTION_META[type]?.label || type).join(', ')}. Hãy gỡ phần không hợp lệ trước khi xuất bản lại. `
              : ''}
            {missingTypes.length > 0
              ? `Còn thiếu: ${missingTypes.map((type) => SECTION_META[type]?.label || type).join(', ')}.`
              : ''}
          </AdminAlert>
        )}

        <section className="admin-panel admin-hsk-composer">
          <aside className="admin-hsk-outline" aria-label="Cấu trúc đề thi">
            <div className="admin-hsk-outline__heading">
              <div>
                <small>Cấu trúc đề</small>
                <strong>Chọn phần để soạn</strong>
              </div>
              {canEdit && missingTypes.length > 0 && (
                <button
                  className="admin-button admin-button--primary"
                  onClick={() => {
                    const type = missingTypes[0];
                    setSectionForm({
                      title: SECTION_META[type].defaultTitle,
                      type,
                      description: '',
                      order: String(selected.sections.length),
                    });
                  }}
                  type="button"
                >
                  <AdminIcon name="plus" size={15} /> Thêm phần
                </button>
              )}
            </div>
            <div className="admin-hsk-outline__list">
              {selected.sections.map((section, index) => (
                <button
                  className={section.id === activeSection?.id ? 'is-active' : ''}
                  key={section.id}
                  onClick={() => {
                    setActiveSectionId(section.id);
                    setQuestionForm(null);
                    setSectionForm(null);
                  }}
                  type="button"
                >
                  <span>{index + 1}</span>
                  <span>
                    <strong>{section.title}</strong>
                    <small>
                      {SECTION_META[section.type]?.label || section.type} · {section.questions.length} câu
                    </small>
                  </span>
                </button>
              ))}
            </div>
            <div className="admin-hsk-outline__rules">
              <small>Logic HSK {selected.level}</small>
              <p>
                {expectedTypes.map((type) => SECTION_META[type].label).join(' + ')}.
                Mỗi phần được chuẩn hóa tối đa 100 điểm.
              </p>
            </div>
          </aside>

          <div className="admin-hsk-editor-pane">
            {sectionForm ? (
              <SectionForm
                form={sectionForm}
                onSubmit={saveSection}
                saving={saving}
                setForm={setSectionForm}
                allowedTypes={expectedTypes}
              />
            ) : activeSection ? (
              <>
                <header className="admin-hsk-editor-pane__header">
                  <div>
                    <span className="admin-eyebrow">
                      {SECTION_META[activeSection.type]?.label || activeSection.type}
                    </span>
                    <h2>{activeSection.title}</h2>
                    <p>{SECTION_META[activeSection.type]?.hint}</p>
                  </div>
                  <div>
                    <button
                      className="admin-button admin-button--secondary"
                      disabled={!canEdit}
                      onClick={() =>
                        setSectionForm({ ...activeSection, order: String(activeSection.order) })
                      }
                      type="button"
                    >
                      Sửa phần
                    </button>
                    <button
                      className="admin-button admin-button--primary"
                      disabled={!canEdit}
                      onClick={() => {
                        setQuestionSectionId(activeSection.id);
                        setQuestionForm({});
                      }}
                      type="button"
                    >
                      <AdminIcon name="plus" size={15} /> Thêm câu hỏi
                    </button>
                  </div>
                </header>

                {!canEdit && (
                  <AdminAlert>
                    Đề đang xuất bản nên cấu trúc được khóa. Bấm “Gỡ xuất bản để chỉnh sửa”
                    trước khi thay đổi phần thi hoặc câu hỏi.
                  </AdminAlert>
                )}

                <div className="admin-hsk-question-list">
                  {activeSection.questions.map((question, index) => (
                    <article key={question.id}>
                      <span className="admin-hsk-question-list__number">{index + 1}</span>
                      <div>
                        <strong>{question.question}</strong>
                        <small>
                          {question.type} · 1 điểm nội bộ
                          {question.audioUrl ? ' · có audio' : ''}
                        </small>
                      </div>
                      <div className="admin-learning-actions">
                        <button
                          aria-label="Sửa câu hỏi"
                          className="admin-icon-button"
                          disabled={!canEdit}
                          onClick={() => {
                            setQuestionSectionId(activeSection.id);
                            setQuestionForm(question);
                          }}
                          type="button"
                        >
                          <AdminIcon name="edit" size={15} />
                        </button>
                        <button
                          aria-label="Xóa câu hỏi"
                          className="admin-icon-button admin-icon-button--danger"
                          disabled={!canEdit}
                          onClick={async () => {
                            if (!window.confirm('Xóa câu hỏi này?')) return;
                            try {
                              await deleteAdminHskQuestion(question.id);
                              await refreshSelected();
                            } catch (caught) {
                              onNotify(caught.message, 'error');
                            }
                          }}
                          type="button"
                        >
                          <AdminIcon name="trash" size={15} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>

                {questionForm && (
                  <AdminQuestionEditor
                    allowMedia
                    allowedTypes={sectionRule?.allowedTypes}
                    defaultType={sectionRule?.allowedTypes?.[0]}
                    fixedPoints={1}
                    mediaHint={sectionRule?.hint}
                    onCancel={() => setQuestionForm(null)}
                    onSave={saveQuestion}
                    question={questionForm.id ? questionForm : null}
                    requireAudio={Boolean(sectionRule?.requireAudio)}
                    saving={saving}
                  />
                )}

                {canEdit && (
                  <div className="admin-hsk-danger-zone">
                    <button
                      className="admin-button admin-button--danger"
                      disabled={activeSection.questions.length > 0}
                      onClick={async () => {
                        if (!window.confirm(`Xóa phần “${activeSection.title}”?`)) return;
                        try {
                          await deleteAdminHskSection(activeSection.id);
                          setActiveSectionId('');
                          await refreshSelected();
                        } catch (caught) {
                          onNotify(caught.message, 'error');
                        }
                      }}
                      title={
                        activeSection.questions.length
                          ? 'Xóa hết câu hỏi trong phần trước'
                          : undefined
                      }
                      type="button"
                    >
                      Xóa phần thi
                    </button>
                  </div>
                )}
              </>
            ) : (
              <AdminEmpty title="Chưa có phần thi">
                Thêm đủ cấu trúc HSK trước khi xuất bản đề.
              </AdminEmpty>
            )}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="admin-learning-page">
      <AdminPageHeader
        eyebrow="Assessment"
        title="Thi thử HSK"
        description="Quản lý đề thi thử HSK 1–6, thời lượng, phần thi và câu hỏi nghe/đọc/viết."
        action={
          <button
            className="admin-button admin-button--primary"
            onClick={() => setExamForm({ ...EMPTY_EXAM })}
            type="button"
          >
            <AdminIcon name="plus" size={16} /> Tạo đề
          </button>
        }
      />
      {examForm && (
        <ExamForm
          form={examForm}
          onSubmit={saveExam}
          saving={saving}
          setForm={setExamForm}
        />
      )}
      <section className="admin-panel">
        <AdminFilterToolbar
          search={filters.search}
          onSearchChange={(value) => changeFilter('search', value)}
          filters={[
            {
              key: 'status',
              label: 'Trạng thái',
              value: filters.status,
              onChange: (value) => changeFilter('status', value),
              options: [
                { value: '', label: 'Tất cả trạng thái' },
                { value: 'draft', label: 'Bản nháp' },
                { value: 'published', label: 'Đã xuất bản' },
                { value: 'archived', label: 'Đã gỡ xuất bản' },
              ],
            },
            {
              key: 'level',
              label: 'Cấp HSK',
              value: filters.level,
              onChange: (value) => changeFilter('level', value),
              options: [
                { value: '', label: 'Tất cả HSK' },
                ...[1, 2, 3, 4, 5, 6].map((level) => ({
                  value: String(level),
                  label: `HSK ${level}`,
                })),
              ],
            },
          ]}
          from={filters.from}
          to={filters.to}
          onFromChange={(value) => changeFilter('from', value)}
          onToChange={(value) => changeFilter('to', value)}
          pageSize={pagination.pageSize}
          onPageSizeChange={(value) =>
            setPagination((current) => ({ ...current, page: 1, pageSize: value }))
          }
        />
        {error && <AdminAlert onRetry={() => load()}>{error}</AdminAlert>}
        {state === 'loading' ? (
          <AdminSkeletonRows count={4} />
        ) : items.length ? (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Đề thi</th>
                    <th>Thời lượng</th>
                    <th>Ngưỡng đạt</th>
                    <th>Trạng thái</th>
                    <th><span className="admin-sr-only">Thao tác</span></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((exam) => (
                    <tr key={exam.id}>
                      <td><strong>{exam.title}</strong><small>HSK {exam.level}</small></td>
                      <td>{exam.durationMinutes} phút</td>
                      <td>{exam.passingScore}%</td>
                      <td>
                        <span className={`admin-learning-badge is-${exam.status}`}>
                          {statusLabel(exam.status)}
                        </span>
                      </td>
                      <td className="admin-learning-actions">
                        <button
                          className="admin-button admin-button--secondary"
                          onClick={() => openExam(exam.id, { preserveSection: false })}
                          type="button"
                        >
                          Soạn đề
                        </button>
                        {exam.status === 'draft' && (
                          <button
                            className="admin-icon-button admin-icon-button--danger"
                            aria-label={`Xóa ${exam.title}`}
                            onClick={async () => {
                              if (!window.confirm(`Xóa “${exam.title}”?`)) return;
                              try {
                                await deleteAdminHskExam(exam.id);
                                await load();
                              } catch (caught) {
                                onNotify(caught.message, 'error');
                              }
                            }}
                            type="button"
                          >
                            <AdminIcon name="trash" size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <AdminPagination
              pagination={pagination}
              onPageChange={(page) =>
                setPagination((current) => ({ ...current, page }))
              }
            />
          </>
        ) : (
          <AdminEmpty title="Chưa có đề thi thử">
            Tạo đề HSK nháp, thêm đủ phần và câu hỏi trước khi xuất bản.
          </AdminEmpty>
        )}
      </section>
    </div>
  );
}

function ExamForm({ editing = false, form, setForm, onSubmit, saving }) {
  const maxScore = Number(form.level) <= 2 ? 200 : 300;
  const passScore = Math.round((Number(form.passingScore || 0) / 100) * maxScore);
  return (
    <form className="admin-form-section admin-learning-form" onSubmit={onSubmit}>
      <div className="admin-form-grid">
        <Field label="Tiêu đề" name="title" form={form} setForm={setForm} required />
        <Field label="Cấp HSK" name="level" form={form} setForm={setForm} type="number" min="1" max="6" required />
        <Field label="Thời lượng (phút)" name="durationMinutes" form={form} setForm={setForm} type="number" min="1" required />
        <label className="admin-form-field">
          <span>Ngưỡng đạt (%) *</span>
          <input
            min="1"
            max="100"
            required
            type="number"
            value={form.passingScore}
            onChange={(event) => setForm({ ...form, passingScore: event.target.value })}
          />
          <small>Ví dụ {form.passingScore || 0}% ≈ {passScore}/{maxScore} điểm HSK quy đổi.</small>
        </label>
        <div className="admin-form-field">
          <span>Trạng thái</span>
          <div className="admin-hsk-fixed-score">
            {editing ? statusLabel(form.status) : 'Đề mới luôn được tạo ở trạng thái Bản nháp.'}
          </div>
        </div>
        <label className="admin-form-field admin-learning-field--full">
          <span>Mô tả</span>
          <textarea
            required
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
        </label>
      </div>
      <div className="admin-learning-form__actions">
        <button className="admin-button admin-button--secondary" onClick={() => setForm(null)} type="button">
          Hủy
        </button>
        <button className="admin-button admin-button--primary" disabled={saving} type="submit">
          {saving ? 'Đang lưu…' : editing ? 'Lưu thông tin' : 'Tạo đề nháp'}
        </button>
      </div>
    </form>
  );
}

function SectionForm({ allowedTypes, form, setForm, onSubmit, saving }) {
  return (
    <form className="admin-form-section admin-learning-form" onSubmit={onSubmit}>
      <div className="admin-form-grid">
        <Field label="Tên phần thi" name="title" form={form} setForm={setForm} required />
        <label className="admin-form-field">
          <span>Loại phần thi</span>
          <select
            value={form.type}
            onChange={(event) => setForm({ ...form, type: event.target.value })}
          >
            {allowedTypes.map((type) => (
              <option key={type} value={type}>{SECTION_META[type].label}</option>
            ))}
          </select>
        </label>
        <Field label="Thứ tự" name="order" form={form} setForm={setForm} type="number" min="0" required />
        <label className="admin-form-field admin-learning-field--full">
          <span>Mô tả</span>
          <textarea
            value={form.description || ''}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
        </label>
      </div>
      <div className="admin-learning-form__actions">
        <button className="admin-button admin-button--secondary" onClick={() => setForm(null)} type="button">
          Hủy
        </button>
        <button className="admin-button admin-button--primary" disabled={saving} type="submit">
          {saving ? 'Đang lưu…' : 'Lưu phần thi'}
        </button>
      </div>
    </form>
  );
}

function Field({ form, label, name, setForm, ...props }) {
  return (
    <label className="admin-form-field">
      <span>{label}</span>
      <input
        {...props}
        value={form[name] ?? ''}
        onChange={(event) => setForm({ ...form, [name]: event.target.value })}
      />
    </label>
  );
}
