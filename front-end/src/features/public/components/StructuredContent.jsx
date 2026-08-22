import { useMemo, useState } from 'react';
import SafeImage from './SafeImage.jsx';
import TextContent from './TextContent.jsx';
import ImageLightbox from './ImageLightbox.jsx';
import '../../../styles/structured-content.css';

function videoEmbedUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0];
      return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : '';
    }
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const id =
        url.searchParams.get('v') ||
        (url.pathname.startsWith('/shorts/') ? url.pathname.split('/')[2] : '') ||
        (url.pathname.startsWith('/embed/') ? url.pathname.split('/')[2] : '');
      return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : '';
    }
    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
      const id = url.pathname
        .split('/')
        .filter(Boolean)
        .find((part) => /^\d+$/.test(part));
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
      <div>
        <iframe
          src={src}
          title={block.caption || 'Video nội dung'}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
      {block.caption && <figcaption>{block.caption}</figcaption>}
    </figure>
  );
}

export default function StructuredContent({ blocks, fallbackText = '' }) {
  const items = useMemo(
    () => (Array.isArray(blocks) ? blocks.filter(Boolean) : []),
    [blocks],
  );
  const images = useMemo(() => {
    const output = [];
    items.forEach((block) => {
      if (block.type === 'image' && block.url)
        output.push({
          url: block.url,
          caption: block.caption || '',
          alt: block.caption || 'Ảnh nội dung',
        });
      if (block.type === 'gallery')
        (block.images || []).forEach((image) => {
          if (image?.url)
            output.push({
              url: image.url,
              caption: image.caption || '',
              alt: image.caption || 'Ảnh nội dung',
            });
        });
    });
    return output;
  }, [items]);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  if (!items.length) return <TextContent text={fallbackText} />;

  function imageIndex(url) {
    return images.findIndex((item) => item.url === url);
  }

  return (
    <>
      <div className="public-structured-content">
        {items.map((block, index) => {
          const key = block.id || `${block.type || 'block'}-${index}`;
          if (block.type === 'heading')
            return block.text ? <h2 key={key}>{block.text}</h2> : null;
          if (block.type === 'paragraph')
            return block.text ? <TextContent key={key} text={block.text} /> : null;
          if (block.type === 'image' && block.url)
            return (
              <figure className="public-content-image" key={key}>
                <button
                  className="public-content-image__button"
                  type="button"
                  onClick={() => setLightboxIndex(imageIndex(block.url))}
                >
                  <SafeImage src={block.url} alt={block.caption || 'Ảnh nội dung'} />
                  <span aria-hidden="true">⌕</span>
                </button>
                {block.caption && <figcaption>{block.caption}</figcaption>}
              </figure>
            );
          if (block.type === 'gallery') {
            const gallery = Array.isArray(block.images)
              ? block.images.filter((image) => image?.url)
              : [];
            return (
              <div
                className={`public-content-gallery public-content-gallery--${Math.min(gallery.length, 4)}`}
                key={key}
              >
                {gallery.map((image, imageIndexLocal) => (
                  <figure key={`${image.url}-${imageIndexLocal}`}>
                    <button
                      className="public-content-image__button"
                      type="button"
                      onClick={() => setLightboxIndex(imageIndex(image.url))}
                    >
                      <SafeImage
                        src={image.url}
                        alt={image.caption || `Ảnh ${imageIndexLocal + 1}`}
                      />
                      <span aria-hidden="true">⌕</span>
                    </button>
                    {image.caption && <figcaption>{image.caption}</figcaption>}
                  </figure>
                ))}
              </div>
            );
          }
          if (block.type === 'video') return <VideoBlock block={block} key={key} />;
          return null;
        })}
      </div>
      <ImageLightbox
        images={images}
        index={lightboxIndex}
        onIndexChange={setLightboxIndex}
        onClose={() => setLightboxIndex(null)}
      />
    </>
  );
}
