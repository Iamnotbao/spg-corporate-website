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
import {
  AdminAlert,
  AdminConfirmDialog,
  AdminEmpty,
  AdminSkeletonRows,
} from './AdminFeedback.jsx';
import AdminIcon from './AdminIcon.jsx';
import AdminPageHeader from './AdminPageHeader.jsx';
import AdminPagination from './AdminPagination.jsx';
import AdminQuestionEditor from './AdminQuestionEditor.jsx';
import AdminQuizForm from './AdminQuizForm.jsx';
import AdminFilterToolbar from './AdminFilterToolbar.jsx';

const PAGE_SIZE = ADMIN_DEFAULT_PAGE_SIZE;
const EMPTY_QUIZ = {
  lessonId: '',
  title: '',
  description: '',
  passingScore: '70',
  status: 'draft',
};

export default function AdminQuizPanel({ onNotify, onUnauthorized }) {
  const [quizzes, setQuizzes] = useState([]);
  const [allLessons, setAllLessons] = useState([]);
  const [lessonError, setLessonError] = useState('');
  const [selected, setSelected] = useState(null);
  const [quizForm, setQuizForm] = useState(null);
  const [questionForm, setQuestionForm] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 350);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = useCallback(
    async (signal) => {
      setStatus('loading');
      setError('');
      try {
        const quizResponse = await listAdminQuizzes({
          page,
          pageSize,
          search: debouncedSearch,
          status: statusFilter,
          from: dateRange.from,
          to: dateRange.to,
          signal,
        });
        if (signal?.aborted) return;
        setQuizzes(quizResponse.data || []);
        setPagination(
          quizResponse.pagination || {
            page,
            pageSize,
            total: 0,
            totalPages: 1,
          },
        );
        setStatus('ready');
      } catch (caught) {
        if (caught?.name === 'AbortError') return;
        if (caught.status === 401) {
          onUnauthorized(caught);
          return;
        }
        setError(caught.message);
        setStatus('error');
      }
    },
    [dateRange.from, dateRange.to, debouncedSearch, onUnauthorized, page, pageSize, statusFilter],
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
        const response = await listAdminLessonOptions({
          pageSize: 100,
          type: 'quiz',
          signal,
        });
        if (!signal?.aborted) setAllLessons(response.data || []);
      } catch (caught) {
        if (caught?.name === 'AbortError') return;
        if (caught?.status === 401) {
          onUnauthorized(caught);
          return;
        }
        setLessonError(caught?.message || 'Không thể tải danh sách bài học Quiz.');
      }
    },
    [onUnauthorized],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadLessonOptions(controller.signal);
    return () => controller.abort();
  }, [loadLessonOptions]);

  const lessons = useMemo(
    () => allLessons.filter((lesson) => lesson.type === 'quiz'),
    [allLessons],
  );
  const lessonNames = useMemo(
    () => new Map(allLessons.map((lesson) => [lesson.id, lesson.title])),
    [allLessons],
  );
  const visible = { length: pagination.total };
  const totalPages = pagination.totalPages;
  const safePage = pagination.page;
  const pagedQuizzes = quizzes;
  const selectedQuizzes = useMemo(
    () => quizzes.filter((quiz) => selectedIds.has(quiz.id)),
    [quizzes, selectedIds],
  );
  const selectedDrafts = selectedQuizzes.filter((quiz) => quiz.status !== 'published');
  const selectedPublished = selectedQuizzes.filter((quiz) => quiz.status === 'published');
  const allPageSelected =
    pagedQuizzes.length > 0 && pagedQuizzes.every((quiz) => selectedIds.has(quiz.id));

  function updateSearch(value) {
    setSearch(value);
    setPage(1);
  }
  function updateStatusFilter(value) {
    setStatusFilter(value);
    setPage(1);
  }

  async function openQuiz(id) {
    setError('');
    try {
      const response = await getAdminQuiz(id);
      setSelected(response.data);
      setQuizForm({ ...response.data, passingScore: String(response.data.passingScore) });
      setQuestionForm(null);
    } catch (caught) {
      if (caught.status === 401) onUnauthorized();
      setError(caught.message);
    }
  }

  async function saveQuiz(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
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
      await openQuiz(response.data.id);
    } catch (caught) {
      if (caught.status === 401) onUnauthorized();
      setError(caught.message);
    } finally {
      setSaving(false);
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
      if (allPageSelected) pagedQuizzes.forEach((quiz) => next.delete(quiz.id));
      else pagedQuizzes.forEach((quiz) => next.add(quiz.id));
      return next;
    });
  }

  async function publishSelected() {
    if (!selectedDrafts.length || bulkBusy) return;
    setBulkBusy(true);
    const failures = [];
    let success = 0;
    for (const quiz of selectedDrafts) {
      try {
        await updateAdminQuiz(quiz.id, { status: 'published' });
        success += 1;
      } catch (caught) {
        if (caught.status === 401 && onUnauthorized(caught)) {
          setBulkBusy(false);
          return;
        }
        failures.push({ quiz, message: caught.message });
      }
    }
    await load();
    setSelectedIds(new Set(failures.map(({ quiz }) => quiz.id)));
    setBulkBusy(false);
    if (success) onNotify(`Đã xuất bản ${success} Quiz.`);
    if (failures.length) {
      onNotify(
        `${failures.length} Quiz chưa thể xuất bản. ${failures[0].quiz.title}: ${failures[0].message}`,
        'error',
      );
    }
  }

  async function unpublishSelected() {
    if (!selectedPublished.length || bulkBusy) return;
    setBulkBusy(true);
    const failures = [];
    let success = 0;
    for (const quiz of selectedPublished) {
      try {
        await updateAdminQuiz(quiz.id, { status: 'draft' });
        success += 1;
      } catch (caught) {
        if (caught.status === 401 && onUnauthorized(caught)) {
          setBulkBusy(false);
          return;
        }
        failures.push({ quiz, message: caught.message });
      }
    }
    await load();
    setBulkBusy(false);
    if (success) onNotify(`Đã gỡ xuất bản ${success} Quiz.`);
    if (failures.length) {
      onNotify(
        `${failures.length} Quiz chưa thể gỡ xuất bản. ${failures[0].quiz.title}: ${failures[0].message}`,
        'error',
      );
    }
  }

  async function confirmQuizDeletion() {
    if (!confirmDelete?.length || bulkBusy) return;
    setBulkBusy(true);
    const failures = [];
    let success = 0;
    for (const quiz of confirmDelete) {
      try {
        await deleteAdminQuiz(quiz.id);
        success += 1;
        if (selected?.id === quiz.id) {
          setSelected(null);
          setQuizForm(null);
        }
      } catch (caught) {
        if (caught.status === 401 && onUnauthorized(caught)) {
          setBulkBusy(false);
          setConfirmDelete(null);
          return;
        }
        failures.push({ quiz, message: caught.message });
      }
    }
    await load();
    setSelectedIds(new Set(failures.map(({ quiz }) => quiz.id)));
    setConfirmDelete(null);
    setBulkBusy(false);
    if (success) onNotify(`Đã xóa ${success} Quiz.`);
    if (failures.length) {
      onNotify(
        `${failures.length} Quiz chưa thể xóa. ${failures[0].quiz.title}: ${failures[0].message}`,
        'error',
      );
    }
  }

  async function saveQuestion(payload) {
    setSaving(true);
    setError('');
    try {
      if (questionForm?.id) await updateAdminQuestion(questionForm.id, payload);
      else await createAdminQuestion(selected.id, payload);
      onNotify(questionForm?.id ? 'Đã cập nhật câu hỏi.' : 'Đã thêm câu hỏi.');
      setQuestionForm(null);
      await openQuiz(selected.id);
      await load();
    } catch (caught) {
      if (caught.status === 401) onUnauthorized();
      setError(caught.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeQuestion(question) {
    if (!window.confirm('Xóa câu hỏi này?')) return;
    try {
      await deleteAdminQuestion(question.id);
      onNotify('Đã xóa câu hỏi.');
      await openQuiz(selected.id);
      await load();
    } catch (caught) {
      if (caught.status === 401) onUnauthorized();
      setError(caught.message);
    }
  }

  const beginCreate = () => {
    setSelected(null);
    setQuestionForm(null);
    setQuizForm({ ...EMPTY_QUIZ, lessonId: lessons[0]?.id || '' });
  };

  return (
    <div className="admin-learning-page admin-quiz-page">
      <AdminPageHeader
        action={
          <button
            className="admin-button admin-button--primary"
            disabled={!lessons.length}
            onClick={beginCreate}
            type="button"
          >
            <AdminIcon name="plus" size={17} /> Tạo Quiz
          </button>
        }
        description="Tạo Quiz theo bài học loại Quiz, xây câu hỏi và kiểm tra cấu trúc trước khi xuất bản."
        eyebrow="Learning content"
        title="Quiz"
      />
      {status === 'ready' && allLessons.length > 0 && !lessons.length && (
        <AdminAlert>
          Bạn đã có bài học nhưng chưa có bài nào mang loại “Quiz”. Vào Bài học, sửa một
          bài và chọn Loại bài học = Quiz; sau đó quay lại đây để tạo Quiz cho bài đó.
        </AdminAlert>
      )}
      {status === 'ready' && !allLessons.length && (
        <AdminAlert>
          Bạn cần tạo Course → Unit → Lesson trước, sau đó đặt Lesson đó thành loại Quiz.
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
      {quizForm && (
        <AdminQuizForm
          form={quizForm}
          lessons={lessons}
          onCancel={() => {
            setQuizForm(null);
            setSelected(null);
            setQuestionForm(null);
          }}
          onChange={(event) =>
            setQuizForm((current) => ({
              ...current,
              [event.target.name]: event.target.value,
            }))
          }
          onSubmit={saveQuiz}
          saving={saving}
        />
      )}
      {selected && (
        <section className="admin-panel admin-quiz-builder">
          <header>
            <div>
              <p className="admin-eyebrow">Question builder</p>
              <h3>{selected.title}</h3>
              <span>
                {selected.questions.length} câu hỏi · Điểm đạt {selected.passingScore}%
              </span>
            </div>
            <button
              className="admin-button admin-button--secondary"
              onClick={() => setQuestionForm({})}
              type="button"
            >
              <AdminIcon name="plus" size={15} /> Thêm câu hỏi
            </button>
          </header>
          {questionForm && (
            <AdminQuestionEditor
              onCancel={() => setQuestionForm(null)}
              onSave={saveQuestion}
              question={questionForm.id ? questionForm : null}
              saving={saving}
            />
          )}
          <div className="admin-quiz-questions">
            {selected.questions.map((question) => (
              <article key={question.id}>
                <span>{question.order}</span>
                <div>
                  <strong>{question.question}</strong>
                  <small>
                    {question.type} · {question.points} điểm
                  </small>
                </div>
                <div className="admin-learning-actions">
                  <button
                    className="admin-icon-button"
                    aria-label="Sửa câu hỏi"
                    onClick={() => setQuestionForm(question)}
                    type="button"
                  >
                    <AdminIcon name="edit" size={16} />
                  </button>
                  <button
                    className="admin-icon-button admin-icon-button--danger"
                    aria-label="Xóa câu hỏi"
                    onClick={() => removeQuestion(question)}
                    type="button"
                  >
                    <AdminIcon name="trash" size={16} />
                  </button>
                </div>
              </article>
            ))}
            {!selected.questions.length && (
              <AdminEmpty title="Quiz chưa có câu hỏi">
                Hãy thêm ít nhất một câu hỏi hợp lệ trước khi xuất bản.
              </AdminEmpty>
            )}
          </div>
        </section>
      )}
      <section className="admin-panel admin-learning-list">
        <AdminFilterToolbar search={search} onSearchChange={updateSearch} searchPlaceholder="Tìm tiêu đề, mô tả, bài học, điểm đạt…" filters={[{ key: 'status', label: 'Trạng thái Quiz', value: statusFilter, onChange: updateStatusFilter, options: [{ value: '', label: 'Tất cả trạng thái' }, { value: 'draft', label: 'Bản nháp' }, { value: 'published', label: 'Đã xuất bản' }] }]} from={dateRange.from} to={dateRange.to} onFromChange={(from) => { setDateRange((current) => ({ ...current, from })); setPage(1); }} onToChange={(to) => { setDateRange((current) => ({ ...current, to })); setPage(1); }} pageSize={pageSize} onPageSizeChange={(value) => { setPageSize(value); setPage(1); }} />
        {selectedQuizzes.length > 0 && (
          <div className="admin-learning-selection-bar">
            <div>
              <strong>{selectedQuizzes.length} Quiz đã chọn</strong>
              <span>{selectedDrafts.length} bản nháp có thể xuất bản</span>
            </div>
            <div>
              <button
                className="admin-button admin-button--primary"
                disabled={!selectedDrafts.length || bulkBusy}
                onClick={publishSelected}
                type="button"
              >
                {bulkBusy ? 'Đang xử lý…' : `Xuất bản đã chọn (${selectedDrafts.length})`}
              </button>
              <button
                className="admin-button admin-button--secondary"
                disabled={!selectedPublished.length || bulkBusy}
                onClick={unpublishSelected}
                type="button"
              >
                {bulkBusy
                  ? 'Đang xử lý…'
                  : `Gỡ xuất bản đã chọn (${selectedPublished.length})`}
              </button>
              <button
                className="admin-button admin-button--danger"
                disabled={bulkBusy}
                onClick={() => setConfirmDelete(selectedQuizzes)}
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
          <AdminSkeletonRows count={4} />
        ) : visible.length ? (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table admin-learning-table">
                <thead>
                  <tr>
                    <th className="admin-learning-select-cell">
                      <input
                        aria-label="Chọn tất cả Quiz trên trang hiện tại"
                        checked={allPageSelected}
                        onChange={toggleCurrentPage}
                        type="checkbox"
                      />
                    </th>
                    <th>Quiz</th>
                    <th>Câu hỏi</th>
                    <th>Điểm đạt</th>
                    <th>Trạng thái</th>
                    <th>
                      <span className="admin-sr-only">Thao tác</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pagedQuizzes.map((quiz) => (
                    <tr
                      className={selectedIds.has(quiz.id) ? 'is-selected' : ''}
                      key={quiz.id}
                    >
                      <td className="admin-learning-select-cell">
                        <input
                          aria-label={`Chọn ${quiz.title}`}
                          checked={selectedIds.has(quiz.id)}
                          onChange={() => toggleSelected(quiz.id)}
                          type="checkbox"
                        />
                      </td>
                      <td>
                        <strong>{quiz.title}</strong>
                        <small>{lessonNames.get(quiz.lessonId) || 'Bài học Quiz'}</small>
                      </td>
                      <td>{quiz.questionCount}</td>
                      <td>{quiz.passingScore}%</td>
                      <td>
                        <span className={`admin-learning-badge is-${quiz.status}`}>
                          {quiz.status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}
                        </span>
                      </td>
                      <td className="admin-learning-actions">
                        <button
                          className="admin-icon-button"
                          aria-label={`Sửa ${quiz.title}`}
                          onClick={() => openQuiz(quiz.id)}
                          type="button"
                        >
                          <AdminIcon name="edit" size={16} />
                        </button>
                        <button
                          className="admin-icon-button admin-icon-button--danger"
                          aria-label={`Xóa ${quiz.title}`}
                          disabled={bulkBusy}
                          onClick={() => setConfirmDelete([quiz])}
                          type="button"
                        >
                          <AdminIcon name="trash" size={16} />
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
          <AdminEmpty title="Chưa có Quiz">
            Tạo Quiz nháp cho một bài học loại Quiz để bắt đầu.
          </AdminEmpty>
        )}
      </section>
      <AdminConfirmDialog
        confirmLabel={
          confirmDelete?.length > 1 ? `Xóa ${confirmDelete.length} Quiz` : 'Xóa Quiz'
        }
        description={
          confirmDelete?.length > 1
            ? 'Quiz đã xuất bản, còn câu hỏi hoặc có lịch sử làm bài sẽ được backend bảo vệ. Các Quiz hợp lệ khác vẫn tiếp tục được xử lý.'
            : `Bạn sắp xóa “${confirmDelete?.[0]?.title || ''}”. Backend sẽ chặn nếu Quiz đang xuất bản, còn câu hỏi hoặc có lượt làm bài.`
        }
        loading={bulkBusy}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={confirmQuizDeletion}
        open={Boolean(confirmDelete?.length)}
        title="Xác nhận xóa Quiz?"
      />
    </div>
  );
}
