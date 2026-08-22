import AdminIcon from './AdminIcon.jsx';

export default function AdminQuizForm({
  form,
  lessons,
  onCancel,
  onChange,
  onSubmit,
  saving,
}) {
  return (
    <form className="admin-form-section admin-learning-form" onSubmit={onSubmit}>
      <div className="admin-form-section__heading">
        <span>
          <AdminIcon name="quizzes" size={17} />
        </span>
        <div>
          <h3>{form.id ? 'Chỉnh sửa Quiz' : 'Tạo Quiz'}</h3>
          <p>Mỗi bài học loại Quiz chỉ có một Quiz trong V1.</p>
        </div>
      </div>
      <div className="admin-form-grid">
        <label className="admin-form-field">
          <span>
            Bài học Quiz <b>*</b>
          </span>
          <select name="lessonId" onChange={onChange} required value={form.lessonId}>
            <option value="">Chọn bài học</option>
            {lessons.map((lesson) => (
              <option key={lesson.id} value={lesson.id}>
                {lesson.title}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-form-field">
          <span>
            Tiêu đề <b>*</b>
          </span>
          <input
            maxLength="160"
            name="title"
            onChange={onChange}
            required
            value={form.title}
          />
        </label>
        <label className="admin-form-field">
          <span>
            Điểm đạt (%) <b>*</b>
          </span>
          <input
            max="100"
            min="1"
            name="passingScore"
            onChange={onChange}
            required
            type="number"
            value={form.passingScore}
          />
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
        <button
          className="admin-button admin-button--secondary"
          onClick={onCancel}
          type="button"
        >
          Hủy
        </button>
        <button
          className="admin-button admin-button--primary"
          disabled={saving}
          type="submit"
        >
          {saving ? 'Đang lưu…' : 'Lưu Quiz'}
        </button>
      </div>
    </form>
  );
}
