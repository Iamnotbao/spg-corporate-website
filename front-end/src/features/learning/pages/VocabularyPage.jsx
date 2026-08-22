import { useMemo, useState } from 'react';
import DemoNotice from '../../../components/ui/DemoNotice.jsx';
import { EmptyState } from '../../../components/ui/ContentState.jsx';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import { usePageTitle } from '../../../hooks/usePageTitle.js';
import VocabularyCard from '../components/VocabularyCard.jsx';
import { DEMO_VOCABULARY } from '../data/demoLearningContent.js';
import '../styles/learning.css';

const LEVELS = ['Tất cả', 'HSK 1', 'HSK 2', 'HSK 3'];

export default function VocabularyPage() {
  usePageTitle('Từ vựng');
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('Tất cả');

  const items = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('vi');
    return DEMO_VOCABULARY.filter((item) => {
      const matchesLevel = level === 'Tất cả' || item.level === level;
      const haystack = `${item.simplified} ${item.traditional} ${item.pinyin} ${item.meaning}`;
      return (
        matchesLevel &&
        (!normalized || haystack.toLocaleLowerCase('vi').includes(normalized))
      );
    });
  }, [level, query]);

  return (
    <>
      <PageHeader
        description="Duyệt từ theo chữ giản thể, phồn thể, Pinyin, nghĩa tiếng Việt và ngữ cảnh sử dụng."
        eyebrow="Xây vốn từ"
        title="Từ vựng"
      />
      <section className="learning-index-section">
        <div className="public-container">
          <DemoNotice>
            {' '}
            Các thẻ dưới đây là ví dụ giao diện. Âm thanh và lưu từ chưa được kết nối.
          </DemoNotice>
          <div className="learning-toolbar">
            <label className="catalog-search">
              <span aria-hidden="true">⌕</span>
              <span className="visually-hidden">Tìm từ vựng</span>
              <input
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm chữ, Pinyin hoặc nghĩa…"
                type="search"
                value={query}
              />
            </label>
            <div aria-label="Lọc từ vựng theo HSK" className="filter-chips" role="group">
              {LEVELS.map((item) => (
                <button
                  aria-pressed={level === item}
                  className={level === item ? 'is-active' : undefined}
                  key={item}
                  onClick={() => setLevel(item)}
                  type="button"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          {items.length ? (
            <div className="vocabulary-grid">
              {items.map((item) => (
                <VocabularyCard item={item} key={item.simplified} />
              ))}
            </div>
          ) : (
            <EmptyState
              description="Hãy thử từ khóa hoặc cấp độ khác."
              icon="词"
              title="Chưa tìm thấy từ phù hợp"
            />
          )}
        </div>
      </section>
    </>
  );
}
