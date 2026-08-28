import { useEffect, useMemo, useState } from 'react';

const PAGE_BUDGET = 1100;
const MAX_BLOCKS_PER_PAGE = 9;
const LONG_BLOCK_LIMIT = 260;

function isStructuredBlock(value) {
  return (
    /^(mục tiêu|ghi nhớ|ví dụ|hội thoại|từ vựng|luyện tập|\d+[.)]\s)/iu.test(value) ||
    /^[-•]\s/.test(value) ||
    /^[A-ZÀ-Ỹ]:\s/u.test(value)
  );
}

function splitLongBlock(value) {
  const text = String(value || '').trim();
  if (!text || text.length <= LONG_BLOCK_LIMIT || isStructuredBlock(text)) return [text];

  const sentences = text.match(/[^.!?。！？]+[.!?。！？]?/gu) || [text];
  const chunks = [];
  let chunk = '';

  sentences.forEach((sentence) => {
    const next = `${chunk}${chunk ? ' ' : ''}${sentence.trim()}`.trim();
    if (chunk && next.length > LONG_BLOCK_LIMIT) {
      chunks.push(chunk);
      chunk = sentence.trim();
    } else {
      chunk = next;
    }
  });

  if (chunk) chunks.push(chunk);
  return chunks.length ? chunks : [text];
}

function blockWeight(text) {
  const value = String(text || '').trim();
  if (!value) return 0;
  const heading = /^(mục tiêu|ghi nhớ|ví dụ|hội thoại|từ vựng|luyện tập|\d+[.)]\s)/iu.test(value);
  const bullet = /^[-•]\s/.test(value);
  const dialogue = /^[A-ZÀ-Ỹ]:\s/u.test(value);
  const base = Math.max(90, Math.min(360, value.length * 3));
  return base + (heading ? 90 : 0) + (bullet || dialogue ? 28 : 0);
}

function splitIntoPages(content) {
  const blocks = String(content || '')
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean)
    .flatMap(splitLongBlock);

  if (!blocks.length) return [[]];

  const pages = [];
  let page = [];
  let budget = 0;

  blocks.forEach((block) => {
    const weight = blockWeight(block);
    const shouldBreak =
      page.length > 0 &&
      (page.length >= MAX_BLOCKS_PER_PAGE || budget + weight > PAGE_BUDGET);

    if (shouldBreak) {
      pages.push(page);
      page = [];
      budget = 0;
    }

    page.push(block);
    budget += weight;
  });

  if (page.length) pages.push(page);
  return pages.length ? pages : [[]];
}

function blockClassName(text) {
  if (/^(mục tiêu|ghi nhớ|ví dụ|hội thoại|từ vựng|luyện tập|\d+[.)]\s)/iu.test(text)) {
    return 'lesson-paper__heading';
  }
  if (/^[-•]\s/.test(text)) return 'lesson-paper__bullet';
  if (/^[A-ZÀ-Ỹ]:\s/u.test(text)) return 'lesson-paper__dialogue';
  if (/^[\p{Script=Han}\s，。！？、；：“”‘’（）]+$/u.test(text)) return 'lesson-paper__chinese';
  return 'lesson-paper__paragraph';
}

export default function LessonPaperReader({ content, lessonKey }) {
  const pages = useMemo(() => splitIntoPages(content), [content]);
  const [pageIndex, setPageIndex] = useState(0);
  const [direction, setDirection] = useState('next');
  const [animationKey, setAnimationKey] = useState(0);

  useEffect(() => {
    setPageIndex(0);
    setDirection('next');
    setAnimationKey((value) => value + 1);
  }, [lessonKey]);

  const safeIndex = Math.min(pageIndex, pages.length - 1);
  const currentPage = pages[safeIndex] || [];

  function go(nextIndex) {
    const clamped = Math.min(Math.max(nextIndex, 0), pages.length - 1);
    if (clamped === safeIndex) return;
    setDirection(clamped > safeIndex ? 'next' : 'previous');
    setPageIndex(clamped);
    setAnimationKey((value) => value + 1);
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowRight' || event.key === 'PageDown') {
      event.preventDefault();
      go(safeIndex + 1);
    }
    if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
      event.preventDefault();
      go(safeIndex - 1);
    }
  }

  return (
    <section
      aria-label="Trình đọc nội dung bài học"
      className="lesson-paper"
      onKeyDown={handleKeyDown}
      tabIndex="0"
    >
      <div className="lesson-paper__topbar">
        <div>
          <span>Nội dung bài học</span>
          <small>Dùng ← → để chuyển trang</small>
        </div>
        <strong>
          {safeIndex + 1} / {pages.length}
        </strong>
      </div>

      <div className="lesson-paper__stage">
        <article
          className={`lesson-paper__sheet is-${direction}`}
          key={`${lessonKey}-${safeIndex}-${animationKey}`}
        >
          <div className="lesson-paper__margin" aria-hidden="true" />
          <div className="lesson-paper__content">
            {currentPage.length ? (
              currentPage.map((block, index) => {
                const className = blockClassName(block);
                const text = className === 'lesson-paper__bullet'
                  ? block.replace(/^[-•]\s*/, '')
                  : block;
                return (
                  <p className={className} key={`${block.slice(0, 30)}-${index}`}>
                    {className === 'lesson-paper__bullet' && <span aria-hidden="true">•</span>}
                    {text}
                  </p>
                );
              })
            ) : (
              <p className="lesson-paper__empty">Bài học chưa có nội dung.</p>
            )}
          </div>
          <span className="lesson-paper__page-number" aria-hidden="true">
            {safeIndex + 1}
          </span>
        </article>
      </div>

      <footer className="lesson-paper__controls">
        <button
          className="button button--secondary lesson-paper__previous"
          disabled={safeIndex === 0}
          onClick={() => go(safeIndex - 1)}
          type="button"
        >
          ← Trang trước
        </button>

        <div className="lesson-paper__dots" aria-label="Chọn trang">
          {pages.map((_, index) => (
            <button
              aria-current={index === safeIndex ? 'page' : undefined}
              aria-label={`Trang ${index + 1}`}
              className={index === safeIndex ? 'is-active' : undefined}
              key={index}
              onClick={() => go(index)}
              type="button"
            />
          ))}
        </div>

        <button
          className="button button--primary lesson-paper__next"
          disabled={safeIndex === pages.length - 1}
          onClick={() => go(safeIndex + 1)}
          type="button"
        >
          Trang sau →
        </button>
      </footer>
    </section>
  );
}
