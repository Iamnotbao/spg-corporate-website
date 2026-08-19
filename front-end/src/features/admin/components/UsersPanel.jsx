import { useCallback, useEffect, useMemo, useState } from 'react';
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

export default function UsersPanel({ currentUser, onNotify, onUnauthorized }) {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
  const [filters, setFilters] = useState({ search: '', role: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);

  const editingUser = useMemo(
    () => users.find((user) => user.id === editingId) || null,
    [editingId, users],
  );

  const load = useCallback(async (page = pagination.page) => {
    setLoading(true);
    setError('');
    try {
      const payload = await listAdminUsers({
        page,
        pageSize: pagination.pageSize,
        search: filters.search.trim(),
        role: filters.role,
      });
      setUsers(payload?.data || []);
      setPagination((current) => ({ ...current, ...(payload?.pagination || {}), page }));
    } catch (requestError) {
      if (onUnauthorized(requestError)) return;
      setError(requestError?.message || 'Không thể tải danh sách người dùng.');
    } finally {
      setLoading(false);
    }
  }, [filters.role, filters.search, onUnauthorized, pagination.page, pagination.pageSize]);

  useEffect(() => {
    const timer = window.setTimeout(() => load(1), 250);
    return () => window.clearTimeout(timer);
  }, [filters.search, filters.role, pagination.pageSize]);

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
        await updateAdminUser(editingUser.id, {
          displayName: form.displayName,
          role: form.role,
          active: form.active,
          ...(form.password ? { password: form.password } : {}),
        });
        onNotify('Đã cập nhật tài khoản.');
      } else {
        await createAdminUser(form);
        onNotify('Đã tạo tài khoản mới.');
      }
      resetForm();
      await load(editingUser ? pagination.page : 1);
    } catch (requestError) {
      if (onUnauthorized(requestError)) return;
      setError(requestError?.message || 'Không thể lưu tài khoản.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(user) {
    if (!window.confirm(`Xóa tài khoản “${user.username}”?`)) return;
    try {
      await deleteAdminUser(user.id);
      onNotify('Đã xóa tài khoản.');
      await load(pagination.page);
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
          <p>Tìm kiếm, phân trang, khóa tài khoản và phân quyền Admin / Employee.</p>
        </div>
        <button className="admin-button admin-button--secondary" disabled={loading} onClick={() => load()} type="button">
          <AdminIcon name="refresh" size={17} /> Làm mới
        </button>
      </div>

      {error && <AdminAlert>{error}</AdminAlert>}

      <div className="admin-users-toolbar">
        <label>
          <AdminIcon name="search" size={17} />
          <input
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            placeholder="Tìm tên đăng nhập hoặc tên hiển thị…"
            value={filters.search}
          />
        </label>
        <select
          onChange={(event) => setFilters((current) => ({ ...current, role: event.target.value }))}
          value={filters.role}
        >
          <option value="">Tất cả quyền</option>
          <option value="admin">Admin</option>
          <option value="employee">Employee</option>
        </select>
        <select
          aria-label="Số người dùng mỗi trang"
          onChange={(event) => setPagination((current) => ({ ...current, pageSize: Number(event.target.value), page: 1 }))}
          value={pagination.pageSize}
        >
          {[5, 10, 20, 50].map((size) => <option key={size} value={size}>{size}/trang</option>)}
        </select>
      </div>

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
                <span className={`admin-user-status${user.active ? ' is-active' : ''}`}><i /> {user.active ? 'Hoạt động' : 'Đã khóa'}</span>
                <div className="admin-user-row__actions">
                  <button className="admin-icon-button" onClick={() => beginEdit(user)} type="button" aria-label={`Sửa ${user.username}`}><AdminIcon name="edit" size={17} /></button>
                  <button className="admin-icon-button" disabled={user.id === currentUser?.id} onClick={() => handleDelete(user)} type="button" aria-label={`Xóa ${user.username}`}><AdminIcon name="trash" size={17} /></button>
                </div>
              </article>
            ))
          ) : <div className="admin-users-empty">Không tìm thấy tài khoản phù hợp.</div>}

          <div className="admin-users-pagination">
            <span>{pagination.total} tài khoản</span>
            <div>
              <button disabled={pagination.page <= 1 || loading} onClick={() => load(pagination.page - 1)} type="button">←</button>
              <strong>{pagination.page} / {pagination.totalPages}</strong>
              <button disabled={pagination.page >= pagination.totalPages || loading} onClick={() => load(pagination.page + 1)} type="button">→</button>
            </div>
          </div>
        </div>

        <form className="admin-user-form" onSubmit={handleSubmit}>
          <div className="admin-user-form__heading">
            <div><p className="admin-eyebrow">Tài khoản</p><h3>{editingUser ? 'Chỉnh sửa người dùng' : 'Tạo người dùng mới'}</h3></div>
            {editingUser && <button className="admin-icon-button" onClick={resetForm} type="button" aria-label="Hủy chỉnh sửa"><AdminIcon name="close" size={18} /></button>}
          </div>
          <div className="admin-user-form__grid">
            <label className="admin-form-field"><span>Tên đăng nhập</span><input disabled={Boolean(editingUser) || saving} minLength={3} onChange={(event) => updateField('username', event.target.value)} required={!editingUser} value={form.username} /></label>
            <label className="admin-form-field"><span>Tên hiển thị</span><input disabled={saving} onChange={(event) => updateField('displayName', event.target.value)} value={form.displayName} /></label>
            <label className="admin-form-field"><span>{editingUser ? 'Mật khẩu mới' : 'Mật khẩu'}</span><input autoComplete="new-password" disabled={saving} minLength={8} onChange={(event) => updateField('password', event.target.value)} required={!editingUser} type="password" value={form.password} /></label>
            <label className="admin-form-field"><span>Quyền</span><select disabled={saving} onChange={(event) => updateField('role', event.target.value)} value={form.role}><option value="employee">Employee</option><option value="admin">Admin</option></select></label>
          </div>
          <label className="admin-switch-field admin-user-form__switch">
            <input checked={form.active !== false} disabled={saving} onChange={(event) => updateField('active', event.target.checked)} type="checkbox" />
            <span className="admin-switch-field__control" />
            <span><strong>Tài khoản hoạt động</strong><small>Tắt để chặn đăng nhập mà không xóa tài khoản.</small></span>
          </label>
          <div className="admin-user-form__actions">
            {editingUser && <button className="admin-button admin-button--secondary" disabled={saving} onClick={resetForm} type="button">Hủy</button>}
            <button className="admin-button admin-button--primary" disabled={saving} type="submit">{saving && <span className="admin-spinner" />}{editingUser ? 'Lưu thay đổi' : 'Tạo tài khoản'}</button>
          </div>
        </form>
      </div>
    </section>
  );
}
