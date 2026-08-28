import { useCallback, useEffect, useMemo, useState } from 'react';
import { listAdminLessonOptions } from '../../../services/adminService.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { ADMIN_DEFAULT_PAGE_SIZE } from '../constants.js';
import {
  createAdminQuestion,
  createAdminQuiz,
  deleteAdminQuestion,
  deleteAdminQuiz,
  getAdminQuiz,
  listAdminQuizzes,
  updateAdminQuestion,
  updateAdminQuiz,
} from '../../quizzes/services/adminQuizService.js';
import { AdminConfirmDialog, AdminEmpty, AdminSkeletonRows } from './AdminFeedback.jsx';
import AdminIcon from './AdminIcon.jsx';
import AdminPageHeader from './AdminPageHeader.jsx';
import AdminPagination from './AdminPagination.jsx';
import AdminQuestionEditor from './AdminQuestionEditor.jsx';
import AdminQuizForm from './AdminQuizForm.jsx';
import AdminFilterToolbar from './AdminFilterToolbar.jsx';

const PAGE_SIZE = ADMIN_DEFAULT_PAGE_SIZE;
const QUESTION_PAGE_SIZE = 5;
const EMPTY_QUIZ = {
  lessonId: '',
  title: '',
  description: '',
  passingScore: '70',
  status: 'draft',
};

function normalize(value) {
  return String(value || '').trim().toLocaleLowerCase('vi');
}

export default function AdminQuizPanel({ onNotify, onUnauthorized }) {
  const [quizzes, setQuizzes] = useState([]);
  const [allLessons, setAllLessons] = useState([]);
  const [selected, setSelected] = useState(null);
  const [quizForm, setQuizForm] = useState(null);
  const [questionForm, setQuestionForm] = useState(null);
  const [workspaceTab, setWorkspaceTab] = useState('questions');
  const [questionSearch, setQuestionSearch] = useState('');
  const [questionPage, setQuestionPage] = useState(1);
  const [status, setStatus] = useState('loading');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 350);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [pagination, setPagination] = useState({ page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 1 });
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmQuestion, setConfirmQuestion] = useState(null);

  const load = useCallback(async (signal) => {
    setStatus('loading');
    try {
      const response = await listAdminQuizzes({
        page,
        pageSize,
        search: debouncedSearch,
        status: statusFilter,
        from: dateRange.from,
        to: dateRange.to,
        signal,
      });
      if (signal?.aborted) return;
      setQuizzes(response.data || []);
      setPagination(response.pagination || { page, pageSize, total: 0, totalPages: 1 });
      setStatus('ready');
    } catch (caught) {
      if (caught?.name === 'AbortError') return;
      if (caught.status === 401) return onUnauthorized(caught);
      setStatus('error');
      onNotify(caught.message || 'Không thể tải danh sách Quiz.', 'error');
    }
  }, [dateRange.from, dateRange.to, debouncedSearch, onNotify, onUnauthorized, page, pageSize, statusFilter]);

  const loadLessonOptions = useCallback(async (signal) => {
    try {
      const response = await listAdminLessonOptions({ pageSize: 100, type: 'quiz', signal });
      if (!signal?.aborted) setAllLessons(response.data || []);
    } catch (caught) {
      if (caught?.name === 'AbortError') return;
      if (caught.status === 401) return onUnauthorized(caught);
      onNotify(caught.message || 'Không thể tải danh sách bài học Quiz.', 'error');
    }
  }, [onNotify, onUnauthorized]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  useEffect(() => {
    const controller = new AbortController();
    loadLessonOptions(controller.signal);
    return () => controller.abort();
  }, [loadLessonOptions]);

  const lessons = useMemo(() => allLessons.filter((lesson) => lesson.type === 'quiz'), [allLessons]);
  const lessonNames = useMemo(() => new Map(allLessons.map((lesson) => [lesson.id, lesson.title])), [allLessons]);
  const selectedQuizzes = useMemo(() => quizzes.filter((quiz) => selectedIds.has(quiz.id)), [quizzes, selectedIds]);
  const selectedDrafts = selectedQuizzes.filter((quiz) => quiz.status !== 'published');
  const selectedPublished = selectedQuizzes.filter((quiz) => quiz.status === 'published');
  const allPageSelected = quizzes.length > 0 && quizzes.every((quiz) => selectedIds.has(quiz.id));

  const filteredQuestions = useMemo(() => {
    if (!selected?.questions) return [];
    const needle = normalize(questionSearch);
    if (!needle) return selected.questions;
    return selected.questions.filter((question) =>
      normalize(`${question.question} ${question.type} ${question.points}`).includes(needle),
    );
  }, [questionSearch, selected]);
  const questionTotalPages = Math.max(1, Math.ceil(filteredQuestions.length / QUESTION_PAGE_SIZE));
  const safeQuestionPage = Math.min(questionPage, questionTotalPages);
  const pagedQuestions = filteredQuestions.slice(
    (safeQuestionPage - 1) * QUESTION_PAGE_SIZE,
    safeQuestionPage * QUESTION_PAGE_SIZE,
  );

  function closeWorkspace() {
    setSelected(null);
    setQuizForm(null);
    setQuestionForm(null);
    setQuestionSearch('');
    setQuestionPage(1);
    setWorkspaceTab('questions');
  }

  async function openQuiz(id, tab = 'questions') {
    try {
      const response = await getAdminQuiz(id);
      setSelected(response.data);
      setQuizForm({ ...response.data, passingScore: String(response.data.passingScore) });
      setQuestionForm(null);
      setQuestionPage(1);
      setQuestionSearch('');
      setWorkspaceTab(tab);
    } catch (caught) {
      if (caught.status === 401) return onUnauthorized(caught);
      onNotify(caught.message || 'Không thể mở Quiz.', 'error');
    }
  }

  async function saveQuiz(event) {
    event.preventDefault();
    setSaving(true);
    const payload = {
      lessonId: quizForm.lessonId,
      title: quizForm.title,
      description: quizForm.description,
      passingScore: Number(quizForm.passingScore),
      status: quizForm.status,
    };
    try {
      const response = quizForm.id
        ? await updateAdminQuiz(quizForm.id, payload)
        : await createAdminQuiz(payload);
      onNotify(quizForm.id ? 'Đã cập nhật Quiz.' : 'Đã tạo Quiz nháp.');
      await load();
      await openQuiz(response.data.id, 'questions');
    } catch (caught) {
      if (caught.status === 401) onUnauthorized(caught);
      else onNotify(caught.message || 'Không thể lưu Quiz.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function saveQuestion(payload) {
    setSaving(true);
    try {
      if (questionForm?.id) await updateAdminQuestion(questionForm.id, payload);
      else await createAdminQuestion(selected.id, payload);
      onNotify(questionForm?.id ? 'Đã cập nhật câu hỏi.' : 'Đã thêm câu hỏi.');
      const selectedId = selected.id;
      setQuestionForm(null);
      await openQuiz(selectedId, 'questions');
      await load();
    } catch (caught) {
      if (caught.status === 401) onUnauthorized(caught);
      else onNotify(caught.message || 'Không thể lưu câu hỏi.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function confirmQuestionDeletion() {
    if (!confirmQuestion) return;
    try {
      await deleteAdminQuestion(confirmQuestion.id);
      onNotify('Đã xóa câu hỏi.');
      const selectedId = selected.id;
      setConfirmQuestion(null);
      await openQuiz(selectedId, 'questions');
      await load();
    } catch (caught) {
      if (caught.status === 401) onUnauthorized(caught);
      else onNotify(caught.message || 'Không thể xóa câu hỏi.', 'error');
    }
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
      if (allPageSelected) quizzes.forEach((quiz) => next.delete(quiz.id));
      else quizzes.forEach((quiz) => next.add(quiz.id));
      return next;
    });
  }

  async function bulkSetStatus(items, nextStatus) {
    if (!items.length || bulkBusy) return;
    setBulkBusy(true);
    let success = 0;
    const failedIds = [];
    for (const quiz of items) {
      try {
        await updateAdminQuiz(quiz.id, { status: nextStatus });
        success += 1;
      } catch (caught) {
        if (caught.status === 401) {
          onUnauthorized(caught);
          break;
        }
        failedIds.push(quiz.id);
      }
    }
    await load();
    setSelectedIds(new Set(failedIds));
    setBulkBusy(false);
    if (success) onNotify(nextStatus === 'published' ? `Đã xuất bản ${success} Quiz.` : `Đã gỡ xuất bản ${success} Quiz.`);
    if (failedIds.length) onNotify(`${failedIds.length} Quiz chưa thể cập nhật.`, 'error');
  }

  async function confirmQuizDeletion() {
    if (!confirmDelete?.length || bulkBusy) return;
    setBulkBusy(true);
    let success = 0;
    const failedIds = [];
    for (const quiz of confirmDelete) {
      try {
        await deleteAdminQuiz(quiz.id);
        success += 1;
        if (selected?.id === quiz.id) closeWorkspace();
      } catch (caught) {
        if (caught.status === 401) {
          onUnauthorized(caught);
          break;
        }
        failedIds.push(quiz.id);
      }
    }
    await load();
    setSelectedIds(new Set(failedIds));
    setConfirmDelete(null);
    setBulkBusy(false);
    if (success) onNotify(`Đã xóa ${success} Quiz.`);
    if (failedIds.length) onNotify(`${failedIds.length} Quiz chưa thể xóa.`, 'error');
  }

  const beginCreate = () => {
    setSelected(null);
    setQuestionForm(null);
    setWorkspaceTab('details');
    setQuizForm({ ...EMPTY_QUIZ, lessonId: lessons[0]?.id || '' });
  };

  const workspaceOpen = Boolean(quizForm);

  return (
    <div className="admin-learning-page admin-quiz-page">
      <AdminPageHeader
        action={!workspaceOpen ? (
          <button className="admin-button admin-button--primary" disabled={!lessons.length} onClick={beginCreate} type="button">
            <AdminIcon name="plus" size={17} /> Tạo Quiz
          </button>
        ) : null}
        description="Tạo Quiz theo bài học, chỉnh thông tin và câu hỏi trong một workspace gọn hơn."
        eyebrow="Learning content"
        title="Quiz"
      />

      {status === 'ready' && allLessons.length > 0 && !lessons.length && !workspaceOpen && (
        <div className="admin-quiz-help"><strong>Chưa có bài học loại Quiz</strong><p>Vào Bài học, sửa một bài và chọn Loại bài học = Quiz; sau đó quay lại đây.</p></div>
      )}
      {status === 'ready' && !allLessons.length && !workspaceOpen && (
        <div className="admin-quiz-help"><strong>Chưa có cấu trúc học</strong><p>Tạo Course → Unit → Lesson trước, sau đó đặt Lesson thành loại Quiz.</p></div>
      )}

      {workspaceOpen && (
        <section className="admin-quiz-workspace">
          <div className="admin-quiz-workspace__topbar">
            <button className="admin-button admin-button--secondary" onClick={closeWorkspace} type="button">← Danh sách Quiz</button>
            {selected && <span>{selected.questions.length} câu hỏi · Điểm đạt {selected.passingScore}%</span>}
          </div>
          {selected && (
            <div className="admin-quiz-tabs" role="tablist" aria-label="Chỉnh sửa Quiz">
              <button aria-selected={workspaceTab === 'details'} className={workspaceTab === 'details' ? 'is-active' : ''} onClick={() => setWorkspaceTab('details')} role="tab" type="button">Thông tin Quiz</button>
              <button aria-selected={workspaceTab === 'questions'} className={workspaceTab === 'questions' ? 'is-active' : ''} onClick={() => setWorkspaceTab('questions')} role="tab" type="button">Câu hỏi ({selected.questions.length})</button>
            </div>
          )}

          {(workspaceTab === 'details' || !selected) && (
            <AdminQuizForm
              form={quizForm}
              lessons={lessons}
              onCancel={closeWorkspace}
              onChange={(event) => setQuizForm((current) => ({ ...current, [event.target.name]: event.target.value }))}
              onSubmit={saveQuiz}
              saving={saving}
            />
          )}

          {selected && workspaceTab === 'questions' && (
            <div className="admin-quiz-question-workspace">
              {questionForm ? (
                <>
                  <div className="admin-quiz-question-workspace__back">
                    <button className="admin-button admin-button--secondary" onClick={() => setQuestionForm(null)} type="button">← Về danh sách câu hỏi</button>
                  </div>
                  <AdminQuestionEditor
                    onCancel={() => setQuestionForm(null)}
                    onSave={saveQuestion}
                    question={questionForm.id ? questionForm : null}
                    saving={saving}
                  />
                </>
              ) : (
                <>
                  <div className="admin-quiz-question-toolbar">
                    <label>
                      <AdminIcon name="search" size={16} />
                      <input
                        onChange={(event) => { setQuestionSearch(event.target.value); setQuestionPage(1); }}
                        placeholder="Tìm nội dung hoặc loại câu hỏi…"
                        type="search"
                        value={questionSearch}
                      />
                    </label>
                    <button className="admin-button admin-button--primary" onClick={() => setQuestionForm({})} type="button">
                      <AdminIcon name="plus" size={15} /> Thêm câu hỏi
                    </button>
                  </div>
                  <div className="admin-quiz-questions admin-quiz-questions--paged">
                    {pagedQuestions.map((question, index) => (
                      <article key={question.id}>
                        <span>{(safeQuestionPage - 1) * QUESTION_PAGE_SIZE + index + 1}</span>
                        <div>
                          <strong>{question.question}</strong>
                          <small>{question.type} · {question.points} điểm · thứ tự {question.order}</small>
                        </div>
                        <div className="admin-learning-actions">
                          <button className="admin-icon-button" aria-label="Sửa câu hỏi" onClick={() => setQuestionForm(question)} type="button"><AdminIcon name="edit" size={16} /></button>
                          <button className="admin-icon-button admin-icon-button--danger" aria-label="Xóa câu hỏi" onClick={() => setConfirmQuestion(question)} type="button"><AdminIcon name="trash" size={16} /></button>
                        </div>
                      </article>
                    ))}
                    {!filteredQuestions.length && <AdminEmpty title={questionSearch ? 'Không tìm thấy câu hỏi' : 'Quiz chưa có câu hỏi'}>{questionSearch ? 'Thử từ khóa khác.' : 'Hãy thêm ít nhất một câu hỏi trước khi xuất bản.'}</AdminEmpty>}
                  </div>
                  {filteredQuestions.length > QUESTION_PAGE_SIZE && (
                    <AdminPagination
                      onPageChange={setQuestionPage}
                      pagination={{ page: safeQuestionPage, pageSize: QUESTION_PAGE_SIZE, total: filteredQuestions.length, totalPages: questionTotalPages }}
                    />
                  )}
                </>
              )}
            </div>
          )}
        </section>
      )}

      {!workspaceOpen && (
        <section className="admin-panel admin-learning-list">
          <AdminFilterToolbar
            search={search}
            onSearchChange={(value) => { setSearch(value); setPage(1); }}
            searchPlaceholder="Tìm tiêu đề, mô tả, bài học, điểm đạt…"
            filters={[{ key: 'status', label: 'Trạng thái Quiz', value: statusFilter, onChange: (value) => { setStatusFilter(value); setPage(1); }, options: [{ value: '', label: 'Tất cả trạng thái' }, { value: 'draft', label: 'Bản nháp' }, { value: 'published', label: 'Đã xuất bản' }] }]}
            from={dateRange.from}
            to={dateRange.to}
            onFromChange={(from) => { setDateRange((current) => ({ ...current, from })); setPage(1); }}
            onToChange={(to) => { setDateRange((current) => ({ ...current, to })); setPage(1); }}
            pageSize={pageSize}
            onPageSizeChange={(value) => { setPageSize(value); setPage(1); }}
          />

          {selectedQuizzes.length > 0 && (
            <div className="admin-learning-selection-bar">
              <div><strong>{selectedQuizzes.length} Quiz đã chọn</strong><span>{selectedDrafts.length} bản nháp có thể xuất bản</span></div>
              <div>
                <button className="admin-button admin-button--primary" disabled={!selectedDrafts.length || bulkBusy} onClick={() => bulkSetStatus(selectedDrafts, 'published')} type="button">Xuất bản ({selectedDrafts.length})</button>
                <button className="admin-button admin-button--secondary" disabled={!selectedPublished.length || bulkBusy} onClick={() => bulkSetStatus(selectedPublished, 'draft')} type="button">Gỡ xuất bản ({selectedPublished.length})</button>
                <button className="admin-button admin-button--danger" disabled={bulkBusy} onClick={() => setConfirmDelete(selectedQuizzes)} type="button">Xóa đã chọn</button>
                <button className="admin-button admin-button--secondary" disabled={bulkBusy} onClick={() => setSelectedIds(new Set())} type="button">Bỏ chọn</button>
              </div>
            </div>
          )}

          {status === 'loading' ? <AdminSkeletonRows count={4} /> : quizzes.length ? (
            <>
              <div className="admin-table-wrap">
                <table className="admin-table admin-learning-table">
                  <thead><tr><th className="admin-learning-select-cell"><input aria-label="Chọn tất cả Quiz trên trang" checked={allPageSelected} onChange={toggleCurrentPage} type="checkbox" /></th><th>Quiz</th><th>Câu hỏi</th><th>Điểm đạt</th><th>Trạng thái</th><th><span className="admin-sr-only">Thao tác</span></th></tr></thead>
                  <tbody>
                    {quizzes.map((quiz) => (
                      <tr className={selectedIds.has(quiz.id) ? 'is-selected' : ''} key={quiz.id}>
                        <td className="admin-learning-select-cell"><input aria-label={`Chọn ${quiz.title}`} checked={selectedIds.has(quiz.id)} onChange={() => toggleSelected(quiz.id)} type="checkbox" /></td>
                        <td><strong>{quiz.title}</strong><small>{lessonNames.get(quiz.lessonId) || 'Bài học Quiz'}</small></td>
                        <td>{quiz.questionCount}</td><td>{quiz.passingScore}%</td>
                        <td><span className={`admin-learning-badge is-${quiz.status}`}>{quiz.status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}</span></td>
                        <td className="admin-learning-actions">
                          <button className="admin-icon-button" aria-label={`Sửa ${quiz.title}`} onClick={() => openQuiz(quiz.id)} type="button"><AdminIcon name="edit" size={16} /></button>
                          <button className="admin-icon-button admin-icon-button--danger" aria-label={`Xóa ${quiz.title}`} disabled={bulkBusy} onClick={() => setConfirmDelete([quiz])} type="button"><AdminIcon name="trash" size={16} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <AdminPagination onPageChange={setPage} pagination={pagination} />
            </>
          ) : <AdminEmpty title="Chưa có Quiz">Tạo Quiz nháp cho một bài học loại Quiz để bắt đầu.</AdminEmpty>}
        </section>
      )}

      <AdminConfirmDialog
        confirmLabel={confirmDelete?.length > 1 ? `Xóa ${confirmDelete.length} Quiz` : 'Xóa Quiz'}
        description={confirmDelete?.length > 1 ? 'Backend sẽ bảo vệ các Quiz không thể xóa; các Quiz hợp lệ khác vẫn tiếp tục được xử lý.' : `Bạn sắp xóa “${confirmDelete?.[0]?.title || ''}”.`}
        loading={bulkBusy}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={confirmQuizDeletion}
        open={Boolean(confirmDelete?.length)}
        title="Xác nhận xóa Quiz?"
      />
      <AdminConfirmDialog
        confirmLabel="Xóa câu hỏi"
        description={`Bạn sắp xóa câu hỏi “${confirmQuestion?.question || ''}”. Thao tác này không dùng alert của trình duyệt.`}
        onCancel={() => setConfirmQuestion(null)}
        onConfirm={confirmQuestionDeletion}
        open={Boolean(confirmQuestion)}
        title="Xác nhận xóa câu hỏi?"
      />
    </div>
  );
}
