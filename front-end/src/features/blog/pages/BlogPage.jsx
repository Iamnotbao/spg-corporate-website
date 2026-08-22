import { usePageTitle } from '../../../hooks/usePageTitle.js';

export default function BlogPage() {
  usePageTitle('Blog');

  return (
    <section className="foundation-page">
      <div className="public-container foundation-page__inner">
        <p className="public-eyebrow">Góc học tiếng Trung</p>
        <h1>Blog</h1>
        <p>
          Kiến thức ngôn ngữ, phương pháp học và những gợi ý giúp bạn duy trì nhịp học
          tiếng Trung.
        </p>
        <div className="foundation-page__status">
          <span aria-hidden="true">阅</span>
          <div>
            <strong>Chưa có bài viết Mandora được xuất bản</strong>
            <p>
              Nội dung cũ không được đưa sang Blog mới nếu chưa được biên tập và xác nhận.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
