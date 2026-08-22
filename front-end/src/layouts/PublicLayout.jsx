import { Outlet } from 'react-router-dom';
import BackToTop from '../features/public/components/BackToTop.jsx';
import SiteFooter from '../features/public/components/SiteFooter.jsx';
import SiteHeader from '../features/public/components/SiteHeader.jsx';
import '../styles/mandora-public.css';

export default function PublicLayout({ children }) {
  return (
    <div className="public-shell">
      <a className="public-skip-link" href="#main-content">
        Chuyển đến nội dung chính
      </a>
      <SiteHeader />
      <main id="main-content">{children || <Outlet />}</main>
      <SiteFooter />
      <BackToTop />
    </div>
  );
}
