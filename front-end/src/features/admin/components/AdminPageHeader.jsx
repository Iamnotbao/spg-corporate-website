import AdminIcon from './AdminIcon.jsx';

export default function AdminPageHeader({ action, description, eyebrow, onBack, title }) {
  return (
    <header className="admin-page-header">
      <div>
        {onBack && (
          <button className="admin-page-header__back" onClick={onBack} type="button">
            <AdminIcon name="arrowLeft" size={16} />
            Quay lại
          </button>
        )}
        {eyebrow && <p className="admin-eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="admin-page-header__action">{action}</div>}
    </header>
  );
}
