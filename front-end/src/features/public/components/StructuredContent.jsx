import SafeImage from './SafeImage.jsx';
import TextContent from './TextContent.jsx';
import '../../../styles/structured-content.css';

function GalleryBlock({ block }) {
  const images = Array.isArray(block?.images) ? block.images.filter((item) => item?.url) : [];
  if (!images.length) return null;

  return (
    <div className={`public-content-gallery public-content-gallery--${Math.min(images.length, 4)}`}>
      {images.map((image, index) => (
        <figure key={`${image.url}-${index}`}>
          <SafeImage src={image.url} alt={image.caption || `Ảnh ${index + 1}`} />
          {image.caption && <figcaption>{image.caption}</figcaption>}
        </figure>
      ))}
    </div>
  );
}

function videoEmbedUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0];
      return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : '';
    }
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const id = url.searchParams.get('v') || (url.pathname.startsWith('/shorts/') ? url.pathname.split('/')[2] : '') || (url.pathname.startsWith('/embed/') ? url.pathname.split('/')[2] : '');
      return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : '';
    }
    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
      const id = url.pathname.split('/').filter(Boolean).find((part) => /^\d+$/.test(part));
      return id ? `https://player.vimeo.com/video/${id}` : '';
    }
  } catch {
    return '';
  }
  return '';
}

function VideoBlock({ block }) {
  const src = videoEmbedUrl(block?.url);
  if (!src) return null;
  return (
    <figure className="public-content-video">
      <div><iframe src={src} title={block.caption || 'Video nội dung'} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /></div>
      {block.caption && <figcaption>{block.caption}</figcaption>}
    </figure>
  );
}

export default function StructuredContent({ blocks, fallbackText = '' }) {
  const items = Array.isArray(blocks) ? blocks.filter(Boolean) : [];
  if (!items.length) return <TextContent text={fallbackText} />;

  return (
    <div className="public-structured-content">
      {items.map((block, index) => {
        const key = block.id || `${block.type || 'block'}-${index}`;
        if (block.type === 'heading') return block.text ? <h2 key={key}>{block.text}</h2> : null;
        if (block.type === 'paragraph') return block.text ? <TextContent key={key} text={block.text} /> : null;
        if (block.type === 'image' && block.url) return <figure className="public-content-image" key={key}><SafeImage src={block.url} alt={block.caption || 'Ảnh nội dung'} />{block.caption && <figcaption>{block.caption}</figcaption>}</figure>;
        if (block.type === 'gallery') return <GalleryBlock block={block} key={key} />;
        if (block.type === 'video') return <VideoBlock block={block} key={key} />;
        return null;
      })}
    </div>
  );
}
