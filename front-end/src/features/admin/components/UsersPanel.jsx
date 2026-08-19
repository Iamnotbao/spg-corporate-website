import { useEffect, useMemo, useState } from 'react';
import {
  createAdminUser,
  deleteAdminUser,
  listAdminUsers,
  updateAdminUser,
} from '../../../services/adminService.js';
import AdminIcon from './AdminIcon.jsx';
import { AdminAlert } from './AdminFeedback.jsx';

const EMPTY_FORM = {
  username: '',
  displayName: '',
  password: '',
  role: 'employee',
  active: true,
};

function UserForm({ editing, form, loading, onCancel, onChange, onSubmit }) {
  return (
    <form className="admin-user-form" onSubmit={onSubmit}>
      <div className="admin-user-form__heading">
        <div>
          <p className="admin-eyebrow">Tài khoản</p>
          <h3>{editing ? 'Chỉnh sửa người dùng' : 'Tạo người dùng mới'}</h3>
        </div>
        {editing && (
          <button className="admin-icon-button" onClick={onCancel} type="button" aria-label="Hủy chỉnh sửa">
            <AdminIcon name="close" size={18} />
          </button>
        )}
      </div>

      <div className="admin-user-form__grid">
        <label className="admin-form-field">
          <span>Tên đăng nhập</span>
          <input
            disabled={editing || loading}
            minLength={3}
            onChange={(event) => onChange('username', event.target.value)}
            placeholder="employee01"
            required={!editing}
            value={form.username}
          />
        </label>
        <label className="admin-form-field">
          <span>Tên hiển thị</span>
          <input
            disabled={loading}
            onChange={(event) => onChange('displayName', event.target.value)}
            placeholder="Nguyễn Văn A"
            value={form.displayName}
          />
        </label>
        <label className="admin-form-field">
          <span>{editing ? 'Mật khẩu mới' : 'Mật khẩu'}</span>
          <input
            autoComplete="new-password"
            disabled={loading}
            minLength={8}
            onChange={(event) => onChange('password', event.target.value)}
            placeholder={editing ? 'Để trống nếu không đổi' : 'Tối thiểu 8 ký tự'}
            required={!editing}
            type="password"
            value={form.password}
          />
        </label>
        <label className="admin-form-field">
          <span>Quyền</span>
          <select
            disabled={loading}
            onChange={(event) => onChange('role', event.target.value)}
            value={form.role}
          >
            <option value="employee">Employee</option>
            <option value="admin">Admin</option>
          </select>
        </label>
      </div>

      <label className="admin-switch-field admin-user-form__switch">
        <input
          checked={form.active !== false}
          disabled={loading}
          onChange={(event) => onChange('active', event.target.checked)}
          type="checkbox"
        />
        <span className="admin-switch-field__control" />
        <span>
          <strong>Tài khoản hoạt động</strong>
          <small>Tắt để chặn đăng nhập mà không cần xóa tài khoản.</small>
        </span>
      </label>

      <div className="admin-user-form__actions">
        {editing && (
          <button className="admin-button admin-button--secondary" disabled={loading} onClick={onCancel} type="button">
            Hủy
          </button>
        )}
        <button className="admin-button admin-button--primary" disabled={loading} type="submit">
          {loading && <span className="admin-spinner" />}
          {editing ? 'Lưu thay đổi' : 'Tạo tài khoản'}
        </button>
      </div>
    </form>
  );
}

export default function UsersPanel({ currentUser, onNotify, onUnauthorized }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);

  const editingUser = useMemo(
    () => users.find((user) => user.id === editingId) || null,
    [editingId, users],
  );

  async function load() {
    setLoading(true);
    setError('');
    try {
      const payload = await listAdminUsers();
      setUsers(payload?.data || []);
    } catch (requestError) {
      if (onUnauthorized(requestError)) return;
      setError(requestError?.message || 'Không thể tải danh sách người dùng.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function beginEdit(user) {
    setEditingId(user.id);
    setForm({
      username: user.username,
      displayName: user.displayName || '',
      password: '',
      role: user.role,
      active: user.active !== false,
    });
    setError('');
  }

  function resetForm() {
    setEditingId('');
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingUser) {
        const payload = {
          displayName: form.displayName,
          role: form.role,
          active: form.active,
          ...(form.password ? { password: form.password } : {}),
        };
        await updateAdminUser(editingUser.id, payload);
        onNotify('Đã cập nhật tài khoản.');
      } else {
        await createAdminUser(form);
        onNotify('Đã tạo tài khoản mới.');
      }
      resetForm();
      await load();
    } catch (requestError) {
      if (onUnauthorized(requestError)) return;
      setError(requestError?.message || 'Không thể lưu tài khoản.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(user) {
    if (!window.confirm(`Xóa tài khoản “${user.username}”?`)) return;
    setError('');
    try {
      await deleteAdminUser(user.id);
      onNotify('Đã xóa tài khoản.');
      await load();
    } catch (requestError) {
      if (onUnauthorized(requestError)) return;
      setError(requestError?.message || 'Không thể xóa tài khoản.');
    }
  }

  return (
    <section className="admin-panel admin-users-panel">
      <div className="admin-panel__heading">
        <div>
          <h2>Quản lý người dùng</h2>
          <p>Admin quản lý tài khoản và phân quyền truy cập khu vực quản trị.</p>
        </div>
        <button className="admin-button admin-button--secondary" disabled={loading} onClick={load} type="button">
          <AdminIcon name="refresh" size={17} /> Làm mới
        </button>
      </div>

      {error && <AdminAlert>{error}</AdminAlert>}

      <div className="admin-users-layout">
        <div className="admin-users-list">
          <div className="admin-users-list__head">
            <span>Tài khoản</span><span>Quyền</span><span>Trạng thái</span><span />
          </div>
          {loading ? (
            <div className="admin-users-empty"><span className="admin-spinner" /> Đang tải người dùng…</div>
          ) : users.length ? (
            users.map((user) => (
              <article className={`admin-user-row${editingId === user.id ? ' is-editing' : ''}`} key={user.id}>
                <div>
                  <strong>{user.displayName || user.username}</strong>
                  <small>@{user.username}{user.id === currentUser?.id ? ' · Bạn' : ''}</small>
                </div>
                <span className={`admin-user-role admin-user-role--${user.role}`}>{user.role}</span>
                <span className={`admin-user-status${user.active ? ' is-active' : ''}`}>
                  <i /> {user.active ? 'Hoạt động' : 'Đã khóa'}
                </span>
                <div className="admin-user-row__actions">
                  <button className="admin-icon-button" onClick={() => beginEdit(user)} type="button" aria-label={`Sửa ${user.username}`}>
                    <AdminIcon name="edit" size={17} />
                  </button>
                  <button className="admin-icon-button" disabled={user.id === currentUser?.id} onClick={() => handleDelete(user)} type="button" aria-label={`Xóa ${user.username}`}>
                    <AdminIcon name="trash" size={17} />
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="admin-users-empty">Chưa có tài khoản nào.</div>
          )}
        </div>

        <UserForm
          editing={Boolean(editingUser)}
          form={form}
          loading={saving}
          onCancel={resetForm}
          onChange={updateField}
          onSubmit={handleSubmit}
        />
      </div>
    </section>
  );
}
