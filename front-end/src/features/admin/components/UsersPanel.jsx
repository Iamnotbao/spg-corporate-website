import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createAdminUser,
  deleteAdminUser,
  listAdminUsers,
  updateAdminUser,
} from '../../../services/adminService.js';
import { ADMIN_DEFAULT_PAGE_SIZE, PERMISSION_GROUPS } from '../constants.js';
import AdminIcon from './AdminIcon.jsx';
import { AdminAlert } from './AdminFeedback.jsx';
import AdminFilterToolbar from './AdminFilterToolbar.jsx';

const DEFAULT_EMPLOYEE_PERMISSIONS = [
  'posts.read', 'posts.create', 'posts.update', 'posts.import',
  'jobs.read', 'jobs.create', 'jobs.update', 'jobs.import',
];
const EMPTY_FORM = { username: '', displayName: '', password: '', role: 'student', permissions: [], active: true };
const PERMISSION_PAGE_SIZE = 3;

export default function UsersPanel({ currentUser, onNotify, onUnauthorized }) {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: ADMIN_DEFAULT_PAGE_SIZE, total: 0, totalPages: 1 });
  const [filters, setFilters] = useState({ search: '', role: '', from: '', to: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [permissionSearch, setPermissionSearch] = useState('');
  const [permissionPage, setPermissionPage] = useState(1);

  const editingUser = useMemo(() => users.find((user) => user.id === editingId) || null, [editingId, users]);
  const filteredPermissionGroups = useMemo(() => {
    const query = permissionSearch.trim().toLowerCase();
    if (!query) return PERMISSION_GROUPS;
    return PERMISSION_GROUPS.map(([group, permissions]) => [
      group,
      permissions.filter((permission) => group.toLowerCase().includes(query) || permission.toLowerCase().includes(query)),
    ]).filter(([, permissions]) => permissions.length);
  }, [permissionSearch]);
  const permissionTotalPages = Math.max(1, Math.ceil(filteredPermissionGroups.length / PERMISSION_PAGE_SIZE));
  const visiblePermissionGroups = filteredPermissionGroups.slice((permissionPage - 1) * PERMISSION_PAGE_SIZE, permissionPage * PERMISSION_PAGE_SIZE);

  useEffect(() => { setPermissionPage(1); }, [permissionSearch]);
  useEffect(() => { if (permissionPage > permissionTotalPages) setPermissionPage(permissionTotalPages); }, [permissionPage, permissionTotalPages]);

  const load = useCallback(async (page = pagination.page) => {
    setLoading(true); setError('');
    try {
      const payload = await listAdminUsers({ page, pageSize: pagination.pageSize, search: filters.search.trim(), role: filters.role, from: filters.from, to: filters.to });
      setUsers(payload?.data || []);
      setPagination((current) => ({ ...current, ...(payload?.pagination || {}), page }));
    } catch (requestError) {
      if (onUnauthorized(requestError)) return;
      setError(requestError?.message || 'Không thể tải danh sách người dùng.');
    } finally { setLoading(false); }
  }, [filters.from, filters.role, filters.search, filters.to, onUnauthorized, pagination.page, pagination.pageSize]);

  useEffect(() => {
    const timer = window.setTimeout(() => load(1), 250);
    return () => window.clearTimeout(timer);
  }, [filters.from, filters.search, filters.role, filters.to, pagination.pageSize]);

  function updateField(name, value) { setForm((current) => ({ ...current, [name]: value })); }
  function beginEdit(user) {
    setEditingId(user.id);
    setForm({ username: user.username, displayName: user.displayName || '', password: '', role: user.role, permissions: user.role === 'admin' ? ['*'] : (Array.isArray(user.permissions) ? user.permissions : DEFAULT_EMPLOYEE_PERMISSIONS), active: user.active !== false });
    setPermissionSearch(''); setPermissionPage(1); setError('');
  }
  function resetForm() { setEditingId(''); setForm(EMPTY_FORM); setPermissionSearch(''); setPermissionPage(1); }
  function togglePermission(permission) {
    if (form.role !== 'employee') return;
    setForm((current) => ({ ...current, permissions: current.permissions.includes(permission) ? current.permissions.filter((item) => item !== permission) : [...current.permissions, permission] }));
  }

  async function handleSubmit(event) {
    event.preventDefault(); setSaving(true); setError('');
    const payload = { ...form, permissions: form.role === 'admin' ? ['*'] : form.role === 'student' ? [] : form.permissions };
    try {
      if (editingUser) {
        await updateAdminUser(editingUser.id, { displayName: payload.displayName, role: payload.role, permissions: payload.permissions, active: payload.active, ...(payload.password ? { password: payload.password } : {}) });
        onNotify('Đã cập nhật tài khoản và quyền thao tác.');
      } else {
        await createAdminUser(payload); onNotify('Đã tạo tài khoản mới.');
      }
      resetForm(); await load(editingUser ? pagination.page : 1);
    } catch (requestError) {
      if (onUnauthorized(requestError)) return;
      setError(requestError?.message || 'Không thể lưu tài khoản.');
    } finally { setSaving(false); }
  }

  async function handleDelete(user) {
    if (!window.confirm(`Xóa tài khoản “${user.username}”?`)) return;
    try { await deleteAdminUser(user.id); onNotify('Đã xóa tài khoản.'); await load(pagination.page); }
    catch (requestError) { if (!onUnauthorized(requestError)) setError(requestError?.message || 'Không thể xóa tài khoản.'); }
  }

  return (
    <section className="admin-panel admin-users-panel">
      <div className="admin-panel__heading"><div><h2>Tài khoản</h2><p>Quản lý tài khoản Mandora. Employee chỉ còn là vai trò CMS tương thích cho tài khoản cũ.</p></div><button className="admin-button admin-button--secondary" disabled={loading} onClick={() => load()} type="button"><AdminIcon name="refresh" size={17} /> Làm mới</button></div>
      {error && <AdminAlert>{error}</AdminAlert>}

      <AdminFilterToolbar search={filters.search} onSearchChange={(search) => setFilters((current) => ({ ...current, search }))} searchPlaceholder="Tìm tên đăng nhập hoặc tên hiển thị…" filters={[{ key: 'role', label: 'Vai trò', value: filters.role, onChange: (role) => setFilters((current) => ({ ...current, role })), options: [{ value: '', label: 'Tất cả vai trò' }, { value: 'admin', label: 'Admin' }, { value: 'student', label: 'Student' }, { value: 'employee', label: 'Employee (cũ)' }] }]} from={filters.from} to={filters.to} onFromChange={(from) => setFilters((current) => ({ ...current, from }))} onToChange={(to) => setFilters((current) => ({ ...current, to }))} pageSize={pagination.pageSize} onPageSizeChange={(pageSize) => setPagination((current) => ({ ...current, pageSize, page: 1 }))} />

      <div className="admin-users-layout">
        <div className="admin-users-list"><div className="admin-users-list__head"><span>Tài khoản</span><span>Vai trò</span><span>Trạng thái</span><span /></div>{loading ? <div className="admin-users-empty"><span className="admin-spinner" /> Đang tải người dùng…</div> : users.length ? users.map((user) => <article className={`admin-user-row${editingId === user.id ? ' is-editing' : ''}`} key={user.id}><div><strong>{user.displayName || user.username}</strong><small>@{user.username}{user.id === currentUser?.id ? ' · Bạn' : ''} · {user.role === 'admin' ? 'Toàn quyền' : `${user.permissions?.length || 0} quyền`}</small></div><span className={`admin-user-role admin-user-role--${user.role}`}>{user.role}</span><span className={`admin-user-status${user.active ? ' is-active' : ''}`}><i /> {user.active ? 'Hoạt động' : 'Đã khóa'}</span><div className="admin-user-row__actions"><button className="admin-icon-button" onClick={() => beginEdit(user)} type="button" aria-label={`Sửa ${user.username}`}><AdminIcon name="edit" size={17} /></button><button className="admin-icon-button" disabled={user.id === currentUser?.id} onClick={() => handleDelete(user)} type="button" aria-label={`Xóa ${user.username}`}><AdminIcon name="trash" size={17} /></button></div></article>) : <div className="admin-users-empty">Không tìm thấy tài khoản phù hợp.</div>}<div className="admin-users-pagination"><span>{pagination.total} tài khoản</span><div><button disabled={pagination.page <= 1 || loading} onClick={() => load(pagination.page - 1)} type="button">←</button><strong>{pagination.page} / {pagination.totalPages}</strong><button disabled={pagination.page >= pagination.totalPages || loading} onClick={() => load(pagination.page + 1)} type="button">→</button></div></div></div>

        <form className="admin-user-form" onSubmit={handleSubmit}>
          <div className="admin-user-form__heading"><div><p className="admin-eyebrow">Tài khoản</p><h3>{editingUser ? 'Chỉnh sửa người dùng' : 'Tạo người dùng mới'}</h3></div>{editingUser && <button className="admin-icon-button" onClick={resetForm} type="button" aria-label="Hủy chỉnh sửa"><AdminIcon name="close" size={18} /></button>}</div>
          <div className="admin-user-form__grid"><label className="admin-form-field"><span>Tên đăng nhập</span><input disabled={Boolean(editingUser) || saving} minLength={3} onChange={(event) => updateField('username', event.target.value)} required={!editingUser} value={form.username} /></label><label className="admin-form-field"><span>Tên hiển thị</span><input disabled={saving} onChange={(event) => updateField('displayName', event.target.value)} value={form.displayName} /></label><label className="admin-form-field"><span>{editingUser ? 'Mật khẩu mới' : 'Mật khẩu'}</span><input autoComplete="new-password" disabled={saving} minLength={8} onChange={(event) => updateField('password', event.target.value)} required={!editingUser} type="password" value={form.password} /></label><label className="admin-form-field"><span>Vai trò</span><select disabled={saving} onChange={(event) => updateField('role', event.target.value)} value={form.role}>{editingUser?.role === 'employee' && <option value="employee">Employee (cũ)</option>}<option value="student">Student</option><option value="admin">Admin</option></select></label></div>

          <div className="admin-permission-editor">
            <div className="admin-permission-editor__heading"><div><strong>Mã quyền CMS cũ</strong><small>{form.role === 'admin' ? 'Admin luôn có toàn quyền.' : form.role === 'student' ? 'Student không có quyền quản trị.' : `Đã chọn ${form.permissions.length} quyền.`}</small></div><label><AdminIcon name="search" size={16} /><input disabled={form.role !== 'employee'} value={permissionSearch} onChange={(event) => setPermissionSearch(event.target.value)} placeholder="Tìm posts.update, media…" /></label></div>
            {visiblePermissionGroups.map(([group, permissions]) => <fieldset key={group} disabled={form.role !== 'employee' || saving}><legend>{group}</legend><div>{permissions.map((permission) => <label key={permission}><input type="checkbox" checked={form.role === 'admin' || form.permissions.includes(permission)} onChange={() => togglePermission(permission)} /><span>{permission}</span></label>)}</div></fieldset>)}
            {!visiblePermissionGroups.length && <div className="admin-permission-editor__empty">Không có mã quyền phù hợp.</div>}
            {filteredPermissionGroups.length > PERMISSION_PAGE_SIZE && <div className="admin-permission-editor__pagination"><button type="button" disabled={permissionPage <= 1} onClick={() => setPermissionPage((page) => page - 1)}>←</button><span>Nhóm {permissionPage}/{permissionTotalPages}</span><button type="button" disabled={permissionPage >= permissionTotalPages} onClick={() => setPermissionPage((page) => page + 1)}>→</button></div>}
          </div>

          <label className="admin-switch-field admin-user-form__switch"><input checked={form.active !== false} disabled={saving} onChange={(event) => updateField('active', event.target.checked)} type="checkbox" /><span className="admin-switch-field__control" /><span><strong>Tài khoản hoạt động</strong><small>Tắt để chặn đăng nhập mà không xóa tài khoản.</small></span></label>
          <div className="admin-user-form__actions">{editingUser && <button className="admin-button admin-button--secondary" disabled={saving} onClick={resetForm} type="button">Hủy</button>}<button className="admin-button admin-button--primary" disabled={saving} type="submit">{saving && <span className="admin-spinner" />}{editingUser ? 'Lưu thay đổi' : 'Tạo tài khoản'}</button></div>
        </form>
      </div>
    </section>
  );
}
