import BackToTop from './BackToTop.jsx';
import PublicCommunications from './PublicCommunications.jsx';
import SiteFooter from './SiteFooter.jsx';
import SiteHeader from './SiteHeader.jsx';
import SocialChatDock from './SocialChatDock.jsx';
import { usePublicLanguage } from '../i18n.js';
import '../../../styles/public-communications.css';

const SKIP = {
  vi: 'Chuyển đến nội dung chính',
  en: 'Skip to main content',
  'zh-tw': '跳至主要內容',
};

export default function PublicLayout({ children }) {
  const language = usePublicLanguage();
  return (
    <div className="public-shell">
      <a className="public-skip-link" href="#public-main-content">
        {SKIP[language] || SKIP.vi}
      </a>
      <PublicCommunications />
      <SiteHeader />
      <main id="public-main-content">{children}</main>
      <SiteFooter />
      <BackToTop />
      <SocialChatDock />
    </div>
  );
}
