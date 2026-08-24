import AdminIcon from './AdminIcon.jsx';

export default function AdminCharacterForm({
  form,
  hskLevels,
  lessons,
  saving,
  setForm,
  submit,
}) {
  if (!form) return null;

  return (
    <form className="admin-form-section admin-learning-form" onSubmit={submit}>
      <div className="admin-form-section__heading">
        <span>
          <AdminIcon name="edit" size={16} />
        </span>
        <div>
          <h3>{form.id ? 'Chỉnh sửa Hán tự' : 'Tạo Hán tự'}</h3>
          <p>
            Nguồn nét tự động dùng chữ giản thể hoặc phồn thể, không cần nhập ID nội bộ.
          </p>
        </div>
      </div>
      <div className="admin-form-grid">
        <label className="admin-form-field">
          <span>Giản thể *</span>
          <input
            maxLength="2"
            required
            value={form.simplified}
            onChange={(event) => setForm({ ...form, simplified: event.target.value })}
          />
        </label>
        <label className="admin-form-field">
          <span>Phồn thể</span>
          <input
            maxLength="2"
            value={form.traditional}
            onChange={(event) => setForm({ ...form, traditional: event.target.value })}
          />
        </label>
        <label className="admin-form-field">
          <span>Pinyin *</span>
          <input
            required
            value={form.pinyin}
            onChange={(event) => setForm({ ...form, pinyin: event.target.value })}
          />
        </label>
        <label className="admin-form-field">
          <span>Nghĩa tiếng Việt *</span>
          <input
            required
            value={form.meaningVietnamese}
            onChange={(event) =>
              setForm({ ...form, meaningVietnamese: event.target.value })
            }
          />
        </label>
        <label className="admin-form-field">
          <span>Nghĩa tiếng Anh</span>
          <input
            value={form.meaningEnglish}
            onChange={(event) => setForm({ ...form, meaningEnglish: event.target.value })}
          />
        </label>
        <label className="admin-form-field">
          <span>Bộ thủ *</span>
          <input
            required
            value={form.radical}
            onChange={(event) => setForm({ ...form, radical: event.target.value })}
          />
        </label>
        <label className="admin-form-field">
          <span>Số nét *</span>
          <input
            max="64"
            min="1"
            required
            type="number"
            value={form.strokeCount}
            onChange={(event) => setForm({ ...form, strokeCount: event.target.value })}
          />
        </label>
        <label className="admin-form-field">
          <span>HSK *</span>
          <select
            value={form.hskLevel}
            onChange={(event) => setForm({ ...form, hskLevel: event.target.value })}
          >
            {hskLevels.map((level) => (
              <option key={level}>{level}</option>
            ))}
          </select>
        </label>
        <label className="admin-form-field">
          <span>Nguồn nét *</span>
          <select
            required
            value={form.strokeDataKey || form.simplified}
            onChange={(event) => setForm({ ...form, strokeDataKey: event.target.value })}
          >
            {form.strokeDataKey &&
              ![form.simplified, form.traditional].includes(form.strokeDataKey) && (
                <option value={form.strokeDataKey}>
                  {form.strokeDataKey} · nguồn hiện tại
                </option>
              )}
            <option value={form.simplified}>
              {form.simplified || 'Nhập chữ giản thể trước'}
            </option>
            {form.traditional && form.traditional !== form.simplified && (
              <option value={form.traditional}>{form.traditional} · phồn thể</option>
            )}
          </select>
          <small>
            Dữ liệu mở Hanzi Writer Data 2.0.1; backend đối chiếu số nét khi xuất bản.
          </small>
        </label>
        <label className="admin-form-field">
          <span>Lesson Hán tự (tùy chọn)</span>
          <select
            value={form.lessonId}
            onChange={(event) => setForm({ ...form, lessonId: event.target.value })}
          >
            <option value="">Không liên kết Lesson</option>
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
            onChange={(event) => setForm({ ...form, status: event.target.value })}
          >
            <option value="draft">Bản nháp</option>
            <option value="published">Đã xuất bản</option>
          </select>
        </label>
        <label className="admin-form-field admin-learning-field--full">
          <span>Ví dụ</span>
          <textarea
            rows="4"
            value={form.examplesText}
            onChange={(event) => setForm({ ...form, examplesText: event.target.value })}
            placeholder="学生 | xuéshēng | học sinh&#10;学习 | xuéxí | học tập"
          />
          <small>Mỗi dòng: Tiếng Trung | Pinyin | Nghĩa tiếng Việt. Tối đa 8 dòng.</small>
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
          {saving ? 'Đang lưu…' : 'Lưu Hán tự'}
        </button>
      </div>
    </form>
  );
}
