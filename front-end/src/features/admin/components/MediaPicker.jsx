import { useEffect, useState } from 'react';
import { listAdminMedia } from '../../../services/mediaService.js';
import '../../../styles/media-library.css';

export default function MediaPicker({ open, onClose, onSelect, onUnauthorized }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const payload = await listAdminMedia({ search: search.trim(), signal: controller.signal });
        setItems(payload?.data || []);
      } catch (requestError) {
        if (!onUnauthorized?.(requestError)) setError(requestError?.message || 'Không thể tải thư viện ảnh.');
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [open, search]);

  if (!open) return null;

  return (
    <div className="admin-media-modal" role="dialog" aria-modal="true" aria-label="Chọn ảnh từ thư viện">
      <button className="admin-media-modal__scrim" type="button" onClick={onClose} aria-label="Đóng" />
      <section className="admin-media-modal__panel">
        <header><div><strong>Chọn ảnh từ thư viện</strong><small>Ảnh đang lưu trong thư viện nội dung hiện có.</small></div><button type="button" onClick={onClose}>×</button></header>
        <input className="admin-media-search" placeholder="Tìm theo tên file / thư mục…" value={search} onChange={(event) => setSearch(event.target.value)} />
        {error && <p className="admin-media-error">{error}</p>}
        {loading ? <p>Đang tải ảnh…</p> : (
          <div className="admin-media-grid">
            {items.map((item) => (
              <button className="admin-media-choice" key={item.publicId} type="button" onClick={() => { onSelect(item); onClose(); }}>
                <img src={item.url} alt={item.publicId} loading="lazy" />
                <span>{item.publicId.split('/').pop()}</span>
              </button>
            ))}
          </div>
        )}
        {!loading && !items.length && <p>Chưa có ảnh phù hợp.</p>}
      </section>
    </div>
  );
}
