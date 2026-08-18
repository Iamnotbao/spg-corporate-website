const BULLET_PATTERN = /^[-*+•–]\s+(.+)$/u;
const NUMBERED_PATTERN = /^(\d{1,3})[.)]\s+(.+)$/u;
const MARKDOWN_HEADING_PATTERN = /^#{1,6}\s+(.+)$/u;
const EMPHASIZED_HEADING_PATTERN = /^\*\*([^*]+)\*\*[:：]?$/u;
const LABEL_HEADING_PATTERN = /^(.{2,90})[:：]$/u;
const INLINE_LABEL_PATTERN = /^([\p{L}\p{N}][^:：]{1,48})[:：]\s+(.+)$/u;

function getHeading(line) {
  const markdownHeading = line.match(MARKDOWN_HEADING_PATTERN);
  if (markdownHeading) {
    return { kind: 'heading', text: markdownHeading[1].trim() };
  }

  const emphasizedHeading = line.match(EMPHASIZED_HEADING_PATTERN);
  if (emphasizedHeading) {
    return { kind: 'heading', text: emphasizedHeading[1].trim() };
  }

  const labelHeading = line.match(LABEL_HEADING_PATTERN);
  const labelText = labelHeading?.[1].trim();
  if (labelText && /^[\p{L}\p{N}]/u.test(labelText) && !/^https?$/iu.test(labelText)) {
    return { kind: 'label', text: labelText };
  }

  return null;
}

export default function TextContent({ text }) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return (
      <div className="public-rich-text">
        <p className="public-rich-text__empty">Thông tin chi tiết đang được cập nhật.</p>
      </div>
    );
  }

  const blocks = [];
  let activeList = null;

  function flushList() {
    if (!activeList) return;

    const { items, start, type } = activeList;
    const className = `public-rich-text__list public-rich-text__list--${type}`;

    if (type === 'numbered') {
      blocks.push(
        <ol
          className={className}
          key={`block-${blocks.length}`}
          start={start === 1 ? undefined : start}
        >
          {items.map((item, index) => (
            <li key={`item-${index}`}>{item}</li>
          ))}
        </ol>,
      );
    } else {
      blocks.push(
        <ul className={className} key={`block-${blocks.length}`}>
          {items.map((item, index) => (
            <li key={`item-${index}`}>{item}</li>
          ))}
        </ul>,
      );
    }

    activeList = null;
  }

  function addListItem(type, item, start = 1) {
    if (!activeList || activeList.type !== type) {
      flushList();
      activeList = { items: [], start, type };
    }

    activeList.items.push(item);
  }

  lines.forEach((line) => {
    const bullet = line.match(BULLET_PATTERN);
    if (bullet) {
      addListItem('bulleted', bullet[1].trim());
      return;
    }

    const numbered = line.match(NUMBERED_PATTERN);
    if (numbered) {
      addListItem('numbered', numbered[2].trim(), Number(numbered[1]));
      return;
    }

    flushList();

    const heading = getHeading(line);
    if (heading) {
      blocks.push(
        <h3
          className={`public-rich-text__heading public-rich-text__heading--${heading.kind}`}
          key={`block-${blocks.length}`}
        >
          {heading.text}
        </h3>,
      );
      return;
    }

    const inlineLabel = line.match(INLINE_LABEL_PATTERN);
    if (inlineLabel && !/^https?$/iu.test(inlineLabel[1].trim())) {
      blocks.push(
        <p
          className="public-rich-text__paragraph public-rich-text__inline-label"
          key={`block-${blocks.length}`}
        >
          <strong>{inlineLabel[1].trim()}:</strong> <span>{inlineLabel[2].trim()}</span>
        </p>,
      );
      return;
    }

    blocks.push(
      <p className="public-rich-text__paragraph" key={`block-${blocks.length}`}>
        {line}
      </p>,
    );
  });
  flushList();

  return <div className="public-rich-text">{blocks}</div>;
}
