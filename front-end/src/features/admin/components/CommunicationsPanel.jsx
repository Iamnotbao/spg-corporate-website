import { useEffect, useState } from 'react';
import {
  createAdminNotification,
  deleteAdminNotification,
  getAdminBanner,
  listAdminNotifications,
  updateAdminBanner,
  updateAdminNotification,
} from '../../../services/adminService.js';

const emptyBanner = {
  title: '', message: '', link: '', enabled: false, style: 'event', startsAt: '', endsAt: '',
};

export default function CommunicationsPanel({ onNotify, onUnauthorized }) {
  const [banner, setBanner] = useState(emptyBanner);
  const [items, setItems] = useState([]);
  const [draft, setDraft] = useState({ title: '', message: '', link: '', type: 'info', published: true });
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const [bannerPayload, notificationPayload] = await Promise.all([
        getAdminBanner(), listAdminNotifications(),
      ]);
      setBanner({ ...emptyBanner, ...(bannerPayload?.data || {}) });
      setItems(notificationPayload?.data || []);
    } catch (error) {
      if (!onUnauthorized(error)) onNotify(error?.message || 'Không thể tải thông tin truyền thông.', 'error');
    }
  }

  useEffect(() => { load(); }, []);

  async function saveBanner(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await updateAdminBanner({
        ...banner,
        startsAt: banner.startsAt || null,
        endsAt: banner.endsAt || null,
      });
      onNotify('Đã cập nhật banner. Website đang mở sẽ nhận thay đổi ngay.');
    } catch (error) {
      if (!onUnauthorized(error)) onNotify(error?.message || 'Không thể lưu banner.', 'error');
    } finally { setSaving(false); }
  }

  async function addNotification(event) {
    event.preventDefault();
    try {
      await createAdminNotification(draft);
      setDraft({ title: '', message: '', link: '', type: 'info', published: true });
      await load();
      onNotify('Đã đăng thông báo mới.');
    } catch (error) {
      if (!onUnauthorized(error)) onNotify(error?.message || 'Không thể tạo thông báo.', 'error');
    }
  }

  async function toggleNotification(item) {
    const id = item?._id?.$oid || item?._id;
    try {
      await updateAdminNotification(id, { ...item, published: item.published === false });
      await load();
    } catch (error) {
      if (!onUnauthorized(error)) onNotify(error?.message || 'Không thể cập nhật thông báo.', 'error');
    }
  }

  async function removeNotification(item) {
    if (!window.confirm('Xóa thông báo này?')) return;
    const id = item?._id?.$oid || item?._id;
    try {
      await deleteAdminNotification(id);
      await load();
      onNotify('Đã xóa thông báo.');
    } catch (error) {
      if (!onUnauthorized(error)) onNotify(error?.message || 'Không thể xóa thông báo.', 'error');
    }
  }

  return (
    <section className="admin-panel admin-communications">
      <div className="admin-panel__heading">
        <div><h2>Banner & thông báo</h2><p>Quản lý nội dung nổi bật hiển thị công khai theo thời gian thực.</p></div>
      </div>

      <form className="admin-form-section admin-communications__banner" onSubmit={saveBanner}>
        <div className="admin-form-section__heading"><span>01</span><div><h3>Banner sự kiện</h3><p>Hiển thị trên cùng website.</p></div></div>
        <div className="admin-form-grid">
          <label className="admin-form-field"><span>Tiêu đề</span><input value={banner.title || ''} onChange={(e) => setBanner((v) => ({ ...v, title: e.target.value }))} /></label>
          <label className="admin-form-field"><span>Kiểu</span><select value={banner.style || 'event'} onChange={(e) => setBanner((v) => ({ ...v, style: e.target.value }))}><option value="event">Sự kiện</option><option value="info">Thông tin</option><option value="highlight">Nổi bật</option></select></label>
        </div>
        <label className="admin-form-field admin-form-field--full"><span>Nội dung</span><textarea rows="3" value={banner.message || ''} onChange={(e) => setBanner((v) => ({ ...v, message: e.target.value }))} /></label>
        <label className="admin-form-field admin-form-field--full"><span>Link</span><input placeholder="/#careers" value={banner.link || ''} onChange={(e) => setBanner((v) => ({ ...v, link: e.target.value }))} /></label>
        <label className="admin-switch-field"><input type="checkbox" checked={banner.enabled === true} onChange={(e) => setBanner((v) => ({ ...v, enabled: e.target.checked }))} /><span className="admin-switch-field__control" /><span><strong>Bật banner</strong><small>Có thể tắt mà không cần xóa nội dung.</small></span></label>
        <button className="admin-button admin-button--primary" disabled={saving} type="submit">{saving ? 'Đang lưu…' : 'Lưu banner'}</button>
      </form>

      <div className="admin-form-section">
        <div className="admin-form-section__heading"><span>02</span><div><h3>Thông báo</h3><p>Hiển thị trong chuông thông báo ở header.</p></div></div>
        <form className="admin-communications__notification-form" onSubmit={addNotification}>
          <input required placeholder="Tiêu đề" value={draft.title} onChange={(e) => setDraft((v) => ({ ...v, title: e.target.value }))} />
          <input required placeholder="Nội dung" value={draft.message} onChange={(e) => setDraft((v) => ({ ...v, message: e.target.value }))} />
          <select value={draft.type} onChange={(e) => setDraft((v) => ({ ...v, type: e.target.value }))}><option value="info">Thông tin</option><option value="event">Sự kiện</option><option value="warning">Lưu ý</option></select>
          <button className="admin-button admin-button--primary" type="submit">Thêm thông báo</button>
        </form>
        <div className="admin-communications__list">
          {items.map((item) => (
            <article key={item?._id?.$oid || item?._id}>
              <div><strong>{item.title}</strong><p>{item.message}</p></div>
              <div className="admin-communications__actions">
                <button className="admin-button admin-button--secondary" type="button" onClick={() => toggleNotification(item)}>{item.published === false ? 'Hiện' : 'Ẩn'}</button>
                <button className="admin-button admin-button--secondary" type="button" onClick={() => removeNotification(item)}>Xóa</button>
              </div>
            </article>
          ))}
          {!items.length && <p>Chưa có thông báo.</p>}
        </div>
      </div>
    </section>
  );
}
