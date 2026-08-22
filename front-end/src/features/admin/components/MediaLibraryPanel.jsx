import { useCallback, useEffect, useState } from 'react';
import { deleteAdminMedia, listAdminMedia } from '../../../services/mediaService.js';
import { uploadAdminImage } from '../../../services/adminService.js';
import { AdminAlert } from './AdminFeedback.jsx';
import '../../../styles/media-library.css';

function bytes(value) {
  const amount = Number(value) || 0;
  if (amount < 1024) return `${amount} B`;
  if (amount < 1024 * 1024) return `${(amount / 1024).toFixed(1)} KB`;
  return `${(amount / 1024 / 1024).toFixed(1)} MB`;
}

export default function MediaLibraryPanel({ onNotify, onUnauthorized }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const payload = await listAdminMedia({ search: search.trim() });
      setItems(payload?.data || []);
    } catch (requestError) {
      if (!onUnauthorized(requestError)) setError(requestError?.message || 'Không thể tải thư viện ảnh.');
    } finally { setLoading(false); }
  }, [search, onUnauthorized]);

  useEffect(() => {
    const timer = window.setTimeout(load, 200);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function upload(files) {
    const selected = [...(files || [])].slice(0, 20);
    if (!selected.length) return;
    setUploading(true); setError('');
    try {
      for (const file of selected) {
        // eslint-disable-next-line no-await-in-loop
        await uploadAdminImage(file, 'mandora/content');
      }
      await load();
      onNotify(`Đã tải ${selected.length} ảnh vào thư viện.`);
    } catch (requestError) {
      if (!onUnauthorized(requestError)) setError(requestError?.message || 'Không thể upload ảnh.');
    } finally { setUploading(false); }
  }

  async function remove(item) {
    if (item.usage?.length) {
      setError(`Ảnh đang được sử dụng: ${item.usage.join(', ')}`);
      return;
    }
    if (!window.confirm('Xóa ảnh này khỏi Cloudinary? Hành động này không thể hoàn tác.')) return;
    try {
      await deleteAdminMedia(item.publicId);
      setItems((current) => current.filter((entry) => entry.publicId !== item.publicId));
      onNotify('Đã xóa ảnh khỏi thư viện.');
    } catch (requestError) {
      if (!onUnauthorized(requestError)) setError(requestError?.payload?.usage?.length ? `Ảnh đang được sử dụng: ${requestError.payload.usage.join(', ')}` : requestError?.message || 'Không thể xóa ảnh.');
    }
  }

  return (
    <section className="admin-panel admin-media-library">
      <div className="admin-panel__heading"><div><h2>Thư viện Media</h2><p>Quản lý ảnh Cloudinary đang được hệ thống nội dung hiện có tham chiếu.</p></div></div>
      {error && <AdminAlert>{error}</AdminAlert>}
      <div className="admin-media-toolbar">
        <input placeholder="Tìm theo tên file / thư mục / nơi đang dùng…" value={search} onChange={(event) => setSearch(event.target.value)} />
        <label className="admin-button admin-button--primary">{uploading ? 'Đang tải…' : '+ Upload ảnh'}<input hidden multiple accept="image/*" type="file" disabled={uploading} onChange={(event) => { upload(event.target.files); event.target.value = ''; }} /></label>
      </div>
      {loading ? <p>Đang tải thư viện…</p> : (
        <div className="admin-media-library__grid">
          {items.map((item) => (
            <article key={item.publicId}>
              <div className="admin-media-library__thumb"><img src={item.url} alt={item.publicId} loading="lazy" /></div>
              <div className="admin-media-library__meta">
                <strong title={item.publicId}>{item.publicId.split('/').pop()}</strong>
                <small>{item.width || '?'} × {item.height || '?'} · {bytes(item.bytes)}</small>
                <small>{item.folder || 'legacy'}</small>
                {item.usage?.length ? <div className="admin-media-library__usage"><b>Đang dùng</b>{item.usage.slice(0, 3).map((usage) => <span key={usage}>{usage}</span>)}</div> : <span className="admin-media-library__free">Chưa tham chiếu</span>}
              </div>
              <div className="admin-media-library__actions"><a href={item.url} target="_blank" rel="noreferrer">Mở ảnh</a><button type="button" disabled={Boolean(item.usage?.length)} onClick={() => remove(item)}>Xóa</button></div>
            </article>
          ))}
        </div>
      )}
      {!loading && !items.length && <p>Chưa có ảnh phù hợp.</p>}
    </section>
  );
}
