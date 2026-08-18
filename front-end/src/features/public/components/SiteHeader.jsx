import { useEffect, useState } from 'react';
import Brand from './Brand.jsx';

const navigation = [
  ['about', 'Về chúng tôi'],
  ['services', 'Dịch vụ'],
  ['process', 'Quy trình'],
  ['news', 'Tin tức'],
  ['careers', 'Tuyển dụng'],
];

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="public-header">
      <div className="public-container public-header__inner">
        <Brand onNavigate={closeMenu} />

        <button
          className="public-menu-toggle"
          type="button"
          aria-controls="public-site-navigation"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Đóng trình đơn' : 'Mở trình đơn'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>

        <div
          className={`public-header__navigation${menuOpen ? ' is-open' : ''}`}
          id="public-site-navigation"
        >
          <nav className="public-nav" aria-label="Điều hướng chính">
            {navigation.map(([id, label]) => (
              <a key={id} href={`/#${id}`} onClick={closeMenu}>
                {label}
              </a>
            ))}
          </nav>
          <a className="public-header__cta" href="/#contact" onClick={closeMenu}>
            Liên hệ
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </header>
  );
}
