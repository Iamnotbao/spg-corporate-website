import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import Brand from '../../../components/ui/Brand.jsx';
import { PUBLIC_NAVIGATION } from '../../../constants/navigation.js';
import ThemeToggle from '../../shared/ThemeToggle.jsx';
import { useStudentAuth } from '../../auth/StudentAuthContext.jsx';

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const auth = useStudentAuth();

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
        <nav
          aria-label="Điều hướng chính"
          className={`public-nav${menuOpen ? ' is-open' : ''}`}
          id="public-site-navigation"
        >
          {PUBLIC_NAVIGATION.map((item) => (
            <NavLink
              className={({ isActive }) => (isActive ? 'is-active' : undefined)}
              end={item.end}
              key={item.to}
              onClick={closeMenu}
              to={item.to}
            >
              {item.label}
            </NavLink>
          ))}
          {auth.status === 'signed-in' ? (
            <>
              <NavLink onClick={closeMenu} to="/my-courses">
                Khóa học của tôi
              </NavLink>
              <button
                className="public-nav__login"
                onClick={() => {
                  auth.logout();
                  closeMenu();
                }}
                type="button"
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <Link className="public-nav__login" onClick={closeMenu} to="/login">
              Đăng nhập
            </Link>
          )}
        </nav>
        <div className="public-header__utilities">
          <ThemeToggle compact />
          <button
            aria-controls="public-site-navigation"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Đóng trình đơn' : 'Mở trình đơn'}
            className={`public-menu-toggle${menuOpen ? ' is-open' : ''}`}
            onClick={() => setMenuOpen((open) => !open)}
            type="button"
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
    </header>
  );
}
