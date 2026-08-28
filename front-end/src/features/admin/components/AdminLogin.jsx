import { useState } from 'react';
import AdminIcon from './AdminIcon.jsx';

export default function AdminLogin({ error, onSubmit, submitting, checking = false }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    const success = await onSubmit(username, password);
    if (!success) setPassword('');
  }

  return (
    <main className="admin-login">
      <section className="admin-login__card" aria-labelledby="admin-login-title">
        <div className="admin-login__brand" aria-label="Hanyora">
          Hanyora<span>.</span>
        </div>
        <p className="admin-eyebrow">Cổng quản trị nội dung</p>
        <h1 id="admin-login-title">Chào mừng trở lại</h1>
        <p className="admin-login__subtitle">
          Đăng nhập bằng tài khoản được cấp để quản lý nội dung Hanyora.
        </p>

        {checking ? (
          <div className="admin-session-check" role="status">
            <span className="admin-spinner" />
            <span>Đang kiểm tra phiên đăng nhập…</span>
          </div>
        ) : (
          <form className="admin-login__form" onSubmit={handleSubmit}>
            <label htmlFor="admin-username">Tên đăng nhập</label>
            <input
              id="admin-username"
              autoComplete="username"
              autoFocus
              disabled={submitting}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Ví dụ: admin"
              required
              type="text"
              value={username}
            />
            <label htmlFor="admin-password">Mật khẩu</label>
            <input
              id="admin-password"
              autoComplete="current-password"
              disabled={submitting}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Nhập mật khẩu"
              required
              type="password"
              value={password}
            />
            {error && (
              <div className="admin-alert admin-alert--error" role="alert">
                <AdminIcon name="warning" size={18} />
                <span>{error}</span>
              </div>
            )}
            <button
              className="admin-button admin-button--primary admin-button--full"
              disabled={submitting}
              type="submit"
            >
              {submitting && <span className="admin-spinner" />}
              {submitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
            </button>
          </form>
        )}
        <p className="admin-login__hint">
          Phiên đăng nhập được bảo vệ và tự động hết hạn.
        </p>
      </section>
    </main>
  );
}
