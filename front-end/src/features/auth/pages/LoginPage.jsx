import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { API_URL, apiRequest } from '../../../services/httpClient.js';
import { usePageTitle } from '../../../hooks/usePageTitle.js';
import { useStudentAuth } from '../StudentAuthContext.jsx';

export default function LoginPage({ initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({
    displayName: '',
    email: '',
    username: '',
    password: '',
  });
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
      if (isRegister) await auth.register(form);
      else await auth.login({ identifier: form.username, password: form.password });
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

  return (
    <section className="student-access-card" aria-labelledby="student-login-title">
      <p className="public-eyebrow">Không gian học viên</p>
      <h1 id="student-login-title">
        {isRegister ? 'Tạo tài khoản Mandora' : 'Đăng nhập Mandora'}
      </h1>

      <div className="student-social-auth" aria-label="Đăng nhập nhanh">
        <button
          className="button button--secondary"
          disabled={!social.google}
          onClick={() => socialLogin('google')}
          type="button"
        >
          G&nbsp;&nbsp;Tiếp tục với Google
        </button>
        <button
          className="button button--secondary"
          disabled={!social.facebook}
          onClick={() => socialLogin('facebook')}
          type="button"
        >
          f&nbsp;&nbsp;Tiếp tục với Facebook
        </button>
        {!social.google && !social.facebook && (
          <small>Google/Facebook chưa được cấu hình trên máy chủ.</small>
        )}
      </div>

      <div className="student-auth-divider" aria-hidden="true">
        <span>hoặc</span>
      </div>

      <form className="student-auth-form" onSubmit={submit}>
        {isRegister && (
          <>
            <label>
              Họ tên
              <input
                required
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
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </label>
          </>
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
        {!isRegister && (
          <div className="student-auth-form__aside">
            <Link to="/forgot-password">Quên mật khẩu?</Link>
          </div>
        )}
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
        {error && (
          <p className="student-auth-form__error" role="alert">
            {error}
          </p>
        )}
        <button className="button button--primary" disabled={submitting} type="submit">
          {submitting ? 'Đang xử lý…' : isRegister ? 'Đăng ký' : 'Đăng nhập'}
        </button>
      </form>
      <p>
        {isRegister ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}{' '}
        <Link
          onClick={() => setMode(isRegister ? 'login' : 'register')}
          to={isRegister ? '/login' : '/register'}
        >
          {isRegister ? 'Đăng nhập' : 'Đăng ký'}
        </Link>
      </p>
    </section>
  );
}
