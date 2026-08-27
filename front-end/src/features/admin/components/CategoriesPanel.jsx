import { useCallback, useEffect, useState } from 'react';
import {
  createAdminCategory,
  deleteAdminCategory,
  listAdminCategories,
  updateAdminCategory,
} from '../../../services/categoryService.js';
import AdminIcon from './AdminIcon.jsx';
import { AdminAlert } from './AdminFeedback.jsx';
import { ADMIN_DEFAULT_PAGE_SIZE } from '../constants.js';

const EMPTY = { name: '', slug: '', description: '', order: 100, active: true };

function idOf(item) {
  return String(item?._id?.$oid || item?._id || item?.id || '');
}

export default function CategoriesPanel({ onNotify, onUnauthorized }) {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: ADMIN_DEFAULT_PAGE_SIZE, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const payload = await listAdminCategories({
        page,
        pageSize: pagination.pageSize,
        search: search.trim(),
      });
      setItems(payload?.data || []);
      setPagination((current) => ({ ...current, ...(payload?.pagination || {}), page }));
    } catch (requestError) {
      if (!onUnauthorized(requestError)) setError(requestError?.message || 'Không thể tải chuyên mục.');
    } finally {
      setLoading(false);
    }
  }, [onUnauthorized, pagination.pageSize, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => load(1), 250);
    return () => window.clearTimeout(timer);
  }, [search, pagination.pageSize]);

  function beginEdit(item) {
    setEditing(item);
    setForm({
      name: item.name || '',
      slug: item.slug || '',
      description: item.description || '',
      order: item.order || 100,
      active: item.active !== false,
    });
  }

  function reset() {
    setEditing(null);
    setForm(EMPTY);
    setError('');
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await updateAdminCategory(idOf(editing), form);
        onNotify('Đã cập nhật chuyên mục.');
      } else {
        await createAdminCategory(form);
        onNotify('Đã tạo chuyên mục.');
      }
      reset();
      await load(editing ? pagination.page : 1);
    } catch (requestError) {
      if (!onUnauthorized(requestError)) setError(requestError?.message || 'Không thể lưu chuyên mục.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(item) {
    if (!window.confirm(`Xóa chuyên mục “${item.name}”?`)) return;
    try {
      await deleteAdminCategory(idOf(item));
      onNotify('Đã xóa chuyên mục.');
      await load(pagination.page);
    } catch (requestError) {
      if (!onUnauthorized(requestError)) setError(requestError?.message || 'Không thể xóa chuyên mục.');
    }
  }

  return (
    <section className="admin-panel admin-categories">
      <div className="admin-panel__heading">
        <div>
          <h2>Chuyên mục Blog</h2>
          <p>Quản lý các chuyên mục dùng để phân loại bài viết Mandora.</p>
        </div>
      </div>
      {error && <AdminAlert>{error}</AdminAlert>}

      <div className="admin-categories__toolbar">
        <label><AdminIcon name="search" size={17} /><input placeholder="Tìm tên hoặc mã chuyên mục…" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        <select value={pagination.pageSize} onChange={(event) => setPagination((value) => ({ ...value, pageSize: Number(event.target.value) }))}>
          {[5, 10, 20, 50].map((size) => <option key={size} value={size}>{size}/trang</option>)}
        </select>
      </div>

      <div className="admin-categories__layout">
        <div className="admin-categories__list">
          {loading ? <p>Đang tải…</p> : items.map((item) => (
            <article key={idOf(item)}>
              <div><strong>{item.name}</strong><small>{item.slug}</small><p>{item.description || 'Không có mô tả'}</p></div>
              <span className={`admin-badge${item.active === false ? ' admin-badge--muted' : ''}`}>{item.active === false ? 'Đang ẩn' : 'Hoạt động'}</span>
              <span>#{item.order || 100}</span>
              <div className="admin-row-actions">
                <button type="button" onClick={() => beginEdit(item)} title="Sửa"><AdminIcon name="edit" size={17} /></button>
                <button type="button" className="is-danger" onClick={() => remove(item)} title="Xóa"><AdminIcon name="trash" size={17} /></button>
              </div>
            </article>
          ))}
          {!loading && !items.length && <p>Không tìm thấy chuyên mục.</p>}
          <div className="admin-categories__pagination">
            <span>{pagination.total} chuyên mục</span>
            <div><button type="button" disabled={pagination.page <= 1 || loading} onClick={() => load(pagination.page - 1)}>←</button><strong>{pagination.page}/{pagination.totalPages}</strong><button type="button" disabled={pagination.page >= pagination.totalPages || loading} onClick={() => load(pagination.page + 1)}>→</button></div>
          </div>
        </div>

        <form className="admin-categories__form" onSubmit={submit}>
          <div className="admin-form-section__heading"><span>+</span><div><h3>{editing ? 'Chỉnh sửa chuyên mục' : 'Thêm chuyên mục'}</h3><p>Mã slug được dùng làm khóa liên kết với bài viết.</p></div></div>
          <label className="admin-form-field"><span>Tên</span><input required value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} /></label>
          <label className="admin-form-field"><span>Mã slug</span><input placeholder="Tự sinh nếu để trống" value={form.slug} onChange={(e) => setForm((v) => ({ ...v, slug: e.target.value }))} /></label>
          <label className="admin-form-field"><span>Mô tả</span><textarea rows="4" value={form.description} onChange={(e) => setForm((v) => ({ ...v, description: e.target.value }))} /></label>
          <label className="admin-form-field"><span>Thứ tự</span><input min="1" type="number" value={form.order} onChange={(e) => setForm((v) => ({ ...v, order: Number(e.target.value) }))} /></label>
          <label className="admin-switch-field"><input type="checkbox" checked={form.active} onChange={(e) => setForm((v) => ({ ...v, active: e.target.checked }))} /><span className="admin-switch-field__control" /><span><strong>Hoạt động</strong><small>Chuyên mục ẩn sẽ không xuất hiện phía client.</small></span></label>
          <div className="admin-categories__actions">{editing && <button type="button" className="admin-button admin-button--secondary" onClick={reset}>Hủy</button>}<button className="admin-button admin-button--primary" disabled={saving} type="submit">{saving ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Thêm chuyên mục'}</button></div>
        </form>
      </div>
    </section>
  );
}
