import { FacebookIcon, GoogleIcon } from './AuthIcons.jsx';

const PROVIDERS = [
  { id: 'google', label: 'Google', Icon: GoogleIcon },
  { id: 'facebook', label: 'Facebook', Icon: FacebookIcon },
];

export default function SocialLoginButtons({ providers, onLogin }) {
  return (
    <div className="student-social-auth" aria-label="Đăng nhập nhanh">
      {PROVIDERS.map(({ id, label, Icon }) => {
        const enabled = providers[id] === true;
        const statusId = `student-social-${id}-status`;
        const status = providers.loading ? 'Đang kiểm tra' : 'Chưa cấu hình';

        return (
          <button
            aria-describedby={!enabled ? statusId : undefined}
            className={`student-social-button student-social-button--${id}`}
            disabled={!enabled}
            key={id}
            onClick={() => onLogin(id)}
            type="button"
          >
            <span className="student-social-button__icon" aria-hidden="true">
              <Icon />
            </span>
            <span className="student-social-button__copy">
              <strong>{label}</strong>
              {!enabled && <small id={statusId}>{status}</small>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
