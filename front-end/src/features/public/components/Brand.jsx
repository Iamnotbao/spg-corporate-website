import { Link } from 'react-router-dom';

const LOGO_URL = import.meta.env.VITE_LOGO_URL || import.meta.env.VITE_LOGO || '';

export default function Brand({ inverse = false, onNavigate }) {
  return (
    <Link
      className={`public-brand${inverse ? ' public-brand--inverse' : ''}`}
      to="/"
      aria-label="Chí Hùng SPG - Trang chủ"
      onClick={onNavigate}
    >
      {LOGO_URL ? (
        <span className="public-brand__logo-frame">
          <img src={LOGO_URL} alt="Chí Hùng SPG" />
        </span>
      ) : (
        <span className="public-brand__wordmark" aria-hidden="true">SPG<span>.</span></span>
      )}
      <span className="public-brand__descriptor">
        <strong>Footwear</strong>
        <small>Manufacturing · Vietnam</small>
      </span>
    </Link>
  );
}
