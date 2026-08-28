import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { usePageTitle } from '../../../hooks/usePageTitle.js';
import { API_URL, apiRequest } from '../../../services/httpClient.js';
import AuthVisualPanel from '../components/AuthVisualPanel.jsx';
import { PasswordVisibilityIcon } from '../components/AuthIcons.jsx';
import SocialLoginButtons from '../components/SocialLoginButtons.jsx';
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
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [social, setSocial] = useState({
    google: false,
    facebook: false,
    loading: true,
  });
  const auth = useStudentAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isRegister = mode === 'register';
  const title = isRegister ? 'Tạo tài khoản' : 'Đăng nhập';
  usePageTitle(isRegister ? 'Đăng ký' : 'Đăng nhập');

  useEffect(() => {
    apiRequest('/auth/oauth/status')
      .then((response) => setSocial({ ...response?.data, loading: false }))
      .catch(() => setSocial({ google: false, facebook: false, loading: false }));
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
    setShowPassword(false);
    setForm((current) => ({
      ...current,
      username: nextMode === 'login' ? rememberedIdentifier() || current.username : '',
      password: '',
    }));
  }

  return (
    <section className="student-login-shell" aria-labelledby="student-login-title">
      <div className="student-login-panel">
        <header className="student-login-panel__header">
          <p className="public-eyebrow">Hanyora dành cho học viên</p>
          <h1 id="student-login-title">{title}</h1>
          <p>
            {isRegister
              ? 'Bắt đầu hành trình học tiếng Trung và lưu lại tiến độ của bạn.'
              : 'Tiếp tục hành trình học tiếng Trung của bạn.'}
          </p>
        </header>

        <form
          aria-busy={submitting}
          className="student-auth-form student-login-form"
          onSubmit={submit}
        >
          {isRegister && (
            <div className="student-login-form__two-columns">
              <label htmlFor="student-display-name">
                Họ tên
                <input
                  autoComplete="name"
                  id="student-display-name"
                  maxLength="100"
                  required
                  value={form.displayName}
                  onChange={(event) =>
                    setForm({ ...form, displayName: event.target.value })
                  }
                />
              </label>
              <label htmlFor="student-email">
                Email
                <input
                  autoComplete="email"
                  id="student-email"
                  required
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                />
              </label>
            </div>
          )}

          <label htmlFor="student-identifier">
            {isRegister ? 'Tên đăng nhập' : 'Tên đăng nhập hoặc email'}
            <input
              aria-describedby={error ? 'student-login-error' : undefined}
              aria-invalid={error ? 'true' : undefined}
              autoComplete="username"
              id="student-identifier"
              required
              value={form.username}
              onChange={(event) => setForm({ ...form, username: event.target.value })}
            />
          </label>

          <div className="student-login-form__field">
            <label htmlFor="student-password">Mật khẩu</label>
            <span className="student-password-field">
              <input
                aria-describedby={error ? 'student-login-error' : undefined}
                aria-invalid={error ? 'true' : undefined}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                id="student-password"
                minLength="8"
                required
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
              />
              <button
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                aria-pressed={showPassword}
                className="student-password-field__toggle"
                onClick={() => setShowPassword((visible) => !visible)}
                type="button"
              >
                <PasswordVisibilityIcon visible={showPassword} />
              </button>
            </span>
          </div>

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
            <p
              className="student-auth-form__error student-login-error"
              id="student-login-error"
              role="alert"
            >
              {error}
            </p>
          )}

          <button
            className="button button--primary student-login-submit"
            disabled={submitting}
            type="submit"
          >
            {submitting ? 'Đang xử lý…' : title}
          </button>
        </form>

        <div className="student-login-divider" aria-hidden="true">
          <span>Hoặc tiếp tục với</span>
        </div>

        <SocialLoginButtons providers={social} onLogin={socialLogin} />

        <p className="student-login-panel__switch">
          {isRegister ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}{' '}
          <Link
            onClick={() => changeMode(isRegister ? 'login' : 'register')}
            to={isRegister ? '/login' : '/register'}
          >
            {isRegister ? 'Đăng nhập' : 'Đăng ký ngay'}
          </Link>
        </p>

        {!isRegister && (
          <p className="student-login-panel__security-note">
            “Ghi nhớ đăng nhập” chỉ lưu tên đăng nhập hoặc email trên thiết bị này.
          </p>
        )}
      </div>

      <AuthVisualPanel />
    </section>
  );
}
