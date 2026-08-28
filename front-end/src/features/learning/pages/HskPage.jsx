import DemoNotice from '../../../components/ui/DemoNotice.jsx';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import { usePageTitle } from '../../../hooks/usePageTitle.js';
import HskLevelCard from '../components/HskLevelCard.jsx';
import { HSK_LEVELS } from '../data/demoLearningContent.js';
import '../styles/learning.css';

export default function HskPage() {
  usePageTitle('Khám phá HSK');

  return (
    <>
      <PageHeader
        description="Chọn cấp độ để khám phá những khóa học phù hợp. Hanyora không hiển thị số liệu hoặc cam kết chưa được kiểm chứng."
        eyebrow="Định hướng theo cấp độ"
        title="Khám phá HSK"
      />
      <section className="learning-index-section">
        <div className="public-container">
          <DemoNotice>
            {' '}
            Các mô tả cấp độ dùng để định hướng giao diện, không phải dữ liệu khóa học đã
            xuất bản.
          </DemoNotice>
          <div className="hsk-level-grid">
            {HSK_LEVELS.map((item) => (
              <HskLevelCard item={item} key={item.level} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
