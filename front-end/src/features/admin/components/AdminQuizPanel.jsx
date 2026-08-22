import { useCallback, useEffect, useMemo, useState } from 'react';
import { listAdminLearning } from '../../../services/adminService.js';
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
import { AdminAlert, AdminEmpty, AdminSkeletonRows } from './AdminFeedback.jsx';
import AdminIcon from './AdminIcon.jsx';
import AdminPageHeader from './AdminPageHeader.jsx';
import AdminPagination from './AdminPagination.jsx';
import AdminQuestionEditor from './AdminQuestionEditor.jsx';
import AdminQuizForm from './AdminQuizForm.jsx';

const PAGE_SIZE = 10;
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
  const [selected, setSelected] = useState(null);
  const [quizForm, setQuizForm] = useState(null);
  const [questionForm, setQuestionForm] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setStatus('loading');
    setError('');
    try {
      const [quizResponse, lessonResponse] = await Promise.all([
        listAdminQuizzes(),
        listAdminLearning('lessons'),
      ]);
      setQuizzes(quizResponse.data || []);
      setAllLessons(lessonResponse.data || []);
      setStatus('ready');
    } catch (caught) {
      if (caught.status === 401) onUnauthorized();
      setError(caught.message);
      setStatus('error');
    }
  }, [onUnauthorized]);

  useEffect(() => { load(); }, [load]);

  const lessons = useMemo(() => allLessons.filter((lesson) => lesson.type === 'quiz'), [allLessons]);
  const lessonNames = useMemo(() => new Map(allLessons.map((lesson) => [lesson.id, lesson.title])), [allLessons]);
  const visible = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase('vi');
    return quizzes.filter((quiz) => {
      const lessonTitle = lessonNames.get(quiz.lessonId) || '';
      const haystack = `${quiz.title || ''} ${quiz.description || ''} ${lessonTitle} ${quiz.passingScore ?? ''} ${quiz.status || ''}`.toLocaleLowerCase('vi');
      const matchesSearch = !normalized || haystack.includes(normalized);
      const matchesStatus = !statusFilter || quiz.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [quizzes, search, statusFilter, lessonNames]);
  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedQuizzes = visible.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function updateSearch(value) { setSearch(value); setPage(1); }
  function updateStatusFilter(value) { setStatusFilter(value); setPage(1); }

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

  async function removeQuiz(quiz) {
    if (!window.confirm(`Xóa Quiz “${quiz.title}”?`)) return;
    try {
      await deleteAdminQuiz(quiz.id);
      onNotify('Đã xóa Quiz.');
      setSelected(null);
      setQuizForm(null);
      await load();
    } catch (caught) {
      if (caught.status === 401) onUnauthorized();
      setError(caught.message);
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
          <button className="admin-button admin-button--primary" disabled={!lessons.length} onClick={beginCreate} type="button">
            <AdminIcon name="plus" size={17} /> Tạo Quiz
          </button>
        }
        description="Tạo Quiz theo bài học loại Quiz, xây câu hỏi và kiểm tra cấu trúc trước khi xuất bản."
        eyebrow="Learning content"
        title="Quiz"
      />
      {status === 'ready' && allLessons.length > 0 && !lessons.length && (
        <AdminAlert>
          Bạn đã có bài học nhưng chưa có bài nào mang loại “Quiz”. Vào Bài học, sửa một bài và chọn Loại bài học = Quiz; sau đó quay lại đây để tạo Quiz cho bài đó.
        </AdminAlert>
      )}
      {status === 'ready' && !allLessons.length && (
        <AdminAlert>Bạn cần tạo Course → Unit → Lesson trước, sau đó đặt Lesson đó thành loại Quiz.</AdminAlert>
      )}
      {error && <AdminAlert onRetry={status === 'error' ? load : undefined}>{error}</AdminAlert>}
      {quizForm && <AdminQuizForm form={quizForm} lessons={lessons} onCancel={() => { setQuizForm(null); setSelected(null); setQuestionForm(null); }} onChange={(event) => setQuizForm((current) => ({ ...current, [event.target.name]: event.target.value }))} onSubmit={saveQuiz} saving={saving} />}
      {selected && (
        <section className="admin-panel admin-quiz-builder">
          <header><div><p className="admin-eyebrow">Question builder</p><h3>{selected.title}</h3><span>{selected.questions.length} câu hỏi · Điểm đạt {selected.passingScore}%</span></div><button className="admin-button admin-button--secondary" onClick={() => setQuestionForm({})} type="button"><AdminIcon name="plus" size={15} /> Thêm câu hỏi</button></header>
          {questionForm && <AdminQuestionEditor onCancel={() => setQuestionForm(null)} onSave={saveQuestion} question={questionForm.id ? questionForm : null} saving={saving} />}
          <div className="admin-quiz-questions">
            {selected.questions.map((question) => <article key={question.id}><span>{question.order}</span><div><strong>{question.question}</strong><small>{question.type} · {question.points} điểm</small></div><div className="admin-learning-actions"><button className="admin-icon-button" aria-label="Sửa câu hỏi" onClick={() => setQuestionForm(question)} type="button"><AdminIcon name="edit" size={16} /></button><button className="admin-icon-button admin-icon-button--danger" aria-label="Xóa câu hỏi" onClick={() => removeQuestion(question)} type="button"><AdminIcon name="trash" size={16} /></button></div></article>)}
            {!selected.questions.length && <AdminEmpty title="Quiz chưa có câu hỏi">Hãy thêm ít nhất một câu hỏi hợp lệ trước khi xuất bản.</AdminEmpty>}
          </div>
        </section>
      )}
      <section className="admin-panel admin-learning-list">
        <div className="admin-learning-toolbar">
          <label><AdminIcon name="search" size={18} /><span className="admin-sr-only">Tìm Quiz</span><input onChange={(event) => updateSearch(event.target.value)} placeholder="Tìm tiêu đề, mô tả, bài học, điểm đạt…" type="search" value={search} /></label>
          <select aria-label="Lọc trạng thái Quiz" onChange={(event) => updateStatusFilter(event.target.value)} value={statusFilter}><option value="">Tất cả trạng thái</option><option value="draft">Bản nháp</option><option value="published">Đã xuất bản</option></select>
        </div>
        {status === 'loading' ? <AdminSkeletonRows count={4} /> : visible.length ? (
          <>
            <div className="admin-table-wrap"><table className="admin-table admin-learning-table"><thead><tr><th>Quiz</th><th>Câu hỏi</th><th>Điểm đạt</th><th>Trạng thái</th><th><span className="admin-sr-only">Thao tác</span></th></tr></thead><tbody>{pagedQuizzes.map((quiz) => <tr key={quiz.id}><td><strong>{quiz.title}</strong><small>{lessonNames.get(quiz.lessonId) || 'Bài học Quiz'}</small></td><td>{quiz.questionCount}</td><td>{quiz.passingScore}%</td><td><span className={`admin-learning-badge is-${quiz.status}`}>{quiz.status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}</span></td><td className="admin-learning-actions"><button className="admin-icon-button" aria-label={`Sửa ${quiz.title}`} onClick={() => openQuiz(quiz.id)} type="button"><AdminIcon name="edit" size={16} /></button><button className="admin-icon-button admin-icon-button--danger" aria-label={`Xóa ${quiz.title}`} onClick={() => removeQuiz(quiz)} type="button"><AdminIcon name="trash" size={16} /></button></td></tr>)}</tbody></table></div>
            <AdminPagination onPageChange={setPage} pagination={{ page: safePage, pageSize: PAGE_SIZE, total: visible.length, totalPages }} />
          </>
        ) : <AdminEmpty title="Chưa có Quiz">Tạo Quiz nháp cho một bài học loại Quiz để bắt đầu.</AdminEmpty>}
      </section>
    </div>
  );
}
