import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createAdminLearning,
  deleteAdminLearning,
  listAdminLearning,
  updateAdminLearning,
} from '../../../services/adminService.js';
import { AdminAlert, AdminEmpty, AdminSkeletonRows } from './AdminFeedback.jsx';
import AdminIcon from './AdminIcon.jsx';
import AdminPageHeader from './AdminPageHeader.jsx';

const SECTION_COPY = {
  courses: {
    title: 'Khóa học',
    description: 'Quản lý thông tin, thứ tự và trạng thái xuất bản của khóa học.',
    singular: 'khóa học',
  },
  units: {
    title: 'Chương học',
    description: 'Tổ chức các chương theo đúng thứ tự trong từng khóa học.',
    singular: 'chương học',
  },
  lessons: {
    title: 'Bài học',
    description: 'Biên soạn bài học và kiểm soát nội dung được xuất bản công khai.',
    singular: 'bài học',
  },
};

const LESSON_TYPES = [
  ['vocabulary', 'Từ vựng'],
  ['grammar', 'Ngữ pháp'],
  ['character', 'Hán tự'],
  ['listening', 'Luyện nghe'],
  ['reading', 'Đọc hiểu'],
  ['practice', 'Luyện tập'],
  ['quiz', 'Quiz'],
];

function emptyForm(section, parents) {
  if (section === 'courses') {
    return {
      title: '',
      slug: '',
      description: '',
      thumbnail: '',
      level: '',
      estimatedDuration: '',
      status: 'draft',
      order: '0',
    };
  }
  if (section === 'units') {
    return {
      courseId: parents.courses[0]?.id || '',
      title: '',
      description: '',
      order: '0',
    };
  }
  return {
    unitId: parents.units[0]?.id || '',
    title: '',
    slug: '',
    description: '',
    content: '',
    type: 'vocabulary',
    duration: '',
    order: '0',
    status: 'draft',
  };
}

function payloadFor(section, form) {
  const payload = Object.fromEntries(
    Object.entries(form).filter(([key]) => key !== 'id'),
  );
  payload.order = Number(form.order);
  if (section === 'courses') {
    payload.estimatedDuration =
      form.estimatedDuration === '' ? undefined : Number(form.estimatedDuration);
  }
  if (section === 'lessons') {
    payload.duration = form.duration === '' ? undefined : Number(form.duration);
  }
  Object.keys(payload).forEach(
    (key) => payload[key] === undefined && delete payload[key],
  );
  return payload;
}

function LearningForm({ form, onCancel, onChange, onSubmit, parents, saving, section }) {
  const input = (name, label, options = {}) => (
    <label
      className={`admin-form-field${options.full ? ' admin-learning-field--full' : ''}`}
    >
      <span>
        {label} {options.required && <b>*</b>}
      </span>
      {options.textarea ? (
        <textarea
          className={options.long ? 'admin-editor__long-copy' : undefined}
          name={name}
          onChange={onChange}
          required={options.required}
          value={form[name]}
        />
      ) : (
        <input
          min={options.min}
          name={name}
          onChange={onChange}
          required={options.required}
          type={options.type || 'text'}
          value={form[name]}
        />
      )}
    </label>
  );

  return (
    <form className="admin-form-section admin-learning-form" onSubmit={onSubmit}>
      <div className="admin-form-section__heading">
        <span>
          <AdminIcon name="edit" size={16} />
        </span>
        <div>
          <h3>
            {form.id ? 'Chỉnh sửa' : 'Tạo mới'} {SECTION_COPY[section].singular}
          </h3>
          <p>Các trường bắt buộc được kiểm tra lại tại API.</p>
        </div>
      </div>
      <div className="admin-form-grid">
        {section === 'units' && (
          <label className="admin-form-field">
            <span>
              Khóa học <b>*</b>
            </span>
            <select name="courseId" onChange={onChange} required value={form.courseId}>
              <option value="">Chọn khóa học</option>
              {parents.courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </label>
        )}
        {section === 'lessons' && (
          <label className="admin-form-field">
            <span>
              Chương học <b>*</b>
            </span>
            <select name="unitId" onChange={onChange} required value={form.unitId}>
              <option value="">Chọn chương học</option>
              {parents.units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.title}
                </option>
              ))}
            </select>
          </label>
        )}
        {input('title', 'Tiêu đề', { required: true })}
        {(section === 'courses' || section === 'lessons') && input('slug', 'Slug')}
        {section === 'courses' && input('level', 'Cấp độ', { required: true })}
        {section === 'courses' && input('thumbnail', 'URL ảnh đại diện')}
        {section === 'courses' &&
          input('estimatedDuration', 'Thời lượng dự kiến (phút)', {
            type: 'number',
            min: 0,
          })}
        {section === 'lessons' &&
          input('duration', 'Thời lượng (phút)', { type: 'number', min: 0 })}
        {(section === 'courses' || section === 'lessons') && (
          <label className="admin-form-field">
            <span>
              Trạng thái <b>*</b>
            </span>
            <select name="status" onChange={onChange} value={form.status}>
              <option value="draft">Bản nháp</option>
              <option value="published">Đã xuất bản</option>
            </select>
          </label>
        )}
        {section === 'lessons' && (
          <label className="admin-form-field">
            <span>
              Loại bài học <b>*</b>
            </span>
            <select name="type" onChange={onChange} value={form.type}>
              {LESSON_TYPES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        )}
        {input('order', 'Thứ tự', { required: true, type: 'number', min: 0 })}
        {input('description', 'Mô tả', {
          textarea: true,
          full: true,
          required: section === 'courses',
        })}
        {section === 'lessons' &&
          input('content', 'Nội dung bài học', {
            textarea: true,
            long: true,
            full: true,
            required: true,
          })}
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
          {saving ? 'Đang lưu…' : 'Lưu nội dung'}
        </button>
      </div>
    </form>
  );
}

export default function AdminLearningPanel({ onNotify, onUnauthorized, section }) {
  const copy = SECTION_COPY[section];
  const [items, setItems] = useState([]);
  const [parents, setParents] = useState({ courses: [], units: [] });
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setStatus('loading');
    setError('');
    try {
      const [current, courses, units] = await Promise.all([
        listAdminLearning(section),
        section === 'courses'
          ? Promise.resolve({ data: [] })
          : listAdminLearning('courses'),
        section === 'lessons'
          ? listAdminLearning('units')
          : Promise.resolve({ data: [] }),
      ]);
      setItems(current.data || []);
      setParents({ courses: courses.data || [], units: units.data || [] });
      setStatus('ready');
    } catch (requestError) {
      if (onUnauthorized(requestError)) return;
      setError(requestError.message);
      setStatus('error');
    }
  }, [onUnauthorized, section]);

  useEffect(() => {
    load();
  }, [load]);

  const visibleItems = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi');
    if (!query) return items;
    return items.filter((item) =>
      `${item.title} ${item.slug || ''}`.toLocaleLowerCase('vi').includes(query),
    );
  }, [items, search]);
  const courseNames = useMemo(
    () => new Map(parents.courses.map((item) => [item.id, item.title])),
    [parents.courses],
  );
  const unitNames = useMemo(
    () => new Map(parents.units.map((item) => [item.id, item.title])),
    [parents.units],
  );

  function beginCreate() {
    setForm(emptyForm(section, parents));
  }

  function beginEdit(item) {
    const next = emptyForm(section, parents);
    Object.keys(next).forEach((key) => {
      if (item[key] != null) next[key] = String(item[key]);
    });
    setForm({ ...next, id: item.id });
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (form.id) await updateAdminLearning(section, form.id, payloadFor(section, form));
      else await createAdminLearning(section, payloadFor(section, form));
      onNotify(`Đã lưu ${copy.singular}.`);
      setForm(null);
      await load();
    } catch (requestError) {
      if (onUnauthorized(requestError)) return;
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(item) {
    if (!window.confirm(`Xóa “${item.title}”? Thao tác này không thể hoàn tác.`)) return;
    try {
      await deleteAdminLearning(section, item.id);
      onNotify(`Đã xóa ${copy.singular}.`);
      await load();
    } catch (requestError) {
      if (onUnauthorized(requestError)) return;
      setError(requestError.message);
    }
  }

  const cannotCreate =
    (section === 'units' && !parents.courses.length) ||
    (section === 'lessons' && !parents.units.length);

  return (
    <div className="admin-learning-page">
      <AdminPageHeader
        action={
          <button
            className="admin-button admin-button--primary"
            disabled={cannotCreate}
            onClick={beginCreate}
            type="button"
          >
            <AdminIcon name="plus" size={17} /> Tạo {copy.singular}
          </button>
        }
        description={copy.description}
        eyebrow="Learning content"
        title={copy.title}
      />

      {error && (
        <AdminAlert onRetry={status === 'error' ? load : undefined}>{error}</AdminAlert>
      )}
      {form && (
        <LearningForm
          form={form}
          onCancel={() => setForm(null)}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              [event.target.name]: event.target.value,
            }))
          }
          onSubmit={submit}
          parents={parents}
          saving={saving}
          section={section}
        />
      )}

      <section className="admin-panel admin-learning-list">
        <div className="admin-learning-toolbar">
          <label>
            <span className="admin-sr-only">Tìm kiếm</span>
            <AdminIcon name="search" size={18} />
            <input
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`Tìm trong ${copy.title.toLowerCase()}…`}
              type="search"
              value={search}
            />
          </label>
        </div>
        {status === 'loading' && <AdminSkeletonRows />}
        {status === 'ready' && visibleItems.length === 0 && (
          <AdminEmpty title={`Chưa có ${copy.singular}`}>
            Tạo nội dung đầu tiên khi bạn đã sẵn sàng.
          </AdminEmpty>
        )}
        {status === 'ready' && visibleItems.length > 0 && (
          <div className="admin-table-wrap">
            <table className="admin-table admin-learning-table">
              <thead>
                <tr>
                  <th>Tiêu đề</th>
                  <th>Thuộc</th>
                  <th>Trạng thái / loại</th>
                  <th>Thứ tự</th>
                  <th className="admin-table__actions-heading">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.title}</strong>
                      {item.slug && <small>{item.slug}</small>}
                    </td>
                    <td>
                      {section === 'units'
                        ? courseNames.get(item.courseId)
                        : section === 'lessons'
                          ? unitNames.get(item.unitId)
                          : item.level}
                    </td>
                    <td>
                      <span
                        className={`admin-learning-badge is-${item.status || item.type}`}
                      >
                        {item.status || item.type || '—'}
                      </span>
                    </td>
                    <td>{item.order}</td>
                    <td className="admin-learning-actions">
                      <button
                        className="admin-button admin-button--secondary"
                        onClick={() => beginEdit(item)}
                        type="button"
                      >
                        Sửa
                      </button>
                      <button
                        className="admin-button admin-button--danger"
                        onClick={() => remove(item)}
                        type="button"
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
