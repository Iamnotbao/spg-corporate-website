import { Link } from 'react-router-dom';
import { usePageTitle } from '../../../hooks/usePageTitle.js';

export default function FoundationPage({ eyebrow, title, description }) {
  usePageTitle(title);

  return (
    <section className="foundation-page">
      <div className="public-container foundation-page__inner">
        <p className="public-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
        <div className="foundation-page__status">
          <span aria-hidden="true">文</span>
          <div>
            <strong>Nội dung Mandora đang được chuẩn bị</strong>
            <p>
              Khu vực này sẽ được kết nối với dữ liệu học tập trong giai đoạn tiếp theo.
            </p>
          </div>
        </div>
        <Link className="text-link" to="/">
          ← Về trang chủ
        </Link>
      </div>
    </section>
  );
}
