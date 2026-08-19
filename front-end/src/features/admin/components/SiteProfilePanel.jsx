import { useEffect, useState } from 'react';
import { uploadAdminImage } from '../../../services/adminService.js';
import { getAdminSiteProfile, updateAdminSiteProfile } from '../../../services/siteProfileService.js';
import { AdminAlert } from './AdminFeedback.jsx';

const emptyMetric = () => ({ id: `metric-${Date.now()}-${Math.random()}`, value: 0, suffix: '', label: '', note: '', enabled: true });
const emptyPartner = () => ({ id: `partner-${Date.now()}-${Math.random()}`, name: '', logoUrl: '', link: '', enabled: true });

export default function SiteProfilePanel({ onNotify, onUnauthorized }) {
  const [form, setForm] = useState({ metrics: [], partners: [] });
  const [saving, setSaving] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState(-1);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    getAdminSiteProfile({ signal: controller.signal })
      .then((payload) => setForm({ metrics: payload?.data?.metrics || [], partners: payload?.data?.partners || [] }))
      .catch((requestError) => {
        if (!onUnauthorized(requestError)) setError(requestError?.message || 'Không thể tải cấu hình trang chủ.');
      });
    return () => controller.abort();
  }, []);

  function updateMetric(index, field, value) {
    setForm((current) => ({ ...current, metrics: current.metrics.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item) }));
  }

  function updatePartner(index, field, value) {
    setForm((current) => ({ ...current, partners: current.partners.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item) }));
  }

  async function uploadLogo(index, file) {
    if (!file) return;
    setUploadingIndex(index);
    setError('');
    try {
      const uploaded = await uploadAdminImage(file, 'spg/content');
      updatePartner(index, 'logoUrl', uploaded.url);
    } catch (requestError) {
      if (!onUnauthorized(requestError)) setError(requestError?.message || 'Không thể tải logo đối tác.');
    } finally {
      setUploadingIndex(-1);
    }
  }

  async function save() {
    setSaving(true);
    setError('');
    try {
      const payload = await updateAdminSiteProfile(form);
      setForm({ metrics: payload?.data?.metrics || [], partners: payload?.data?.partners || [] });
      onNotify('Đã cập nhật số liệu và đối tác trên trang chủ.');
    } catch (requestError) {
      if (!onUnauthorized(requestError)) setError(requestError?.message || 'Không thể lưu cấu hình trang chủ.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="admin-panel site-profile-admin">
      <div className="admin-panel__heading"><div><h2>Trang chủ & đối tác</h2><p>Nhập số liệu thực tế và logo đối tác. Website public cập nhật realtime sau khi lưu.</p></div></div>
      {error && <AdminAlert>{error}</AdminAlert>}

      <div className="admin-form-section">
        <div className="admin-form-section__heading"><span>01</span><div><h3>Con số nổi bật</h3><p>Không hardcode số liệu. Counter ngoài client sẽ chạy từ 0 đến đúng giá trị bạn nhập.</p></div></div>
        <div className="site-profile-admin__rows">
          {form.metrics.map((item, index) => (
            <div className="site-profile-admin__row" key={item.id || index}>
              <input type="number" min="0" value={item.value ?? 0} onChange={(e) => updateMetric(index, 'value', Number(e.target.value))} placeholder="1000" />
              <input value={item.suffix || ''} onChange={(e) => updateMetric(index, 'suffix', e.target.value)} placeholder="+ / người / đôi" />
              <input value={item.label || ''} onChange={(e) => updateMetric(index, 'label', e.target.value)} placeholder="Lao động" />
              <input value={item.note || ''} onChange={(e) => updateMetric(index, 'note', e.target.value)} placeholder="Mô tả ngắn" />
              <label><input type="checkbox" checked={item.enabled !== false} onChange={(e) => updateMetric(index, 'enabled', e.target.checked)} /> Hiện</label>
              <button type="button" onClick={() => setForm((current) => ({ ...current, metrics: current.metrics.filter((_, i) => i !== index) }))}>×</button>
            </div>
          ))}
        </div>
        <button className="admin-button admin-button--secondary" type="button" onClick={() => setForm((current) => ({ ...current, metrics: [...current.metrics, emptyMetric()] }))}>+ Thêm chỉ số</button>
      </div>

      <div className="admin-form-section">
        <div className="admin-form-section__heading"><span>02</span><div><h3>Đối tác / thương hiệu hợp tác</h3><p>Logo chạy ngang trên trang chủ. Chỉ hiển thị dữ liệu bạn cấu hình.</p></div></div>
        <div className="site-profile-admin__partners">
          {form.partners.map((item, index) => (
            <article key={item.id || index}>
              <div className="site-profile-admin__logo-preview">{item.logoUrl ? <img src={item.logoUrl} alt={item.name || 'Logo'} /> : <span>LOGO</span>}</div>
              <input value={item.name || ''} onChange={(e) => updatePartner(index, 'name', e.target.value)} placeholder="Tên đối tác" />
              <input value={item.link || ''} onChange={(e) => updatePartner(index, 'link', e.target.value)} placeholder="https://... (tùy chọn)" />
              <input value={item.logoUrl || ''} onChange={(e) => updatePartner(index, 'logoUrl', e.target.value)} placeholder="URL logo" />
              <label className="admin-button admin-button--secondary">{uploadingIndex === index ? 'Đang tải…' : 'Upload logo'}<input hidden type="file" accept="image/*" onChange={(e) => { uploadLogo(index, e.target.files?.[0]); e.target.value = ''; }} /></label>
              <label><input type="checkbox" checked={item.enabled !== false} onChange={(e) => updatePartner(index, 'enabled', e.target.checked)} /> Hiện</label>
              <button type="button" onClick={() => setForm((current) => ({ ...current, partners: current.partners.filter((_, i) => i !== index) }))}>Xóa</button>
            </article>
          ))}
        </div>
        <button className="admin-button admin-button--secondary" type="button" onClick={() => setForm((current) => ({ ...current, partners: [...current.partners, emptyPartner()] }))}>+ Thêm đối tác</button>
      </div>

      <div className="admin-editor__actions"><button className="admin-button admin-button--primary" type="button" disabled={saving} onClick={save}>{saving ? 'Đang lưu…' : 'Lưu thay đổi'}</button></div>
    </section>
  );
}
