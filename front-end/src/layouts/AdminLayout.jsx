import { useEffect, useState } from 'react';
import AdminIcon from '../features/admin/components/AdminIcon.jsx';
import AdminQuickSearch from '../features/admin/components/AdminQuickSearch.jsx';
import { ADMIN_SECTIONS } from '../features/admin/constants.js';
import ThemeToggle from '../features/shared/ThemeToggle.jsx';

function can(currentUser, permission) {
  if (!permission || currentUser?.role === 'admin') return true;
  const permissions = Array.isArray(currentUser?.permissions)
    ? currentUser.permissions
    : [];
  return permissions.includes('*') || permissions.includes(permission);
}

export default function AdminLayout({
  activeSection,
  children,
  currentUser,
  headerTitle,
  onLogout,
  onNavigate,
}) {
  const role = currentUser?.role || 'employee';
  const sections = ADMIN_SECTIONS.filter((item) => can(currentUser, item.permission));
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const shortcut = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, []);

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar__top">
          <button
            aria-label="Về trang tổng quan Mandora"
            className="admin-brand"
            onClick={() => onNavigate('overview')}
            type="button"
          >
            Mandora<span>.</span>
          </button>
          <p className="admin-sidebar__label">Quản trị nội dung</p>
        </div>
        <nav className="admin-nav" aria-label="Điều hướng quản trị">
          {sections.map((item) => (
            <button
              aria-current={activeSection === item.key ? 'page' : undefined}
              className={`admin-nav__item${activeSection === item.key ? ' is-active' : ''}`}
              key={item.key}
              onClick={() => onNavigate(item.key)}
              type="button"
            >
              <AdminIcon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <button className="admin-sidebar__logout" onClick={onLogout} type="button">
          <AdminIcon name="logout" />
          <span>Đăng xuất</span>
        </button>
      </aside>

      <div className="admin-workspace">
        <header className="admin-header">
          <div>
            <p className="admin-eyebrow">
              {role === 'admin' ? 'Admin' : 'Employee'} /{' '}
              {activeSection === 'overview' ? 'Dashboard' : activeSection}
            </p>
            <h1>{headerTitle}</h1>
          </div>
          <div className="admin-header__actions">
            <button
              className="admin-global-search-button"
              onClick={() => setSearchOpen(true)}
              type="button"
            >
              <span>⌕</span>
              <strong>Tìm nhanh</strong>
              <kbd>Ctrl K</kbd>
            </button>
            <ThemeToggle compact />
            <div className="admin-account-chip">
              <div>
                <strong>
                  {currentUser?.displayName || currentUser?.username || 'Mandora User'}
                </strong>
                <small>{role}</small>
              </div>
            </div>
            <span className="admin-connection-status">
              <i /> Đã kết nối
            </span>
            <button
              aria-label="Đăng xuất"
              className="admin-header__logout"
              onClick={onLogout}
              type="button"
            >
              <AdminIcon name="logout" />
            </button>
          </div>
        </header>
        <main className="admin-main">{children}</main>
      </div>
      <AdminQuickSearch
        currentUser={currentUser}
        onClose={() => setSearchOpen(false)}
        onNavigate={onNavigate}
        open={searchOpen}
      />
    </div>
  );
}
