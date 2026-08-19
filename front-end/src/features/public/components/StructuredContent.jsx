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

export default function StructuredContent({ blocks, fallbackText = '' }) {
  const items = Array.isArray(blocks) ? blocks.filter(Boolean) : [];
  if (!items.length) return <TextContent text={fallbackText} />;

  return (
    <div className="public-structured-content">
      {items.map((block, index) => {
        const key = block.id || `${block.type || 'block'}-${index}`;

        if (block.type === 'heading') {
          return block.text ? <h2 key={key}>{block.text}</h2> : null;
        }

        if (block.type === 'paragraph') {
          return block.text ? <TextContent key={key} text={block.text} /> : null;
        }

        if (block.type === 'image' && block.url) {
          return (
            <figure className="public-content-image" key={key}>
              <SafeImage src={block.url} alt={block.caption || 'Ảnh nội dung'} />
              {block.caption && <figcaption>{block.caption}</figcaption>}
            </figure>
          );
        }

        if (block.type === 'gallery') return <GalleryBlock block={block} key={key} />;
        return null;
      })}
    </div>
  );
}
