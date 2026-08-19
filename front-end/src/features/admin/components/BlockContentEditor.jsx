import { useMemo, useRef, useState } from 'react';
import { uploadAdminImage } from '../../../services/adminService.js';
import AdminIcon from './AdminIcon.jsx';
import '../../../styles/block-editor.css';

const MAX_GALLERY = 4;
const MIN_GALLERY = 2;
const imageTypes = 'image/jpeg,image/png,image/webp,image/gif';

function blockId() {
  return `block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalize(blocks) {
  return Array.isArray(blocks) ? blocks : [];
}

export default function BlockContentEditor({ blocks, fallbackText = '', onChange, onError, onUnauthorized, type = 'posts' }) {
  const value = useMemo(() => normalize(blocks), [blocks]);
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const singleInput = useRef(null);
  const galleryInput = useRef(null);

  function commit(next) {
    setPast((items) => [...items.slice(-29), value]);
    setFuture([]);
    onChange(next);
  }

  function undo() {
    if (!past.length) return;
    const previous = past[past.length - 1];
    setPast((items) => items.slice(0, -1));
    setFuture((items) => [value, ...items].slice(0, 30));
    onChange(previous);
  }

  function redo() {
    if (!future.length) return;
    const next = future[0];
    setFuture((items) => items.slice(1));
    setPast((items) => [...items.slice(-29), value]);
    onChange(next);
  }

  function addText(kind = 'paragraph') {
    commit([...value, { id: blockId(), type: kind, text: '' }]);
  }

  function addVideo() {
    commit([...value, { id: blockId(), type: 'video', url: '', caption: '' }]);
  }

  function updateBlock(index, patch) {
    commit(value.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  }

  function removeBlock(index) {
    commit(value.filter((_, itemIndex) => itemIndex !== index));
  }

  async function uploadFiles(files) {
    const uploaded = [];
    for (const file of files) {
      if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
        throw new Error('Ảnh phải nhỏ hơn 5 MB và đúng định dạng hình ảnh.');
      }
      // eslint-disable-next-line no-await-in-loop
      uploaded.push(await uploadAdminImage(file, `spg/${type}`));
    }
    return uploaded;
  }

  async function addImageFiles(files, gallery = false) {
    if (!files.length) return;
    if (gallery && (files.length < MIN_GALLERY || files.length > MAX_GALLERY)) {
      onError('Một nhóm ảnh cần từ 2 đến 4 ảnh.');
      return;
    }
    setUploading(true);
    onError('');
    try {
      const uploaded = await uploadFiles(files);
      if (gallery) {
        commit([...value, {
          id: blockId(),
          type: 'gallery',
          layout: `grid-${uploaded.length}`,
          images: uploaded.map((item) => ({ url: item.url, publicId: item.publicId || '', caption: '' })),
        }]);
      } else {
        const item = uploaded[0];
        commit([...value, { id: blockId(), type: 'image', url: item.url, publicId: item.publicId || '', caption: '' }]);
      }
    } catch (error) {
      if (onUnauthorized(error)) return;
      onError(error?.message || 'Không thể tải ảnh lên.');
    } finally {
      setUploading(false);
    }
  }

  async function handlePaste(event) {
    const files = [...(event.clipboardData?.files || [])].filter((file) => file.type.startsWith('image/'));
    if (!files.length) return;
    event.preventDefault();
    await addImageFiles(files.slice(0, 1), false);
  }

  function dropAt(targetIndex) {
    if (dragIndex == null || dragIndex === targetIndex) return;
    const next = [...value];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    setDragIndex(null);
    commit(next);
  }

  function migrateFallback() {
    if (!fallbackText.trim()) return;
    commit([{ id: blockId(), type: 'paragraph', text: fallbackText }]);
  }

  return (
    <div className="admin-block-editor" onPaste={handlePaste}>
      <div className="admin-block-editor__toolbar">
        <div>
          <button type="button" onClick={() => addText('paragraph')}>+ Đoạn văn</button>
          <button type="button" onClick={() => addText('heading')}>+ Tiêu đề</button>
          <button type="button" disabled={uploading} onClick={() => singleInput.current?.click()}>+ Ảnh</button>
          <button type="button" disabled={uploading} onClick={() => galleryInput.current?.click()}>+ Nhóm 2–4 ảnh</button>
          <button type="button" onClick={addVideo}>+ Video</button>
        </div>
        <div>
          <button type="button" disabled={!past.length} onClick={undo} title="Hoàn tác">↶ Undo</button>
          <button type="button" disabled={!future.length} onClick={redo} title="Làm lại">↷ Redo</button>
        </div>
        <input ref={singleInput} hidden accept={imageTypes} type="file" onChange={(event) => { addImageFiles([...(event.target.files || [])].slice(0, 1)); event.target.value = ''; }} />
        <input ref={galleryInput} hidden accept={imageTypes} multiple type="file" onChange={(event) => { addImageFiles([...(event.target.files || [])], true); event.target.value = ''; }} />
      </div>

      {!value.length && (
        <div className="admin-block-editor__empty">
          <AdminIcon name="edit" size={24} />
          <strong>Editor nội dung dạng block</strong>
          <p>Thêm đoạn văn, ảnh, nhóm ảnh hoặc video YouTube/Vimeo rồi kéo block để đổi vị trí. Bạn cũng có thể copy ảnh và paste trực tiếp vào đây.</p>
          {fallbackText && <button type="button" onClick={migrateFallback}>Chuyển nội dung cũ vào editor</button>}
        </div>
      )}

      <div className="admin-block-editor__blocks">
        {value.map((block, index) => (
          <article
            className={`admin-content-block admin-content-block--${block.type}${dragIndex === index ? ' is-dragging' : ''}`}
            draggable
            key={block.id || `${block.type}-${index}`}
            onDragStart={() => setDragIndex(index)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => dropAt(index)}
          >
            <div className="admin-content-block__handle" title="Kéo để đổi vị trí">⋮⋮</div>
            <div className="admin-content-block__body">
              {block.type === 'heading' && <input className="admin-content-block__heading" placeholder="Tiêu đề phần…" value={block.text || ''} onChange={(event) => updateBlock(index, { text: event.target.value })} />}
              {block.type === 'paragraph' && <textarea placeholder="Nhập nội dung…" rows={5} value={block.text || ''} onChange={(event) => updateBlock(index, { text: event.target.value })} />}
              {block.type === 'image' && <div className="admin-content-block__image"><img alt={block.caption || 'Ảnh nội dung'} src={block.url} /><input placeholder="Chú thích ảnh (tùy chọn)" value={block.caption || ''} onChange={(event) => updateBlock(index, { caption: event.target.value })} /></div>}
              {block.type === 'gallery' && <div><div className={`admin-content-block__gallery is-${block.layout || `grid-${block.images?.length || 2}`}`}>{(block.images || []).map((image, imageIndex) => <figure key={`${image.url}-${imageIndex}`}><img alt={image.caption || `Ảnh ${imageIndex + 1}`} src={image.url} /><figcaption>{String(imageIndex + 1).padStart(2, '0')}</figcaption></figure>)}</div><small>Nhóm {block.images?.length || 0} ảnh được giữ như một block khi kéo.</small></div>}
              {block.type === 'video' && <div className="admin-content-block__video"><label>Video YouTube / Vimeo</label><input type="url" placeholder="https://www.youtube.com/watch?v=..." value={block.url || ''} onChange={(event) => updateBlock(index, { url: event.target.value })} /><input placeholder="Chú thích video (tùy chọn)" value={block.caption || ''} onChange={(event) => updateBlock(index, { caption: event.target.value })} /><small>Public chỉ nhúng URL YouTube/Vimeo hợp lệ; URL khác sẽ không render iframe.</small></div>}
            </div>
            <button className="admin-content-block__delete" type="button" onClick={() => removeBlock(index)} aria-label="Xóa block">×</button>
          </article>
        ))}
      </div>
      {uploading && <div className="admin-block-editor__upload"><span className="admin-spinner" /> Đang tải ảnh…</div>}
    </div>
  );
}
