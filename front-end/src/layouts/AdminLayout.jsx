import { useEffect, useMemo, useState } from 'react';
import AdminIcon from '../features/admin/components/AdminIcon.jsx';
import AdminQuickSearch from '../features/admin/components/AdminQuickSearch.jsx';
import { ADMIN_NAV_GROUPS, canAccessAdminSection } from '../features/admin/navigation.js';
import ThemeToggle from '../features/shared/ThemeToggle.jsx';

export default function AdminLayout({
  activeSection,
  children,
  currentUser,
  headerTitle,
  onLogout,
  onNavigate,
}) {
  const role = currentUser?.role || 'employee';
  const [searchOpen, setSearchOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigationGroups = useMemo(
    () =>
      ADMIN_NAV_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter((item) => canAccessAdminSection(currentUser, item)),
      })).filter((group) => group.items.length),
    [currentUser],
  );

  useEffect(() => {
    const shortcut = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
      if (event.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 900px)');
    const syncMobileState = () => {
      if (media.matches) setSidebarCollapsed(false);
      else setDrawerOpen(false);
    };
    syncMobileState();
    media.addEventListener('change', syncMobileState);
    return () => media.removeEventListener('change', syncMobileState);
  }, []);

  function navigate(section) {
    setDrawerOpen(false);
    onNavigate(section);
  }

  return (
    <div
      className={`admin-shell admin-shell--phase-three${sidebarCollapsed ? ' is-sidebar-collapsed' : ''}${drawerOpen ? ' is-drawer-open' : ''}`}
    >
      <button
        aria-label="Đóng trình đơn quản trị"
        className="admin-drawer-scrim"
        onClick={() => setDrawerOpen(false)}
        type="button"
      />
      <aside className="admin-sidebar" id="admin-sidebar">
        <div className="admin-sidebar__top">
          <button
            aria-label="Về Dashboard Hanyora"
            className="admin-brand"
            onClick={() => navigate('dashboard')}
            type="button"
          >
            <span className="admin-brand__mark" aria-hidden="true">文</span>
            <span className="admin-brand__name">Hanyora</span>
          </button>
          <button
            aria-label={sidebarCollapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
            className="admin-sidebar__collapse"
            onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
            type="button"
          >
            <AdminIcon name="collapse" size={17} />
          </button>
        </div>

        <nav className="admin-nav" aria-label="Điều hướng quản trị">
          {navigationGroups.map((group) => (
            <div className="admin-nav__group" key={group.label || 'dashboard'}>
              {group.label && <p className="admin-nav__group-label">{group.label}</p>}
              {group.items.map((item) => (
                <button
                  aria-current={activeSection === item.key ? 'page' : undefined}
                  aria-label={sidebarCollapsed ? item.label : undefined}
                  className={`admin-nav__item${activeSection === item.key ? ' is-active' : ''}`}
                  key={item.key}
                  onClick={() => navigate(item.key)}
                  title={sidebarCollapsed ? item.label : undefined}
                  type="button"
                >
                  <AdminIcon name={item.icon} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="admin-sidebar__footer">
          <div className="admin-sidebar__account">
            <span>
              {String(currentUser?.displayName || currentUser?.username || 'H')
                .charAt(0)
                .toUpperCase()}
            </span>
            <div>
              <strong>{currentUser?.displayName || currentUser?.username || 'Hanyora User'}</strong>
              <small>{role === 'admin' ? 'Administrator' : 'CMS staff'}</small>
            </div>
          </div>
          <button className="admin-sidebar__logout" onClick={onLogout} type="button">
            <AdminIcon name="logout" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      <div className="admin-workspace">
        <header className="admin-header">
          <div className="admin-header__identity">
            <button
              aria-controls="admin-sidebar"
              aria-expanded={drawerOpen}
              aria-label="Mở trình đơn quản trị"
              className="admin-mobile-menu"
              onClick={() => setDrawerOpen(true)}
              type="button"
            >
              <AdminIcon name="menu" />
            </button>
            <div>
              <p className="admin-eyebrow">Hanyora CMS</p>
              <h1>{headerTitle}</h1>
            </div>
          </div>
          <div className="admin-header__actions">
            <button
              className="admin-global-search-button"
              onClick={() => setSearchOpen(true)}
              type="button"
            >
              <AdminIcon name="search" size={17} />
              <strong>Tìm nhanh</strong>
              <kbd>Ctrl K</kbd>
            </button>
            <ThemeToggle compact />
            <div className="admin-account-chip">
              <span>
                {String(currentUser?.displayName || currentUser?.username || 'H')
                  .charAt(0)
                  .toUpperCase()}
              </span>
              <div>
                <strong>{currentUser?.displayName || currentUser?.username || 'Hanyora User'}</strong>
                <small>{role}</small>
              </div>
            </div>
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
        onNavigate={navigate}
        open={searchOpen}
      />
    </div>
  );
}
