import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Brand from '../../../components/ui/Brand.jsx';
import { PUBLIC_NAVIGATION } from '../../../constants/navigation.js';
import { getPublicSiteProfile } from '../../../services/siteProfileService.js';
import GoogleMapEmbed from '../../shared/GoogleMapEmbed.jsx';
import '../../../styles/map-embed.css';

export default function SiteFooter() {
  const [location, setLocation] = useState({});

  useEffect(() => {
    const controller = new AbortController();
    getPublicSiteProfile({ signal: controller.signal })
      .then((payload) => setLocation(payload?.data?.location || {}))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const hasMap = Boolean(
    location?.embedUrl ||
      (location?.address && import.meta.env.VITE_GOOGLE_MAPS_EMBED_KEY),
  );

  return (
    <footer className="public-footer">
      <div className={`public-container public-footer__grid${hasMap ? ' has-map' : ''}`}>
        <div className="public-footer__intro">
          <Brand inverse />
          <p>
            Nền tảng học tiếng Trung được thiết kế cho hành trình của người học Việt Nam.
          </p>
          <nav aria-label="Điều hướng cuối trang" className="public-footer__nav">
            {PUBLIC_NAVIGATION.map((item) => (
              <Link key={item.to} to={item.to}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        {hasMap && (
          <div className="public-footer__map" aria-label="Bản đồ Hanyora">
            <GoogleMapEmbed location={location} title={location?.name || 'Hanyora trên Google Maps'} />
          </div>
        )}
      </div>
      <div className="public-container public-footer__bottom">
        <span>© {new Date().getFullYear()} Hanyora. Bảo lưu mọi quyền.</span>
        <span>Học vững nền tảng. Tiến bộ mỗi ngày.</span>
      </div>
    </footer>
  );
}
