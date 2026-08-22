import { useCallback, useEffect, useState } from 'react';
import {
  createAdminNotification,
  deleteAdminNotification,
  getAdminBanner,
  listAdminNotifications,
  updateAdminBanner,
  updateAdminNotification,
  uploadAdminImage,
} from '../../../services/adminService.js';
import MediaPicker from './MediaPicker.jsx';

const EMPTY_BANNER = {
  title: '', message: '', link: '', backgroundImageUrl: '', backgroundImagePublicId: '', enabled: false, style: 'event', startsAt: '', endsAt: '',
};

export default function CommunicationsPanel({ onNotify, onUnauthorized }) {
  const [banner, setBanner] = useState(EMPTY_BANNER);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [published, setPublished] = useState('');
  const [draft, setDraft] = useState({ title: '', message: '', link: '', type: 'info', published: true });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const loadBanner = useCallback(async () => {
    try {
      const payload = await getAdminBanner();
      setBanner({ ...EMPTY_BANNER, ...(payload?.data || {}) });
    } catch (error) {
      if (!onUnauthorized(error)) onNotify(error?.message || 'Không thể tải banner.', 'error');
    }
  }, [onNotify, onUnauthorized]);

  const loadNotifications = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const payload = await listAdminNotifications({ page, pageSize: pagination.pageSize, search: search.trim(), published });
      setItems(payload?.data || []);
      setPagination((current) => ({ ...current, ...(payload?.pagination || {}), page }));
    } catch (error) {
      if (!onUnauthorized(error)) onNotify(error?.message || 'Không thể tải thông báo.', 'error');
    } finally { setLoading(false); }
  }, [onNotify, onUnauthorized, pagination.pageSize, published, search]);

  useEffect(() => { loadBanner(); }, [loadBanner]);
  useEffect(() => { const timer = window.setTimeout(() => loadNotifications(1), 250); return () => window.clearTimeout(timer); }, [search, published, pagination.pageSize]);

  async function uploadBackground(file) {
    if (!file) return;
    setUploadingBackground(true);
    try {
      const uploaded = await uploadAdminImage(file, 'mandora/content');
      setBanner((current) => ({ ...current, backgroundImageUrl: uploaded.url, backgroundImagePublicId: uploaded.publicId || '' }));
      onNotify('Đã upload ảnh nền. Nhấn Lưu sự kiện để áp dụng.');
    } catch (error) {
      if (!onUnauthorized(error)) onNotify(error?.message || 'Không thể tải ảnh nền.', 'error');
    } finally { setUploadingBackground(false); }
  }

  async function saveBanner(event) {
    event.preventDefault(); setSaving(true);
    try {
      await updateAdminBanner({ ...banner, startsAt: banner.startsAt || null, endsAt: banner.endsAt || null });
      onNotify('Đã cập nhật sự kiện. Website đang mở sẽ nhận thay đổi ngay.');
    } catch (error) {
      if (!onUnauthorized(error)) onNotify(error?.message || 'Không thể lưu sự kiện.', 'error');
    } finally { setSaving(false); }
  }

  async function addNotification(event) {
    event.preventDefault();
    try {
      await createAdminNotification(draft);
      setDraft({ title: '', message: '', link: '', type: 'info', published: true });
      await loadNotifications(1); onNotify('Đã đăng thông báo mới.');
    } catch (error) { if (!onUnauthorized(error)) onNotify(error?.message || 'Không thể tạo thông báo.', 'error'); }
  }

  async function toggleNotification(item) {
    const id = item?._id?.$oid || item?._id;
    try { await updateAdminNotification(id, { ...item, published: item.published === false }); await loadNotifications(pagination.page); }
    catch (error) { if (!onUnauthorized(error)) onNotify(error?.message || 'Không thể cập nhật thông báo.', 'error'); }
  }

  async function removeNotification(item) {
    if (!window.confirm('Xóa thông báo này?')) return;
    const id = item?._id?.$oid || item?._id;
    try { await deleteAdminNotification(id); await loadNotifications(pagination.page); onNotify('Đã xóa thông báo.'); }
    catch (error) { if (!onUnauthorized(error)) onNotify(error?.message || 'Không thể xóa thông báo.', 'error'); }
  }

  return (
    <section className="admin-panel admin-communications">
      <div className="admin-panel__heading"><div><h2>Thông báo & sự kiện</h2><p>Quản lý banner sự kiện và thông báo public theo thời gian thực.</p></div></div>

      <form className="admin-form-section admin-communications__banner" onSubmit={saveBanner}>
        <div className="admin-form-section__heading"><span>01</span><div><h3>Banner sự kiện</h3><p>Hiển thị ở đầu website; có thể upload hoặc chọn ảnh từ Thư viện ảnh.</p></div></div>
        <div className="admin-form-grid">
          <label className="admin-form-field"><span>Tiêu đề</span><input value={banner.title || ''} onChange={(e) => setBanner((v) => ({ ...v, title: e.target.value }))} /></label>
          <label className="admin-form-field"><span>Kiểu</span><select value={banner.style || 'event'} onChange={(e) => setBanner((v) => ({ ...v, style: e.target.value }))}><option value="event">Sự kiện</option><option value="info">Thông tin</option><option value="highlight">Nổi bật</option><option value="celebration">Celebration</option></select></label>
        </div>
        <label className="admin-form-field admin-form-field--full"><span>Nội dung</span><textarea rows="3" value={banner.message || ''} onChange={(e) => setBanner((v) => ({ ...v, message: e.target.value }))} /></label>
        <div className="admin-form-field admin-form-field--full">
          <span>Ảnh nền sự kiện (tùy chọn)</span>
          {banner.backgroundImageUrl && <div className="admin-event-background-preview"><img src={banner.backgroundImageUrl} alt="Ảnh nền sự kiện" /></div>}
          <input type="url" placeholder="https://..." value={banner.backgroundImageUrl || ''} onChange={(e) => setBanner((v) => ({ ...v, backgroundImageUrl: e.target.value, backgroundImagePublicId: '' }))} />
          <div className="admin-event-background-actions">
            <label className="admin-button admin-button--secondary">{uploadingBackground ? 'Đang tải…' : 'Upload ảnh'}<input hidden type="file" accept="image/*" disabled={uploadingBackground} onChange={(e) => { uploadBackground(e.target.files?.[0]); e.target.value = ''; }} /></label>
            <button className="admin-button admin-button--secondary" type="button" onClick={() => setPickerOpen(true)}>Chọn từ thư viện</button>
            {banner.backgroundImageUrl && <button className="admin-button admin-button--secondary" type="button" onClick={() => setBanner((v) => ({ ...v, backgroundImageUrl: '', backgroundImagePublicId: '' }))}>Gỡ ảnh</button>}
          </div>
          <small>Nền luôn có lớp phủ để giữ chữ dễ đọc.</small>
        </div>
        <label className="admin-form-field admin-form-field--full"><span>Link</span><input placeholder="/#careers" value={banner.link || ''} onChange={(e) => setBanner((v) => ({ ...v, link: e.target.value }))} /></label>
        <div className="admin-form-grid">
          <label className="admin-form-field"><span>Bắt đầu</span><input type="datetime-local" value={banner.startsAt ? String(banner.startsAt).slice(0, 16) : ''} onChange={(e) => setBanner((v) => ({ ...v, startsAt: e.target.value }))} /></label>
          <label className="admin-form-field"><span>Kết thúc</span><input type="datetime-local" value={banner.endsAt ? String(banner.endsAt).slice(0, 16) : ''} onChange={(e) => setBanner((v) => ({ ...v, endsAt: e.target.value }))} /></label>
        </div>
        <label className="admin-switch-field"><input type="checkbox" checked={banner.enabled === true} onChange={(e) => setBanner((v) => ({ ...v, enabled: e.target.checked }))} /><span className="admin-switch-field__control" /><span><strong>Bật banner</strong><small>Có thể tắt mà không xóa cấu hình sự kiện.</small></span></label>
        <button className="admin-button admin-button--primary" disabled={saving} type="submit">{saving ? 'Đang lưu…' : 'Lưu sự kiện'}</button>
      </form>

      <div className="admin-form-section">
        <div className="admin-form-section__heading"><span>02</span><div><h3>Thông báo</h3><p>Có tìm kiếm, lọc trạng thái và phân trang.</p></div></div>
        <form className="admin-communications__notification-form" onSubmit={addNotification}>
          <input required placeholder="Tiêu đề" value={draft.title} onChange={(e) => setDraft((v) => ({ ...v, title: e.target.value }))} />
          <input required placeholder="Nội dung" value={draft.message} onChange={(e) => setDraft((v) => ({ ...v, message: e.target.value }))} />
          <select value={draft.type} onChange={(e) => setDraft((v) => ({ ...v, type: e.target.value }))}><option value="info">Thông tin</option><option value="event">Sự kiện</option><option value="warning">Lưu ý</option></select>
          <button className="admin-button admin-button--primary" type="submit">Thêm</button>
        </form>
        <div className="admin-communications__toolbar"><input placeholder="Tìm thông báo…" value={search} onChange={(e) => setSearch(e.target.value)} /><select value={published} onChange={(e) => setPublished(e.target.value)}><option value="">Tất cả</option><option value="true">Đang hiện</option><option value="false">Đang ẩn</option></select><select value={pagination.pageSize} onChange={(e) => setPagination((v) => ({ ...v, pageSize: Number(e.target.value) }))}>{[5, 10, 20, 50].map((size) => <option key={size} value={size}>{size}/trang</option>)}</select></div>
        <div className="admin-communications__list">{loading ? <p>Đang tải…</p> : items.map((item) => <article key={item?._id?.$oid || item?._id}><div><strong>{item.title}</strong><p>{item.message}</p></div><div className="admin-communications__actions"><button className="admin-button admin-button--secondary" type="button" onClick={() => toggleNotification(item)}>{item.published === false ? 'Hiện' : 'Ẩn'}</button><button className="admin-button admin-button--secondary" type="button" onClick={() => removeNotification(item)}>Xóa</button></div></article>)}{!loading && !items.length && <p>Không có thông báo phù hợp.</p>}</div>
        <div className="admin-communications__pagination"><span>{pagination.total} thông báo</span><div><button type="button" disabled={pagination.page <= 1 || loading} onClick={() => loadNotifications(pagination.page - 1)}>←</button><strong>{pagination.page}/{pagination.totalPages}</strong><button type="button" disabled={pagination.page >= pagination.totalPages || loading} onClick={() => loadNotifications(pagination.page + 1)}>→</button></div></div>
      </div>

      <MediaPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onUnauthorized={onUnauthorized} onSelect={(asset) => setBanner((current) => ({ ...current, backgroundImageUrl: asset.url, backgroundImagePublicId: asset.publicId }))} />
    </section>
  );
}
