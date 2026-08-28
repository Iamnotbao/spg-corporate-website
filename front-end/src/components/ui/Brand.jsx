import { Link } from 'react-router-dom';

export default function Brand({ inverse = false, onNavigate }) {
  return (
    <Link
      aria-label="Hanyora - Trang chủ"
      className={`mandora-brand${inverse ? ' mandora-brand--inverse' : ''}`}
      onClick={onNavigate}
      to="/"
    >
      <span className="mandora-brand__mark" aria-hidden="true">
        H
      </span>
      <span className="mandora-brand__copy">
        <strong>Hanyora</strong>
        <small>Tiếng Trung cho người Việt</small>
      </span>
    </Link>
  );
}
