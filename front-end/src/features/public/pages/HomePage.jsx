import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../../components/ui/ContentState.jsx';
import { usePageTitle } from '../../../hooks/usePageTitle.js';
import BlogHighlights from '../../blog/components/BlogHighlights.jsx';
import CourseCard from '../../courses/components/CourseCard.jsx';
import { listPublicCourses } from '../../courses/services/courseCatalogService.js';
import HskLevelCard from '../../learning/components/HskLevelCard.jsx';
import { HSK_LEVELS } from '../../learning/data/demoLearningContent.js';
import { usePublicCollection } from '../hooks/usePublicContent.js';
import '../styles/home.css';

const LEARNING_FEATURES = [
  {
    character: '路',
    title: 'Lộ trình rõ ràng',
    description: 'Đi từ Course đến Unit và Lesson theo một cấu trúc dễ theo dõi.',
  },
  {
    character: '词',
    title: 'Học trong ngữ cảnh',
    description: 'Kết nối từ vựng, Hán tự và ví dụ sử dụng thay vì học rời rạc.',
  },
  {
    character: '练',
    title: 'Củng cố đúng lúc',
    description: 'Các điểm luyện tập được tổ chức gần với nội dung vừa học.',
  },
];

export default function HomePage() {
  usePageTitle('Học tiếng Trung cho người Việt');
  const loadCourses = useCallback(() => listPublicCourses(), []);
  const courses = usePublicCollection(loadCourses);

  return (
    <>
      <section className="mandora-hero home-hero">
        <div className="public-container mandora-hero__grid">
          <div className="mandora-hero__copy">
            <p className="public-eyebrow">Mandora · Tiếng Trung cho người Việt</p>
            <h1>
              Học tiếng Trung dễ dàng,
              <span> từng bước mỗi ngày.</span>
            </h1>
            <p className="mandora-hero__lead">
              Học từ vựng, ngữ pháp, Hán tự và luyện tập theo lộ trình phù hợp với bạn.
            </p>
            <div className="mandora-hero__actions">
              <Link className="button button--primary" to="/courses">
                Bắt đầu học <span aria-hidden="true">→</span>
              </Link>
              <Link className="button button--secondary" to="/courses">
                Khám phá khóa học
              </Link>
            </div>
            <div className="home-hero__pillars" aria-label="Các khu vực học tập chính">
              <span>课程 · Khóa học</span>
              <span>汉字 · Hán tự</span>
              <span>练习 · Luyện tập</span>
            </div>
          </div>
          <div className="mandora-hero__visual" aria-label="Ví dụ học tiếng Trung">
            <div className="mandora-hero__halo" />
            <article className="learning-card home-learning-card">
              <div className="home-learning-card__top">
                <span>Bài học hôm nay</span>
                <small>Minh họa</small>
              </div>
              <strong lang="zh-Hans">每天</strong>
              <span className="learning-card__pinyin">měitiān</span>
              <p>mỗi ngày</p>
              <div className="home-learning-card__line">
                <i />
                <span>Giữ nhịp học đều đặn</span>
              </div>
            </article>
            <span className="learning-orbit learning-orbit--one">听 · Nghe</span>
            <span className="learning-orbit learning-orbit--two">读 · Đọc</span>
          </div>
        </div>
      </section>

      <section className="home-section" aria-labelledby="hsk-discovery-title">
        <div className="public-container">
          <div className="home-section-heading">
            <div>
              <p className="public-eyebrow">Tìm điểm bắt đầu</p>
              <h2 id="hsk-discovery-title">Khám phá theo cấp độ HSK</h2>
            </div>
            <Link className="text-link" to="/hsk">
              Xem toàn bộ HSK <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="home-hsk-grid">
            {HSK_LEVELS.map((item) => (
              <HskLevelCard item={item} key={item.level} />
            ))}
          </div>
        </div>
      </section>

      <section
        className="home-section home-section--tinted"
        aria-labelledby="featured-courses-title"
      >
        <div className="public-container">
          <div className="home-section-heading">
            <div>
              <p className="public-eyebrow">Lộ trình nổi bật</p>
              <h2 id="featured-courses-title">Bắt đầu bằng một khóa học phù hợp</h2>
            </div>
            <Link className="text-link" to="/courses">
              Tất cả khóa học <span aria-hidden="true">→</span>
            </Link>
          </div>
          {courses.status === 'loading' && <LoadingState label="Đang tải khóa học" />}
          {courses.status === 'error' && (
            <ErrorState message={courses.error} onRetry={courses.retry} />
          )}
          {courses.status === 'ready' && courses.data.length === 0 && (
            <EmptyState
              description="Các khóa học đã xuất bản sẽ xuất hiện tại đây."
              icon="课"
              title="Chưa có khóa học"
            />
          )}
          {courses.status === 'ready' && courses.data.length > 0 && (
            <div className="course-grid home-course-grid">
              {courses.data.slice(0, 3).map((course) => (
                <CourseCard course={course} key={course.slug} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section
        className="home-section home-features"
        aria-labelledby="learning-features-title"
      >
        <div className="public-container home-features__grid">
          <div className="home-features__intro">
            <p className="public-eyebrow">Tập trung vào việc học</p>
            <h2 id="learning-features-title">
              Một trải nghiệm gọn gàng và có định hướng.
            </h2>
            <p>
              Mandora đặt nội dung học ở trung tâm, với điều hướng nhất quán và những bước
              tiếp theo dễ hiểu.
            </p>
          </div>
          <div className="home-feature-list">
            {LEARNING_FEATURES.map((feature, index) => (
              <article key={feature.title}>
                <span lang="zh-Hans">{feature.character}</span>
                <div>
                  <small>{String(index + 1).padStart(2, '0')}</small>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        className="home-section home-section--vocabulary"
        aria-labelledby="daily-word-title"
      >
        <div className="public-container home-vocabulary__grid">
          <div>
            <p className="public-eyebrow">Một từ mỗi ngày</p>
            <h2 id="daily-word-title">Học từ trong một câu hoàn chỉnh.</h2>
            <p>
              Mỗi thẻ từ được thiết kế để hỗ trợ chữ giản thể, phồn thể, Pinyin, nghĩa
              tiếng Việt và ví dụ ngữ cảnh.
            </p>
            <Link className="button button--secondary" to="/vocabulary">
              Khám phá từ vựng <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="home-vocabulary__character" aria-hidden="true" lang="zh-Hans">
            词
          </div>
        </div>
      </section>

      <BlogHighlights />

      <section className="mandora-cta home-final-cta">
        <div className="public-container mandora-cta__inner">
          <div>
            <p className="public-eyebrow public-eyebrow--light">Hành trình Mandora</p>
            <h2>Bắt đầu từ một bài học nhỏ hôm nay.</h2>
          </div>
          <div className="home-final-cta__actions">
            <Link className="button button--light" to="/courses">
              Xem khóa học <span aria-hidden="true">→</span>
            </Link>
            <Link className="button button--ghost-light" to="/login">
              Đăng nhập
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
