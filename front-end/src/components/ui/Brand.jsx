import { Link } from 'react-router-dom';

export default function Brand({ inverse = false, onNavigate }) {
  return (
    <Link
      aria-label="Mandora - Trang chủ"
      className={`mandora-brand${inverse ? ' mandora-brand--inverse' : ''}`}
      onClick={onNavigate}
      to="/"
    >
      <span className="mandora-brand__mark" aria-hidden="true">
        M
      </span>
      <span className="mandora-brand__copy">
        <strong>Mandora</strong>
        <small>Tiếng Trung cho người Việt</small>
      </span>
    </Link>
  );
}
