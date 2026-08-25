import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePageTitle } from '../../../hooks/usePageTitle.js';
import { requestPasswordReset } from '../services/studentAuthService.js';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  usePageTitle('Quên mật khẩu');

  async function submit(event) {
    event.preventDefault();
    setStatus('loading');
    setError('');
    try {
      await requestPasswordReset(email);
      setStatus('success');
    } catch (caught) {
      setError(caught.message);
      setStatus('error');
    }
  }

  return (
    <section className="student-access-card" aria-labelledby="forgot-password-title">
      <p className="public-eyebrow">Khôi phục tài khoản</p>
      <h1 id="forgot-password-title">Quên mật khẩu?</h1>
      {status === 'success' ? (
        <div className="student-access-card__notice" role="status">
          <span aria-hidden="true">✓</span>
          <div>
            <strong>Kiểm tra hộp thư của bạn</strong>
            <p>
              Nếu email này thuộc một tài khoản Mandora, hướng dẫn đặt lại mật khẩu đã
              được gửi. Liên kết có hiệu lực trong 30 phút.
            </p>
          </div>
        </div>
      ) : (
        <form className="student-auth-form" onSubmit={submit}>
          <label>
            Email tài khoản
            <input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          {error && (
            <p className="student-auth-form__error" role="alert">
              {error}
            </p>
          )}
          <button className="button button--primary" disabled={status === 'loading'}>
            {status === 'loading' ? 'Đang gửi…' : 'Gửi hướng dẫn'}
          </button>
        </form>
      )}
      <p>
        <Link to="/login">Quay lại đăng nhập</Link>
      </p>
    </section>
  );
}
