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
        {mode === 'quiz' ? (
          <div className="student-access-card__notice" role="status">
            <span aria-hidden="true">测</span>
            <div>
              <strong>Quiz nằm trong lộ trình khóa học</strong>
              <p>
                Chọn một khóa học, đăng ký và mở bài học loại Quiz để làm bài, nhận kết
                quả và cập nhật tiến độ.
              </p>
              <Link className="button button--primary" to="/courses">
                Chọn khóa học
              </Link>
            </div>
          </div>
        ) : (
          <DemoNotice>
            {' '}
            Hoạt động tương tác này chưa được triển khai trong V1 hiện tại.
          </DemoNotice>
        )}
      </div>
    </section>
  );
}
