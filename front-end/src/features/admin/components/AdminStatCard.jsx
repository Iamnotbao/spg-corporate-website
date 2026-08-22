import AdminIcon from './AdminIcon.jsx';

export default function AdminStatCard({ helper, icon, label, onClick, value }) {
  const Component = onClick ? 'button' : 'article';
  const displayValue = Number.isFinite(value) ? value.toLocaleString('vi-VN') : '—';

  return (
    <Component
      className={`admin-stat-card${onClick ? '' : ' is-static'}`}
      onClick={onClick}
      type={onClick ? 'button' : undefined}
    >
      <span className="admin-stat-card__icon">
        <AdminIcon name={icon} size={22} />
      </span>
      <span className="admin-stat-card__copy">
        <span>{label}</span>
        <strong>{displayValue}</strong>
        <small>{helper}</small>
      </span>
      {onClick && <AdminIcon className="admin-stat-card__arrow" name="arrowRight" />}
    </Component>
  );
}
