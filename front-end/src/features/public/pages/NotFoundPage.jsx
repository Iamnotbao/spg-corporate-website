import { Link } from 'react-router-dom';
import { usePageTitle } from '../../../hooks/usePageTitle.js';

export default function NotFoundPage() {
  usePageTitle('Không tìm thấy trang');

  return (
    <section className="foundation-page">
      <div className="public-container foundation-page__inner foundation-page__inner--centered">
        <span className="not-found-code">404</span>
        <p className="public-eyebrow">Không tìm thấy trang</p>
        <h1>Đường dẫn này không còn tồn tại.</h1>
        <p>
          Hãy quay lại trang chủ hoặc tiếp tục khám phá các khu vực học tập của Mandora.
        </p>
        <Link className="button button--primary" to="/">
          Về trang chủ
        </Link>
      </div>
    </section>
  );
}
