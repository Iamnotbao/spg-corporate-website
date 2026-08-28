import { useMemo, useState } from 'react';
import AdminIcon from './AdminIcon.jsx';

const LESSONS_PER_PAGE = 6;

function LessonPicker({ lessons, onChange, value }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const selected = lessons.find((lesson) => lesson.id === value);
  const filtered = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('vi');
    if (!needle) return lessons;
    return lessons.filter((lesson) =>
      `${lesson.title || ''} ${lesson.slug || ''}`.toLocaleLowerCase('vi').includes(needle),
    );
  }, [lessons, search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / LESSONS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice(
    (safePage - 1) * LESSONS_PER_PAGE,
    safePage * LESSONS_PER_PAGE,
  );

  function selectLesson(lesson) {
    onChange({ target: { name: 'lessonId', value: lesson.id } });
    setOpen(false);
  }

  return (
    <div className="admin-search-select">
      <button
        aria-expanded={open}
        className="admin-search-select__trigger"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span>{selected?.title || 'Chọn bài học'}</span>
        <span aria-hidden="true">⌄</span>
      </button>
      <input name="lessonId" readOnly required tabIndex="-1" value={value} className="admin-search-select__required" />
      {open && (
        <div className="admin-search-select__panel">
          <label className="admin-search-select__search">
            <AdminIcon name="search" size={15} />
            <input
              autoFocus
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Tìm tên hoặc slug bài học…"
              type="search"
              value={search}
            />
          </label>
          <div className="admin-search-select__options">
            {visible.map((lesson) => (
              <button
                className={lesson.id === value ? 'is-selected' : undefined}
                key={lesson.id}
                onClick={() => selectLesson(lesson)}
                type="button"
              >
                <strong>{lesson.title}</strong>
                {lesson.slug && <small>{lesson.slug}</small>}
              </button>
            ))}
            {!visible.length && <p>Không tìm thấy bài học phù hợp.</p>}
          </div>
          {totalPages > 1 && (
            <div className="admin-search-select__pagination">
              <button disabled={safePage === 1} onClick={() => setPage(safePage - 1)} type="button">
                ← Trước
              </button>
              <span>{safePage}/{totalPages}</span>
              <button disabled={safePage === totalPages} onClick={() => setPage(safePage + 1)} type="button">
                Sau →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminQuizForm({
  form,
  lessons,
  onCancel,
  onChange,
  onSubmit,
  saving,
}) {
  return (
    <form className="admin-form-section admin-learning-form admin-quiz-details-form" onSubmit={onSubmit}>
      <div className="admin-form-section__heading">
        <span>
          <AdminIcon name="quizzes" size={17} />
        </span>
        <div>
          <h3>{form.id ? 'Thông tin Quiz' : 'Tạo Quiz'}</h3>
          <p>Mỗi bài học loại Quiz chỉ có một Quiz trong V1.</p>
        </div>
      </div>
      <div className="admin-form-grid">
        <label className="admin-form-field">
          <span>
            Bài học Quiz <b>*</b>
          </span>
          <LessonPicker lessons={lessons} onChange={onChange} value={form.lessonId} />
        </label>
        <label className="admin-form-field">
          <span>
            Tiêu đề <b>*</b>
          </span>
          <input maxLength="160" name="title" onChange={onChange} required value={form.title} />
        </label>
        <label className="admin-form-field">
          <span>
            Điểm đạt (%) <b>*</b>
          </span>
          <input max="100" min="1" name="passingScore" onChange={onChange} required type="number" value={form.passingScore} />
        </label>
        <label className="admin-form-field">
          <span>
            Trạng thái <b>*</b>
          </span>
          <select name="status" onChange={onChange} value={form.status}>
            <option value="draft">Bản nháp</option>
            <option value="published">Đã xuất bản</option>
          </select>
        </label>
        <label className="admin-form-field admin-learning-field--full">
          <span>Mô tả</span>
          <textarea name="description" onChange={onChange} value={form.description} />
        </label>
      </div>
      <div className="admin-learning-form__actions">
        <button className="admin-button admin-button--secondary" onClick={onCancel} type="button">
          ← Quay lại
        </button>
        <button className="admin-button admin-button--primary" disabled={saving} type="submit">
          {saving ? 'Đang lưu…' : 'Lưu Quiz'}
        </button>
      </div>
    </form>
  );
}
