import { useEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import Brand from '../../../components/ui/Brand.jsx';
import { PUBLIC_NAVIGATION } from '../../../constants/navigation.js';
import ThemeToggle from '../../shared/ThemeToggle.jsx';
import { useStudentAuth } from '../../auth/StudentAuthContext.jsx';
import '../../student/styles/student-account.css';

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef(null);
  const auth = useStudentAuth();

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        setAccountOpen(false);
      }
    };
    const closeOnOutsideClick = (event) => {
      if (accountRef.current && !accountRef.current.contains(event.target)) {
        setAccountOpen(false);
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    window.addEventListener('pointerdown', closeOnOutsideClick);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('pointerdown', closeOnOutsideClick);
    };
  }, []);

  const closeMenu = () => {
    setMenuOpen(false);
    setAccountOpen(false);
  };

  const openNotifications = () => {
    setAccountOpen(false);
    setMenuOpen(false);
    window.dispatchEvent(new CustomEvent('mandora:open-notifications'));
  };

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
          {auth.status !== 'signed-in' && (
            <Link className="public-nav__login" onClick={closeMenu} to="/login">
              Đăng nhập
            </Link>
          )}
        </nav>
        <div className="public-header__utilities">
          <ThemeToggle compact />
          {auth.status === 'signed-in' && (
            <div className="student-account" ref={accountRef}>
              <button
                aria-expanded={accountOpen}
                className="student-account__trigger"
                onClick={() => setAccountOpen((open) => !open)}
                type="button"
              >
                <span className="student-account__avatar" aria-hidden="true">
                  {(auth.user?.displayName || auth.user?.username || 'H').slice(0, 1).toUpperCase()}
                </span>
                <span className="student-account__identity">
                  <strong>{auth.user?.displayName || auth.user?.username || 'Học viên'}</strong>
                  <small>Học viên</small>
                </span>
                <span aria-hidden="true">⌄</span>
              </button>
              {accountOpen && (
                <div className="student-account__menu">
                  <div className="student-account__menu-heading">
                    <strong>{auth.user?.displayName || auth.user?.username}</strong>
                    <small>{auth.user?.email}</small>
                  </div>
                  <Link onClick={closeMenu} to="/my-courses">Khóa học của tôi</Link>
                  <Link onClick={closeMenu} to="/vocabulary?saved=1">Từ vựng đã lưu</Link>
                  <Link onClick={closeMenu} to="/progress">Tiến độ học tập</Link>
                  <button onClick={openNotifications} type="button">Thông báo</button>
                  <div className="student-account__divider" />
                  <button
                    className="student-account__logout"
                    onClick={() => {
                      auth.logout();
                      closeMenu();
                    }}
                    type="button"
                  >
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          )}
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
