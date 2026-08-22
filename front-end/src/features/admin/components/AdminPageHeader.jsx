export default function AdminPageHeader({ action, description, eyebrow, title }) {
  return (
    <header className="admin-page-header">
      <div>
        {eyebrow && <p className="admin-eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="admin-page-header__action">{action}</div>}
    </header>
  );
}
