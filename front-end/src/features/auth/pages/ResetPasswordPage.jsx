import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { usePageTitle } from '../../../hooks/usePageTitle.js';
import { resetStudentPassword } from '../services/studentAuthService.js';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  usePageTitle('Đặt lại mật khẩu');

  async function submit(event) {
    event.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }
    setStatus('loading');
    setError('');
    try {
      await resetStudentPassword({ token, ...form });
      setStatus('success');
    } catch (caught) {
      setError(
        caught.status === 400
          ? 'Liên kết không hợp lệ, đã hết hạn hoặc đã được sử dụng.'
          : caught.message,
      );
      setStatus('error');
    }
  }

  const invalidLink = !token;
  return (
    <section className="student-access-card" aria-labelledby="reset-password-title">
      <p className="public-eyebrow">Bảo mật tài khoản</p>
      <h1 id="reset-password-title">Đặt lại mật khẩu</h1>
      {status === 'success' ? (
        <div className="student-access-card__notice" role="status">
          <span aria-hidden="true">✓</span>
          <div>
            <strong>Mật khẩu đã được thay đổi</strong>
            <p>
              Bạn có thể đăng nhập bằng mật khẩu mới. Các phiên đăng nhập cũ đã hết hiệu
              lực.
            </p>
          </div>
        </div>
      ) : invalidLink ? (
        <div className="student-access-card__notice is-error" role="alert">
          <span aria-hidden="true">!</span>
          <div>
            <strong>Liên kết không hợp lệ</strong>
            <p>Hãy yêu cầu một liên kết đặt lại mật khẩu mới.</p>
          </div>
        </div>
      ) : (
        <form className="student-auth-form" onSubmit={submit}>
          <label>
            Mật khẩu mới
            <input
              autoComplete="new-password"
              minLength="8"
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              required
              type="password"
              value={form.password}
            />
          </label>
          <label>
            Xác nhận mật khẩu mới
            <input
              autoComplete="new-password"
              minLength="8"
              onChange={(event) =>
                setForm({ ...form, confirmPassword: event.target.value })
              }
              required
              type="password"
              value={form.confirmPassword}
            />
          </label>
          {error && (
            <p className="student-auth-form__error" role="alert">
              {error}
            </p>
          )}
          <button className="button button--primary" disabled={status === 'loading'}>
            {status === 'loading' ? 'Đang cập nhật…' : 'Đổi mật khẩu'}
          </button>
        </form>
      )}
      <p>
        <Link to={status === 'success' ? '/login' : '/forgot-password'}>
          {status === 'success' ? 'Đăng nhập' : 'Yêu cầu liên kết mới'}
        </Link>
      </p>
    </section>
  );
}
