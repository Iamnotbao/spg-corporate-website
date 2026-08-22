import { Link, useParams } from 'react-router-dom';
import DemoNotice from '../../../components/ui/DemoNotice.jsx';
import { usePageTitle } from '../../../hooks/usePageTitle.js';
import NotFoundPage from '../../public/pages/NotFoundPage.jsx';
import { PRACTICE_AREAS } from '../data/demoLearningContent.js';
import '../styles/learning.css';

export default function PracticeModePage() {
  const { mode } = useParams();
  const area = PRACTICE_AREAS.find(
    (item) => item.slug === mode && item.to.startsWith('/practice/'),
  );
  usePageTitle(area?.title || 'Luyện tập');

  if (!area) return <NotFoundPage />;

  return (
    <section className="practice-mode-page">
      <div className="public-container practice-mode-page__inner">
        <Link className="breadcrumb-link" to="/practice">
          ← Tất cả hoạt động
        </Link>
        <span className="practice-mode-page__character" lang="zh-Hans">
          {area.character}
        </span>
        <p className="public-eyebrow">Nền tảng luyện tập</p>
        <h1>{area.title}</h1>
        <p>{area.description}</p>
        <DemoNotice>
          {' '}
          Hoạt động tương tác và chấm điểm chưa được triển khai trong Phase 2.
        </DemoNotice>
      </div>
    </section>
  );
}
