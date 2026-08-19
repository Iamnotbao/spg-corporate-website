import { useState } from 'react';
import { uploadAdminImage } from '../../../services/adminService.js';
import '../../../styles/post-gallery.css';
import AdminIcon from './AdminIcon.jsx';

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export default function PostGalleryField({ form, onChange, onError, onUnauthorized }) {
  const [uploading, setUploading] = useState(false);
  const images = Array.isArray(form.images) ? form.images : [];
  const publicIds = Array.isArray(form.imagePublicIds) ? form.imagePublicIds : [];

  async function handleFiles(event) {
    const files = [...(event.target.files || [])];
    event.target.value = '';
    if (!files.length) return;

    const invalid = files.find(
      (file) => !ALLOWED_IMAGE_TYPES.has(file.type) || file.size > 5 * 1024 * 1024,
    );
    if (invalid) {
      onError('Mỗi ảnh phải là JPG, PNG, WebP hoặc GIF và không lớn hơn 5 MB.');
      return;
    }

    if (images.length + files.length > 12) {
      onError('Mỗi bài viết hỗ trợ tối đa 12 ảnh trong thư viện.');
      return;
    }

    setUploading(true);
    onError('');
    try {
      const uploaded = [];
      for (const file of files) {
        // Upload tuần tự để tránh làm nghẽn Render/Cloudinary khi chọn nhiều ảnh lớn.
        // eslint-disable-next-line no-await-in-loop
        uploaded.push(await uploadAdminImage(file, 'spg/posts'));
      }
      onChange({
        images: [...images, ...uploaded.map((item) => item.url)],
        imagePublicIds: [...publicIds, ...uploaded.map((item) => item.publicId || '')],
      });
    } catch (error) {
      if (onUnauthorized(error)) return;
      onError(error?.message || 'Không thể tải thư viện ảnh lên.');
    } finally {
      setUploading(false);
    }
  }

  function removeImage(index) {
    onChange({
      images: images.filter((_, itemIndex) => itemIndex !== index),
      imagePublicIds: publicIds.filter((_, itemIndex) => itemIndex !== index),
    });
  }

  return (
    <div className="admin-post-gallery">
      <div className="admin-post-gallery__heading">
        <div>
          <strong>Thư viện ảnh</strong>
          <span>Tối đa 12 ảnh · hiển thị thành carousel ở bài viết.</span>
        </div>
        <label className="admin-button admin-button--secondary">
          {uploading ? <span className="admin-spinner" /> : <AdminIcon name="image" size={17} />}
          {uploading ? 'Đang tải…' : 'Thêm ảnh'}
          <input
            accept="image/jpeg,image/png,image/webp,image/gif"
            disabled={uploading}
            multiple
            onChange={handleFiles}
            type="file"
          />
        </label>
      </div>

      {images.length ? (
        <div className="admin-post-gallery__grid">
          {images.map((url, index) => (
            <figure key={`${url}-${index}`}>
              <img alt={`Ảnh bài viết ${index + 1}`} src={url} />
              <button
                aria-label={`Xóa ảnh ${index + 1}`}
                onClick={() => removeImage(index)}
                type="button"
              >
                ×
              </button>
              <figcaption>{String(index + 1).padStart(2, '0')}</figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <div className="admin-post-gallery__empty">Chưa có ảnh bổ sung.</div>
      )}
    </div>
  );
}
