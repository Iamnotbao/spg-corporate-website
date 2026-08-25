import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { API_URL, apiRequest } from '../../../services/httpClient.js';
import { usePageTitle } from '../../../hooks/usePageTitle.js';
import { useStudentAuth } from '../StudentAuthContext.jsx';
import '../styles/login.css';

const REMEMBERED_IDENTIFIER_KEY = 'mandora_remembered_identifier';

function rememberedIdentifier() {
  try {
    return localStorage.getItem(REMEMBERED_IDENTIFIER_KEY) || '';
  } catch {
    return '';
  }
}

function saveRememberedIdentifier(value) {
  try {
    if (value) localStorage.setItem(REMEMBERED_IDENTIFIER_KEY, value);
    else localStorage.removeItem(REMEMBERED_IDENTIFIER_KEY);
  } catch {
    // Storage can be unavailable in private/restricted browser contexts.
  }
}

export default function LoginPage({ initialMode = 'login' }) {
  const savedIdentifier = rememberedIdentifier();
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({
    displayName: '',
    email: '',
    username: initialMode === 'login' ? savedIdentifier : '',
    password: '',
  });
  const [rememberLogin, setRememberLogin] = useState(Boolean(savedIdentifier));
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [social, setSocial] = useState({ google: false, facebook: false });
  const auth = useStudentAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isRegister = mode === 'register';
  usePageTitle(isRegister ? 'Đăng ký' : 'Đăng nhập');

  useEffect(() => {
    apiRequest('/auth/oauth/status')
      .then((response) => setSocial(response?.data || {}))
      .catch(() => setSocial({ google: false, facebook: false }));
  }, []);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      if (isRegister) {
        await auth.register(form);
      } else {
        await auth.login({ identifier: form.username, password: form.password });
        saveRememberedIdentifier(rememberLogin ? form.username.trim() : '');
      }
      navigate(location.state?.from || '/dashboard', { replace: true });
    } catch (caught) {
      setError(caught.message);
    } finally {
      setSubmitting(false);
    }
  }

  function socialLogin(provider) {
    window.location.assign(`${API_URL}/auth/oauth/${provider}`);
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setError('');
    setForm((current) => ({
      ...current,
      username: nextMode === 'login' ? rememberedIdentifier() || current.username : '',
      password: '',
    }));
  }

  return (
    <section className="student-access-card student-login-card" aria-labelledby="student-login-title">
      <header className="student-login-card__header">
        <span className="student-login-card__mark" aria-hidden="true">
          学
        </span>
        <div>
          <p className="public-eyebrow">Không gian học viên</p>
          <h1 id="student-login-title">
            {isRegister ? 'Tạo tài khoản Mandora' : 'Chào mừng bạn trở lại'}
          </h1>
          <p className="student-login-card__lead">
            {isRegister
              ? 'Tạo tài khoản để lưu tiến độ, từ vựng và lịch ôn tập của bạn.'
              : 'Đăng nhập để tiếp tục đúng nơi bạn đã dừng lại.'}
          </p>
        </div>
      </header>

      <form className="student-auth-form student-login-form" onSubmit={submit}>
        {isRegister && (
          <div className="student-login-form__two-columns">
            <label>
              Họ tên
              <input
                required
                autoComplete="name"
                maxLength="100"
                value={form.displayName}
                onChange={(event) =>
                  setForm({ ...form, displayName: event.target.value })
                }
              />
            </label>
            <label>
              Email
              <input
                required
                autoComplete="email"
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </label>
          </div>
        )}

        <label>
          {isRegister ? 'Tên đăng nhập' : 'Tên đăng nhập hoặc email'}
          <input
            required
            autoComplete="username"
            value={form.username}
            onChange={(event) => setForm({ ...form, username: event.target.value })}
          />
        </label>

        <label>
          Mật khẩu
          <input
            required
            minLength="8"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            type="password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
          />
        </label>

        {!isRegister && (
          <div className="student-login-form__options">
            <label className="student-login-remember">
              <input
                checked={rememberLogin}
                onChange={(event) => setRememberLogin(event.target.checked)}
                type="checkbox"
              />
              <span>Ghi nhớ đăng nhập</span>
            </label>
            <Link to="/forgot-password">Quên mật khẩu?</Link>
          </div>
        )}

        {error && (
          <p className="student-auth-form__error student-login-error" role="alert">
            {error}
          </p>
        )}

        <button
          className="button button--primary student-login-submit"
          disabled={submitting}
          type="submit"
        >
          {submitting ? 'Đang xử lý…' : isRegister ? 'Tạo tài khoản' : 'Đăng nhập'}
        </button>
      </form>

      <div className="student-login-divider" aria-hidden="true">
        <span>hoặc tiếp tục với</span>
      </div>

      <div className="student-social-auth" aria-label="Đăng nhập nhanh">
        <button
          className="student-social-button"
          disabled={!social.google}
          onClick={() => socialLogin('google')}
          type="button"
        >
          <span className="student-social-button__icon" aria-hidden="true">
            G
          </span>
          <span>Google</span>
          {!social.google && <small>Chưa cấu hình</small>}
        </button>
        <button
          className="student-social-button"
          disabled={!social.facebook}
          onClick={() => socialLogin('facebook')}
          type="button"
        >
          <span className="student-social-button__icon" aria-hidden="true">
            f
          </span>
          <span>Facebook</span>
          {!social.facebook && <small>Chưa cấu hình</small>}
        </button>
      </div>

      <p className="student-login-card__switch">
        {isRegister ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}{' '}
        <Link
          onClick={() => changeMode(isRegister ? 'login' : 'register')}
          to={isRegister ? '/login' : '/register'}
        >
          {isRegister ? 'Đăng nhập' : 'Đăng ký ngay'}
        </Link>
      </p>

      {!isRegister && (
        <p className="student-login-card__security-note">
          “Ghi nhớ đăng nhập” chỉ lưu tên đăng nhập/email trên thiết bị này. Mandora không
          lưu mật khẩu thô trong trình duyệt.
        </p>
      )}
    </section>
  );
}
