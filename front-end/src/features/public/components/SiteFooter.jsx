import { Link } from 'react-router-dom';
import Brand from '../../../components/ui/Brand.jsx';
import { PUBLIC_NAVIGATION } from '../../../constants/navigation.js';

export default function SiteFooter() {
  return (
    <footer className="public-footer">
      <div className="public-container public-footer__grid">
        <div className="public-footer__intro">
          <Brand inverse />
          <p>
            Nền tảng học tiếng Trung được thiết kế cho hành trình của người học Việt Nam.
          </p>
        </div>
        <nav aria-label="Điều hướng cuối trang" className="public-footer__nav">
          {PUBLIC_NAVIGATION.map((item) => (
            <Link key={item.to} to={item.to}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="public-container public-footer__bottom">
        <span>© {new Date().getFullYear()} Mandora. Bảo lưu mọi quyền.</span>
        <span>Học vững nền tảng. Tiến bộ mỗi ngày.</span>
      </div>
    </footer>
  );
}
