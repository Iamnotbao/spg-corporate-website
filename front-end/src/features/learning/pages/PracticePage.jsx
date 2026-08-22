import { Link } from 'react-router-dom';
import DemoNotice from '../../../components/ui/DemoNotice.jsx';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import { usePageTitle } from '../../../hooks/usePageTitle.js';
import { PRACTICE_AREAS } from '../data/demoLearningContent.js';
import '../styles/learning.css';

export default function PracticePage() {
  usePageTitle('Luyện tập');

  return (
    <>
      <PageHeader
        description="Chọn kỹ năng bạn muốn củng cố. Phase này chỉ thiết lập điều hướng và bố cục cho các hoạt động luyện tập."
        eyebrow="Củng cố kiến thức"
        title="Luyện tập"
      />
      <section className="learning-index-section">
        <div className="public-container">
          <DemoNotice />
          <div className="practice-grid">
            {PRACTICE_AREAS.map((area, index) => (
              <Link className="practice-card" key={area.slug} to={area.to}>
                <span className="practice-card__index">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <strong lang="zh-Hans">{area.character}</strong>
                <div>
                  <h2>{area.title}</h2>
                  <p>{area.description}</p>
                </div>
                <i aria-hidden="true">→</i>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
