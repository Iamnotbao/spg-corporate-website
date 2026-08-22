import { Link } from 'react-router-dom';
import { LEARNING_AREAS } from '../../../constants/navigation.js';
import { usePageTitle } from '../../../hooks/usePageTitle.js';

export default function HomePage() {
  usePageTitle('Học tiếng Trung cho người Việt');

  return (
    <>
      <section className="mandora-hero">
        <div className="public-container mandora-hero__grid">
          <div className="mandora-hero__copy">
            <p className="public-eyebrow">Mandora · Tiếng Trung cho người Việt</p>
            <h1>
              Học tiếng Trung rõ ràng,
              <span> từng bước một.</span>
            </h1>
            <p className="mandora-hero__lead">
              Xây nền tảng ngôn ngữ qua lộ trình có cấu trúc, nội dung dễ tiếp cận và trải
              nghiệm học tập tập trung.
            </p>
            <div className="mandora-hero__actions">
              <Link className="button button--primary" to="/courses">
                Khám phá lộ trình <span aria-hidden="true">→</span>
              </Link>
              <Link className="button button--secondary" to="/blog">
                Đọc Blog
              </Link>
            </div>
          </div>
          <div className="mandora-hero__visual" aria-label="Ví dụ tiếng Trung: xin chào">
            <div className="mandora-hero__halo" />
            <article className="learning-card">
              <span className="learning-card__label">Bắt đầu từ điều gần gũi</span>
              <strong lang="zh-Hans">你好</strong>
              <span className="learning-card__pinyin">nǐ hǎo</span>
              <p>Xin chào</p>
            </article>
            <span className="learning-orbit learning-orbit--one">声调 · Thanh điệu</span>
            <span className="learning-orbit learning-orbit--two">汉字 · Hán tự</span>
          </div>
        </div>
      </section>

      <section className="mandora-section" aria-labelledby="learning-path-title">
        <div className="public-container">
          <div className="section-heading">
            <div>
              <p className="public-eyebrow">Một nền tảng, nhiều cách học</p>
              <h2 id="learning-path-title">Chọn điểm bắt đầu phù hợp.</h2>
            </div>
            <p>
              Mandora tổ chức nội dung theo các khu vực học tập rõ ràng để người học dễ
              định hướng và tập trung vào mục tiêu hiện tại.
            </p>
          </div>
          <div className="learning-area-grid">
            {LEARNING_AREAS.map((area, index) => (
              <Link className="learning-area-card" key={area.to} to={area.to}>
                <span className="learning-area-card__index">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <p>{area.eyebrow}</p>
                <h3>{area.title}</h3>
                <span>{area.description}</span>
                <i aria-hidden="true">→</i>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mandora-section mandora-section--tinted">
        <div className="public-container mandora-principles">
          <div className="section-heading section-heading--compact">
            <div>
              <p className="public-eyebrow">Thiết kế cho hành trình học thật</p>
              <h2>Gọn gàng để bạn tập trung.</h2>
            </div>
          </div>
          <div className="principle-grid">
            <article>
              <span aria-hidden="true">01</span>
              <h3>Dành cho người Việt</h3>
              <p>
                Giải thích và điều hướng bằng tiếng Việt, gần với cách người Việt học.
              </p>
            </article>
            <article>
              <span aria-hidden="true">02</span>
              <h3>Học theo cấu trúc</h3>
              <p>Nội dung được tổ chức thành những phần rõ ràng, không gây quá tải.</p>
            </article>
            <article>
              <span aria-hidden="true">03</span>
              <h3>Tiến bộ có định hướng</h3>
              <p>Mỗi khu vực học tập phục vụ một mục tiêu cụ thể trong lộ trình.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="mandora-cta">
        <div className="public-container mandora-cta__inner">
          <div>
            <p className="public-eyebrow public-eyebrow--light">Mandora V1</p>
            <h2>Sẵn sàng xây nền tiếng Trung vững chắc?</h2>
          </div>
          <Link className="button button--light" to="/login">
            Đăng nhập <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    </>
  );
}
