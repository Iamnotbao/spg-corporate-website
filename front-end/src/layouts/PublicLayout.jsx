import { Outlet } from 'react-router-dom';
import BackToTop from '../features/public/components/BackToTop.jsx';
import PublicCommunications from '../features/public/components/PublicCommunications.jsx';
import SiteFooter from '../features/public/components/SiteFooter.jsx';
import SiteHeader from '../features/public/components/SiteHeader.jsx';
import SocialChatDock from '../features/public/components/SocialChatDock.jsx';
import '../styles/mandora-public.css';
import '../components/ui/ui.css';

export default function PublicLayout({ children }) {
  return (
    <div className="public-shell">
      <a className="public-skip-link" href="#main-content">
        Chuyển đến nội dung chính
      </a>
      <PublicCommunications />
      <SiteHeader />
      <main id="main-content">{children || <Outlet />}</main>
      <SiteFooter />
      <SocialChatDock />
      <BackToTop />
    </div>
  );
}
