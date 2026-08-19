import { ADMIN_SECTIONS } from '../constants.js';
import AdminIcon from './AdminIcon.jsx';

export default function AdminLayout({
  activeSection,
  children,
  currentUser,
  headerTitle,
  onLogout,
  onNavigate,
}) {
  const role = currentUser?.role || 'employee';
  const sections = ADMIN_SECTIONS.filter((item) => !item.roles || item.roles.includes(role));

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar__top">
          <button
            className="admin-brand"
            onClick={() => onNavigate('overview')}
            type="button"
            aria-label="Về trang tổng quan"
          >
            SPG<span>.</span>
          </button>
          <p className="admin-sidebar__label">Quản trị website</p>
        </div>

        <nav className="admin-nav" aria-label="Điều hướng quản trị">
          {sections.map((item) => (
            <button
              aria-current={activeSection === item.key ? 'page' : undefined}
              className={`admin-nav__item${
                activeSection === item.key ? ' is-active' : ''
              }`}
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
              {role === 'admin' ? 'Admin' : 'Employee'} / {activeSection === 'overview' ? 'Dashboard' : activeSection}
            </p>
            <h1>{headerTitle}</h1>
          </div>
          <div className="admin-header__actions">
            <div className="admin-account-chip">
              <div>
                <strong>{currentUser?.displayName || currentUser?.username || 'SPG User'}</strong>
                <small>{role}</small>
              </div>
            </div>
            <span className="admin-connection-status">
              <i /> Đã kết nối
            </span>
            <button
              className="admin-header__logout"
              onClick={onLogout}
              type="button"
              aria-label="Đăng xuất"
            >
              <AdminIcon name="logout" />
            </button>
          </div>
        </header>

        <main className="admin-main">{children}</main>
      </div>
    </div>
  );
}
