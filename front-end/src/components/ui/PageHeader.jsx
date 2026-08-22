export default function PageHeader({ actions, description, eyebrow, title }) {
  return (
    <header className="page-header">
      <div className="public-container page-header__inner">
        <div className="page-header__copy">
          {eyebrow && <p className="public-eyebrow">{eyebrow}</p>}
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
        {actions && <div className="page-header__actions">{actions}</div>}
      </div>
    </header>
  );
}
