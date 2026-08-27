import { useCallback, useEffect, useState } from 'react';
import { ADMIN_DEFAULT_PAGE_SIZE } from '../constants.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { createAdminVideo, deleteAdminVideo, listAdminVideos, updateAdminVideo, uploadAdminVideo } from '../services/adminVideoService.js';
import { AdminAlert, AdminEmpty, AdminSkeletonRows } from './AdminFeedback.jsx';
import AdminFilterToolbar from './AdminFilterToolbar.jsx';
import AdminIcon from './AdminIcon.jsx';
import AdminPageHeader from './AdminPageHeader.jsx';
import AdminPagination from './AdminPagination.jsx';

const EMPTY = { title: '', description: '', videoUrl: '', videoPublicId: '', posterUrl: '', duration: 0, hskLevel: 'HSK 1', order: 0, status: 'draft', sourceType: 'cloudinary', embedUrl: '', featured: false };

export default function AdminVideoPanel({ onNotify, onUnauthorized }) {
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({ search: '', status: '', hskLevel: '', from: '', to: '' });
  const search = useDebouncedValue(filters.search, 350);
  const [pagination, setPagination] = useState({ page: 1, pageSize: ADMIN_DEFAULT_PAGE_SIZE, total: 0, totalPages: 1 });
  const [form, setForm] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async (signal) => {
    setStatus('loading');
    try {
      const response = await listAdminVideos({ ...filters, search, page: pagination.page, pageSize: pagination.pageSize, signal });
      if (signal?.aborted) return;
      setItems(response.data || []);
      setPagination((current) => ({ ...current, ...response.pagination }));
      setError('');
      setStatus('ready');
    } catch (caught) {
      if (caught.name === 'AbortError') return;
      if (caught.status === 401 && onUnauthorized(caught)) return;
      setError(caught.message);
      setStatus('error');
    }
  }, [filters.from, filters.hskLevel, filters.status, filters.to, onUnauthorized, pagination.page, pagination.pageSize, search]);
  useEffect(() => { const controller = new AbortController(); load(controller.signal); return () => controller.abort(); }, [load]);

  function changeFilter(key, value) { setFilters((current) => ({ ...current, [key]: value })); setPagination((current) => ({ ...current, page: 1 })); }
  async function upload(file) {
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadAdminVideo(file);
      setForm((current) => ({ ...current, sourceType: 'cloudinary', videoUrl: result.url, videoPublicId: result.publicId, duration: result.duration || 0, embedUrl: '' }));
      onNotify('Đã tải video lên Cloudinary. Lưu biểu mẫu để xuất bản nội dung.');
    } catch (caught) { onNotify(caught.message, 'error'); } finally { setUploading(false); }
  }
  async function save(event) {
    event.preventDefault(); setSaving(true);
    try {
      const payload = { ...form, duration: Number(form.duration), order: Number(form.order), videoUrl: form.videoUrl || form.embedUrl };
      if (form.id) await updateAdminVideo(form.id, payload); else await createAdminVideo(payload);
      setForm(null); onNotify('Đã lưu video học tập.'); await load();
    } catch (caught) { onNotify(caught.message, 'error'); } finally { setSaving(false); }
  }
  return <div className="admin-learning-page"><AdminPageHeader eyebrow="Video learning" title="Video học tập" description="Tải video Mandora lên Cloudinary hoặc dùng liên kết YouTube/Vimeo tin cậy." action={<button className="admin-button admin-button--primary" onClick={() => setForm({ ...EMPTY })} type="button"><AdminIcon name="plus" size={16} /> Thêm video</button>} />
    {form && <form className="admin-form-section admin-learning-form" onSubmit={save}><div className="admin-form-grid"><Field label="Tiêu đề" name="title" form={form} setForm={setForm} required /><label className="admin-form-field"><span>Nguồn video</span><select value={form.sourceType} onChange={(event) => setForm({ ...form, sourceType: event.target.value, embedUrl: '', videoUrl: '', videoPublicId: '' })}><option value="cloudinary">Cloudinary</option><option value="youtube">YouTube</option><option value="vimeo">Vimeo</option></select></label>{form.sourceType === 'cloudinary' ? <label className="admin-form-field admin-learning-field--full"><span>Tệp video (MP4, WebM, MOV · tối đa 100MB)</span><input accept="video/mp4,video/webm,video/quicktime" disabled={uploading} onChange={(event) => upload(event.target.files?.[0])} type="file" />{form.videoUrl && <small>Đã tải: {form.videoUrl}</small>}</label> : <Field label="URL YouTube/Vimeo" name="embedUrl" form={form} setForm={setForm} type="url" required />}<Field label="Poster URL" name="posterUrl" form={form} setForm={setForm} type="url" /><Field label="HSK" name="hskLevel" form={form} setForm={setForm} required /><Field label="Thời lượng (giây)" name="duration" form={form} setForm={setForm} type="number" min="0" /><Field label="Thứ tự" name="order" form={form} setForm={setForm} type="number" min="0" /><label className="admin-form-field"><span>Trạng thái</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="draft">Bản nháp</option><option value="published">Đã xuất bản</option></select></label><label className="admin-switch-field"><input checked={form.featured} onChange={(event) => setForm({ ...form, featured: event.target.checked })} type="checkbox" /><span className="admin-switch-field__control" /><span><strong>Video nổi bật trang chủ</strong><small>Chỉ một video được chọn.</small></span></label><label className="admin-form-field admin-learning-field--full"><span>Mô tả</span><textarea required value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label></div><div className="admin-learning-form__actions"><button className="admin-button admin-button--secondary" onClick={() => setForm(null)} type="button">Hủy</button><button className="admin-button admin-button--primary" disabled={saving || uploading} type="submit">{saving ? 'Đang lưu…' : 'Lưu video'}</button></div></form>}
    <section className="admin-panel"><AdminFilterToolbar search={filters.search} onSearchChange={(value) => changeFilter('search', value)} filters={[{ key: 'status', label: 'Trạng thái', value: filters.status, onChange: (value) => changeFilter('status', value), options: [{ value: '', label: 'Tất cả trạng thái' }, { value: 'draft', label: 'Bản nháp' }, { value: 'published', label: 'Đã xuất bản' }] }, { key: 'hsk', label: 'Cấp HSK', value: filters.hskLevel, onChange: (value) => changeFilter('hskLevel', value), options: [{ value: '', label: 'Tất cả HSK' }, ...[1,2,3,4,5,6].map((level) => ({ value: `HSK ${level}`, label: `HSK ${level}` }))] }]} from={filters.from} to={filters.to} onFromChange={(value) => changeFilter('from', value)} onToChange={(value) => changeFilter('to', value)} pageSize={pagination.pageSize} onPageSizeChange={(pageSize) => setPagination((current) => ({ ...current, page: 1, pageSize }))} />{error && <AdminAlert onRetry={() => load()}>{error}</AdminAlert>}{status === 'loading' ? <AdminSkeletonRows count={4} /> : items.length ? <><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Video</th><th>Nguồn</th><th>HSK</th><th>Trạng thái</th><th><span className="admin-sr-only">Thao tác</span></th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><strong>{item.title}</strong>{item.featured && <small>Nổi bật trang chủ</small>}</td><td>{item.sourceType}</td><td>{item.hskLevel}</td><td><span className={`admin-learning-badge is-${item.status}`}>{item.status}</span></td><td className="admin-learning-actions"><button className="admin-icon-button" aria-label={`Sửa ${item.title}`} onClick={() => setForm({ ...item })} type="button"><AdminIcon name="edit" size={16} /></button><button className="admin-icon-button admin-icon-button--danger" aria-label={`Xóa ${item.title}`} onClick={async () => { if (!window.confirm(`Xóa “${item.title}”?`)) return; try { await deleteAdminVideo(item.id); await load(); } catch (caught) { onNotify(caught.message, 'error'); } }} type="button"><AdminIcon name="trash" size={16} /></button></td></tr>)}</tbody></table></div><AdminPagination pagination={pagination} onPageChange={(page) => setPagination((current) => ({ ...current, page }))} /></> : <AdminEmpty title="Chưa có video">Thêm video học tập đầu tiên.</AdminEmpty>}</section></div>;
}
function Field({ form, label, name, setForm, ...props }) { return <label className="admin-form-field"><span>{label}</span><input {...props} value={form[name] || ''} onChange={(event) => setForm({ ...form, [name]: event.target.value })} /></label>; }
