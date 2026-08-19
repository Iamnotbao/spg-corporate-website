import BackToTop from './BackToTop.jsx';
import PublicCommunications from './PublicCommunications.jsx';
import SiteFooter from './SiteFooter.jsx';
import SiteHeader from './SiteHeader.jsx';
import '../../../styles/public-communications.css';

export default function PublicLayout({ children }) {
  return (
    <div className="public-shell">
      <a className="public-skip-link" href="#public-main-content">
        Chuyển đến nội dung chính
      </a>
      <PublicCommunications />
      <SiteHeader />
      <main id="public-main-content">{children}</main>
      <SiteFooter />
      <BackToTop />
    </div>
  );
}
