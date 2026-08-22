import { useState } from 'react';
import DemoNotice from '../../../components/ui/DemoNotice.jsx';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import { usePageTitle } from '../../../hooks/usePageTitle.js';
import CharacterCard from '../components/CharacterCard.jsx';
import { DEMO_CHARACTERS } from '../data/demoLearningContent.js';
import '../styles/learning.css';

export default function CharactersPage() {
  usePageTitle('Hán tự');
  const [selected, setSelected] = useState(DEMO_CHARACTERS[0]);

  return (
    <>
      <PageHeader
        description="Quan sát chữ, cách đọc, bộ thủ và ví dụ sử dụng trong một bố cục dễ ghi nhớ."
        eyebrow="Khám phá chữ viết"
        title="Hán tự"
      />
      <section className="learning-index-section">
        <div className="public-container">
          <DemoNotice>
            {' '}
            Nội dung bên dưới minh họa cấu trúc dữ liệu Hán tự; thứ tự nét nâng cao chưa
            được triển khai.
          </DemoNotice>
          <div className="character-browser">
            <div aria-label="Danh sách Hán tự minh họa" className="character-list">
              {DEMO_CHARACTERS.map((item) => (
                <CharacterCard
                  active={selected.simplified === item.simplified}
                  item={item}
                  key={item.simplified}
                  onSelect={setSelected}
                />
              ))}
            </div>
            <article className="character-detail">
              <div className="character-detail__glyph">
                <strong lang="zh-Hans">{selected.simplified}</strong>
                {selected.traditional !== selected.simplified && (
                  <span lang="zh-Hant">Phồn thể · {selected.traditional}</span>
                )}
              </div>
              <div className="character-detail__copy">
                <p className="public-eyebrow">{selected.level}</p>
                <h2>{selected.pinyin}</h2>
                <p>{selected.meaning}</p>
                <dl>
                  <div>
                    <dt>Bộ thủ</dt>
                    <dd lang="zh-Hans">{selected.radical}</dd>
                  </div>
                  <div>
                    <dt>Số nét</dt>
                    <dd>{selected.strokes}</dd>
                  </div>
                </dl>
                <div className="character-examples">
                  <strong>Ví dụ</strong>
                  {selected.examples.map((example) => (
                    <span key={example}>{example}</span>
                  ))}
                </div>
              </div>
              <div className="stroke-order-foundation">
                <span lang="zh-Hans">{selected.simplified}</span>
                <p>Khu vực thứ tự nét trong tương lai</p>
              </div>
            </article>
          </div>
        </div>
      </section>
    </>
  );
}
