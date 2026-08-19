import { useMemo, useRef, useState } from 'react';
import { uploadAdminImage } from '../../../services/adminService.js';
import { CONTENT_LABELS, EMPTY_CONTENT, JOB_TYPES } from '../constants.js';
import { getErrorMessage, normalizeContentPayload } from '../utils.js';
import AdminIcon from './AdminIcon.jsx';
import { AdminAlert } from './AdminFeedback.jsx';
import BlockContentEditor from './BlockContentEditor.jsx';
import DynamicCategoryField from './DynamicCategoryField.jsx';
import PostGalleryField from './PostGalleryField.jsx';

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const TRANSLATION_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'zh-tw', label: '繁體中文' },
];

function createInitialForm(type, item) {
  const empty = EMPTY_CONTENT[type];
  return {
    ...empty,
    ...(item || {}),
    summary: item?.summary || item?.excerpt || '',
    contentBlocks: Array.isArray(item?.contentBlocks) ? item.contentBlocks : [],
    images: Array.isArray(item?.images) ? item.images : empty?.images || [],
    imagePublicIds: Array.isArray(item?.imagePublicIds) ? item.imagePublicIds : empty?.imagePublicIds || [],
    translations: {
      en: { ...(empty?.translations?.en || {}), ...(item?.translations?.en || {}) },
      'zh-tw': { ...(empty?.translations?.['zh-tw'] || {}), ...(item?.translations?.['zh-tw'] || item?.translations?.zh || {}) },
    },
    published: item?.published !== false,
  };
}

export default function ContentEditor({ item, onBack, onSave, onUnauthorized, type }) {
  const initialForm = useMemo(() => createInitialForm(type, item), [item, type]);
  const initialSnapshot = useRef(JSON.stringify(initialForm));
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [imageError, setImageError] = useState(false);
  const editing = Boolean(item);
  const dirty = JSON.stringify(form) !== initialSnapshot.current;

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value, ...(name === 'imageUrl' ? { imagePublicId: '' } : {}) }));
    if (name === 'imageUrl') setImageError(false);
  }

  function updateFields(values) { setForm((current) => ({ ...current, ...values })); }

  function updateTranslation(code, name, value) {
    setForm((current) => ({
      ...current,
      translations: {
        ...(current.translations || {}),
        [code]: { ...(current.translations?.[code] || {}), [name]: value },
      },
    }));
  }

  function handleBack() {
    if (dirty && !window.confirm('Các thay đổi chưa lưu sẽ bị mất. Tiếp tục?')) return;
    onBack();
  }

  async function handleUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) { setError('Vui lòng chọn ảnh JPG, PNG, WebP hoặc GIF.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Ảnh không được lớn hơn 5 MB.'); return; }

    setUploading(true); setError('');
    try {
      const uploadedImage = await uploadAdminImage(file, `spg/${type}`);
      setForm((current) => ({ ...current, imageUrl: uploadedImage.url, imagePublicId: uploadedImage.publicId || '' }));
      setImageError(false);
    } catch (uploadError) {
      if (onUnauthorized(uploadError)) return;
      setError(getErrorMessage(uploadError, 'Không thể tải ảnh lên.'));
    } finally { setUploading(false); }
  }

  async function handleSubmit(event) {
    event.preventDefault(); setError('');
    const payload = normalizeContentPayload(type, form);
    if (!payload.title) { setError('Vui lòng nhập tiêu đề.'); return; }
    setSaving(true);
    try { await onSave(payload); }
    catch (saveError) {
      if (onUnauthorized(saveError)) return;
      setError(getErrorMessage(saveError, 'Không thể lưu nội dung.'));
    } finally { setSaving(false); }
  }

  const legacyText = type === 'posts' ? form.content : form.description;

  return (
    <section className="admin-panel admin-editor">
      <div className="admin-editor__topbar">
        <button className="admin-back-button" onClick={handleBack} type="button"><AdminIcon name="arrowLeft" size={18} /> Quay lại danh sách</button>
        <span className="admin-editor__mode">{editing ? 'Đang chỉnh sửa' : 'Nội dung mới'}</span>
      </div>

      <div className="admin-panel__heading admin-editor__heading">
        <div><h2>{editing ? 'Chỉnh sửa' : 'Tạo'} {CONTENT_LABELS[type].singular}</h2><p>Những trường có dấu <span aria-hidden="true">*</span> là bắt buộc.</p></div>
      </div>
      {error && <AdminAlert>{error}</AdminAlert>}

      <form className="admin-editor__form" onSubmit={handleSubmit}>
        <div className="admin-editor__content">
          <div className="admin-form-section">
            <div className="admin-form-section__heading"><span>01</span><div><h3>Thông tin chính</h3><p>Nội dung tiếng Việt và nội dung mặc định.</p></div></div>

            <label className="admin-form-field admin-form-field--full">
              <span>Tiêu đề <b aria-label="bắt buộc">*</b></span>
              <input autoFocus maxLength={180} onChange={(event) => updateField('title', event.target.value)} placeholder={type === 'posts' ? 'Nhập tiêu đề bài viết' : 'Nhập tên vị trí tuyển dụng'} required type="text" value={form.title} />
              <small>{String(form.title || '').length}/180 ký tự</small>
            </label>

            {type === 'posts' && <DynamicCategoryField value={form.category || 'activity'} onChange={(value) => updateField('category', value)} />}

            {type === 'jobs' && (
              <div className="admin-form-grid">
                <label className="admin-form-field"><span>Địa điểm</span><input onChange={(event) => updateField('location', event.target.value)} placeholder="Ví dụ: Bình Dương" type="text" value={form.location} /></label>
                <label className="admin-form-field"><span>Loại công việc</span><select onChange={(event) => updateField('type', event.target.value)} value={form.type}>{JOB_TYPES.map((jobType) => <option key={jobType} value={jobType}>{jobType}</option>)}</select></label>
              </div>
            )}

            <label className="admin-form-field admin-form-field--full"><span>Tóm tắt</span><textarea maxLength={500} onChange={(event) => updateField('summary', event.target.value)} placeholder="Mô tả ngắn gọn nội dung…" rows={4} value={form.summary} /><small>{String(form.summary || '').length}/500 ký tự</small></label>

            <div className="admin-form-field admin-form-field--full">
              <span>{type === 'posts' ? 'Nội dung bài viết' : 'Mô tả công việc'}</span>
              <small>Dùng block để chèn ảnh đúng vị trí, nhóm 2–4 ảnh và kéo thả sắp xếp.</small>
              <BlockContentEditor blocks={form.contentBlocks} fallbackText={legacyText || ''} onChange={(contentBlocks) => updateField('contentBlocks', contentBlocks)} onError={setError} onUnauthorized={onUnauthorized} type={type} />
            </div>

            {type === 'jobs' && (
              <>
                <div className="admin-form-grid">
                  <label className="admin-form-field"><span>Mức lương</span><input onChange={(event) => updateField('salary', event.target.value)} placeholder="Ví dụ: Thỏa thuận" type="text" value={form.salary} /></label>
                  <label className="admin-form-field"><span>Thời gian làm việc</span><input onChange={(event) => updateField('workingHours', event.target.value)} placeholder="Ví dụ: Thứ 2 – Thứ 6" type="text" value={form.workingHours} /></label>
                </div>
                <label className="admin-form-field admin-form-field--full"><span>Quyền lợi</span><textarea onChange={(event) => updateField('benefits', event.target.value)} placeholder="Mô tả chế độ và quyền lợi…" rows={6} value={form.benefits} /></label>
              </>
            )}

            <div className="admin-form-section__heading"><span>02</span><div><h3>Bản dịch</h3><p>Để trống trường nào thì website tự dùng nội dung tiếng Việt của trường đó.</p></div></div>
            {TRANSLATION_LANGUAGES.map(({ code, label }) => {
              const translation = form.translations?.[code] || {};
              return (
                <div className="admin-form-section" key={code}>
                  <div className="admin-form-section__heading"><span>{code.toUpperCase()}</span><div><h3>{label}</h3><p>Nội dung dùng khi khách chọn {label}.</p></div></div>
                  <label className="admin-form-field admin-form-field--full"><span>Tiêu đề</span><input maxLength={180} value={translation.title || ''} onChange={(event) => updateTranslation(code, 'title', event.target.value)} /></label>
                  <label className="admin-form-field admin-form-field--full"><span>Tóm tắt</span><textarea rows={3} maxLength={500} value={translation.summary || ''} onChange={(event) => updateTranslation(code, 'summary', event.target.value)} /></label>
                  {type === 'posts' ? (
                    <label className="admin-form-field admin-form-field--full"><span>Nội dung bản dịch</span><textarea rows={8} value={translation.content || ''} onChange={(event) => updateTranslation(code, 'content', event.target.value)} placeholder="Nội dung chữ; ảnh vẫn dùng từ bài gốc." /></label>
                  ) : (
                    <>
                      <div className="admin-form-grid">
                        <label className="admin-form-field"><span>Địa điểm</span><input value={translation.location || ''} onChange={(event) => updateTranslation(code, 'location', event.target.value)} /></label>
                        <label className="admin-form-field"><span>Mức lương</span><input value={translation.salary || ''} onChange={(event) => updateTranslation(code, 'salary', event.target.value)} /></label>
                      </div>
                      <label className="admin-form-field admin-form-field--full"><span>Mô tả công việc</span><textarea rows={7} value={translation.description || ''} onChange={(event) => updateTranslation(code, 'description', event.target.value)} /></label>
                      <label className="admin-form-field admin-form-field--full"><span>Quyền lợi</span><textarea rows={5} value={translation.benefits || ''} onChange={(event) => updateTranslation(code, 'benefits', event.target.value)} /></label>
                      <label className="admin-form-field admin-form-field--full"><span>Thời gian làm việc</span><input value={translation.workingHours || ''} onChange={(event) => updateTranslation(code, 'workingHours', event.target.value)} /></label>
                    </>
                  )}
                </div>
              );
            })}

            <PostGalleryField form={form} onChange={updateFields} onError={setError} onUnauthorized={onUnauthorized} type={type} />
          </div>

          <aside className="admin-editor__aside">
            <div className="admin-form-section">
              <div className="admin-form-section__heading"><span>03</span><div><h3>Ảnh đại diện</h3><p>Ảnh ngang, dung lượng tối đa 5 MB.</p></div></div>
              <div className="admin-image-uploader">
                {form.imageUrl && !imageError ? <img alt="Xem trước ảnh đại diện" onError={() => setImageError(true)} src={form.imageUrl} /> : <div className="admin-image-uploader__placeholder"><AdminIcon name="image" size={28} /><span>Chưa có ảnh đại diện</span></div>}
                <label className="admin-button admin-button--secondary">{uploading ? <span className="admin-spinner" /> : <AdminIcon name="image" size={17} />}{uploading ? 'Đang tải ảnh…' : 'Chọn ảnh'}<input accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploading} onChange={handleUpload} type="file" /></label>
              </div>
              <label className="admin-form-field admin-form-field--full"><span>Hoặc nhập URL ảnh</span><input onChange={(event) => updateField('imageUrl', event.target.value)} placeholder="https://…" type="url" value={form.imageUrl} /></label>
            </div>

            <div className="admin-form-section">
              <div className="admin-form-section__heading"><span>04</span><div><h3>Xuất bản</h3><p>Kiểm soát nội dung trên website.</p></div></div>
              <label className="admin-switch-field"><input checked={form.published !== false} onChange={(event) => updateField('published', event.target.checked)} type="checkbox" /><span className="admin-switch-field__control" /><span><strong>Hiển thị công khai</strong><small>{form.published !== false ? 'Nội dung đang sẵn sàng hiển thị.' : 'Nội dung sẽ được lưu ở trạng thái ẩn.'}</small></span></label>
            </div>
          </aside>
        </div>

        <div className="admin-editor__actions">
          <button className="admin-button admin-button--secondary" disabled={saving} onClick={handleBack} type="button">Hủy</button>
          <button className="admin-button admin-button--primary" disabled={saving || uploading || !dirty} type="submit">{saving && <span className="admin-spinner" />}{saving ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Tạo nội dung'}</button>
        </div>
      </form>
    </section>
  );
}
