import SiteFooter from './SiteFooter.jsx';
import SiteHeader from './SiteHeader.jsx';

export default function PublicLayout({ children }) {
  return (
    <div className="public-shell">
      <a className="public-skip-link" href="#public-main-content">
        Chuyển đến nội dung chính
      </a>
      <SiteHeader />
      <main id="public-main-content">{children}</main>
      <SiteFooter />
    </div>
  );
}
