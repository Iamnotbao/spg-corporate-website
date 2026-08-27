import { useCallback, useEffect, useState } from 'react';
import {
  createAdminLanguage,
  deleteAdminLanguage,
  listAdminLanguages,
  updateAdminLanguage,
} from '../../../services/languageService.js';
import AdminIcon from './AdminIcon.jsx';
import { AdminAlert } from './AdminFeedback.jsx';
import { ADMIN_DEFAULT_PAGE_SIZE } from '../constants.js';

const EMPTY = {
  code: '',
  titleNameE: '',
  titleNameL: '',
  titleNameT: '',
  enabled: true,
  isDefault: false,
  sortOrder: 0,
};

function getId(item) {
  return String(item?._id?.$oid || item?._id || item?.id || '');
}

export default function LanguagesPanel({ onNotify, onUnauthorized }) {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: ADMIN_DEFAULT_PAGE_SIZE, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const payload = await listAdminLanguages({ page, pageSize: pagination.pageSize, search: search.trim() });
      setItems(payload?.data || []);
      setPagination((current) => ({ ...current, ...(payload?.pagination || {}), page }));
    } catch (requestError) {
      if (onUnauthorized(requestError)) return;
      setError(requestError?.message || 'Không thể tải danh sách ngôn ngữ.');
    } finally {
      setLoading(false);
    }
  }, [onUnauthorized, pagination.pageSize, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => load(1), 250);
    return () => window.clearTimeout(timer);
  }, [search, pagination.pageSize]);

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function resetForm() {
    setEditingId('');
    setForm(EMPTY);
  }

  function edit(item) {
    setEditingId(getId(item));
    setForm({
      code: item.code || '',
      titleNameE: item.titleNameE || '',
      titleNameL: item.titleNameL || '',
      titleNameT: item.titleNameT || '',
      enabled: item.enabled !== false,
      isDefault: item.isDefault === true,
      sortOrder: Number(item.sortOrder) || 0,
    });
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await updateAdminLanguage(editingId, form);
        onNotify('Đã cập nhật ngôn ngữ.');
      } else {
        await createAdminLanguage(form);
        onNotify('Đã thêm ngôn ngữ.');
      }
      resetForm();
      await load(editingId ? pagination.page : 1);
    } catch (requestError) {
      if (onUnauthorized(requestError)) return;
      setError(requestError?.message || 'Không thể lưu ngôn ngữ.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(item) {
    if (!window.confirm(`Xóa ngôn ngữ “${item.code}”?`)) return;
    try {
      await deleteAdminLanguage(getId(item));
      onNotify('Đã xóa ngôn ngữ.');
      await load(pagination.page);
    } catch (requestError) {
      if (onUnauthorized(requestError)) return;
      setError(requestError?.message || 'Không thể xóa ngôn ngữ.');
    }
  }

  return (
    <section className="admin-panel admin-languages">
      <div className="admin-panel__heading">
        <div>
          <h2>Quản lý ngôn ngữ</h2>
          <p>Quản lý mã code và tên hiển thị E / L / T dùng chung cho website.</p>
        </div>
      </div>

      {error && <AdminAlert>{error}</AdminAlert>}

      <div className="admin-languages__toolbar">
        <label>
          <AdminIcon name="search" size={17} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm mã hoặc tên ngôn ngữ…" />
        </label>
        <select value={pagination.pageSize} onChange={(event) => setPagination((current) => ({ ...current, pageSize: Number(event.target.value), page: 1 }))}>
          {[5, 10, 20, 50].map((size) => <option value={size} key={size}>{size}/trang</option>)}
        </select>
      </div>

      <div className="admin-languages__layout">
        <div className="admin-languages__list">
          {loading ? (
            <div className="admin-languages__empty"><span className="admin-spinner" /> Đang tải…</div>
          ) : items.length ? items.map((item) => (
            <article key={getId(item)}>
              <div>
                <strong>{item.code}</strong>
                <small>{item.titleNameL || item.titleNameE || item.titleNameT}</small>
                <p>E: {item.titleNameE || '—'} · L: {item.titleNameL || '—'} · T: {item.titleNameT || '—'}</p>
              </div>
              <span>{item.isDefault ? 'Mặc định' : item.enabled === false ? 'Đã tắt' : 'Hoạt động'}</span>
              <div>
                <button className="admin-icon-button" type="button" onClick={() => edit(item)} aria-label={`Sửa ${item.code}`}><AdminIcon name="edit" size={17} /></button>
                <button className="admin-icon-button" type="button" disabled={item.isDefault} onClick={() => remove(item)} aria-label={`Xóa ${item.code}`}><AdminIcon name="trash" size={17} /></button>
              </div>
            </article>
          )) : <div className="admin-languages__empty">Chưa có ngôn ngữ.</div>}
          <div className="admin-languages__pagination">
            <span>{pagination.total} ngôn ngữ</span>
            <div>
              <button type="button" disabled={pagination.page <= 1 || loading} onClick={() => load(pagination.page - 1)}>←</button>
              <strong>{pagination.page} / {pagination.totalPages}</strong>
              <button type="button" disabled={pagination.page >= pagination.totalPages || loading} onClick={() => load(pagination.page + 1)}>→</button>
            </div>
          </div>
        </div>

        <form className="admin-languages__form" onSubmit={submit}>
          <div><p className="admin-eyebrow">Language</p><h3>{editingId ? 'Chỉnh sửa' : 'Thêm ngôn ngữ'}</h3></div>
          <label className="admin-form-field"><span>Mã code</span><input required disabled={saving} placeholder="vi / en / zh-tw" value={form.code} onChange={(event) => updateField('code', event.target.value)} /></label>
          <label className="admin-form-field"><span>title_name_e</span><input disabled={saving} value={form.titleNameE} onChange={(event) => updateField('titleNameE', event.target.value)} /></label>
          <label className="admin-form-field"><span>title_name_l</span><input disabled={saving} value={form.titleNameL} onChange={(event) => updateField('titleNameL', event.target.value)} /></label>
          <label className="admin-form-field"><span>title_name_t</span><input disabled={saving} value={form.titleNameT} onChange={(event) => updateField('titleNameT', event.target.value)} /></label>
          <label className="admin-form-field"><span>Thứ tự</span><input min="0" type="number" disabled={saving} value={form.sortOrder} onChange={(event) => updateField('sortOrder', Number(event.target.value))} /></label>
          <label className="admin-switch-field"><input type="checkbox" checked={form.enabled} onChange={(event) => updateField('enabled', event.target.checked)} /><span className="admin-switch-field__control" /><span><strong>Đang hoạt động</strong></span></label>
          <label className="admin-switch-field"><input type="checkbox" checked={form.isDefault} onChange={(event) => updateField('isDefault', event.target.checked)} /><span className="admin-switch-field__control" /><span><strong>Ngôn ngữ mặc định</strong></span></label>
          <div className="admin-languages__actions">
            {editingId && <button type="button" className="admin-button admin-button--secondary" onClick={resetForm}>Hủy</button>}
            <button type="submit" className="admin-button admin-button--primary" disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu'}</button>
          </div>
        </form>
      </div>
    </section>
  );
}
