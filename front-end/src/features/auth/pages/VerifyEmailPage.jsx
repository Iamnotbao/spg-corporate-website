import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { usePageTitle } from '../../../hooks/usePageTitle.js';
import { useStudentAuth } from '../StudentAuthContext.jsx';
import { verifyStudentEmail } from '../services/studentAuthService.js';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState(token ? 'loading' : 'error');
  const { refreshSession, status: authStatus } = useStudentAuth();
  usePageTitle('Xác minh email');

  useEffect(() => {
    if (!token) return;
    let current = true;
    verifyStudentEmail(token)
      .then(async () => {
        if (authStatus === 'signed-in') await refreshSession();
        if (current) setStatus('success');
      })
      .catch(() => current && setStatus('error'));
    return () => {
      current = false;
    };
  }, [authStatus, refreshSession, token]);

  return (
    <section className="student-access-card" aria-labelledby="verify-email-title">
      <p className="public-eyebrow">Email tài khoản</p>
      <h1 id="verify-email-title">Xác minh email</h1>
      <div
        aria-live="polite"
        className={`student-access-card__notice ${status === 'error' ? 'is-error' : ''}`}
        role={status === 'error' ? 'alert' : 'status'}
      >
        <span aria-hidden="true">
          {status === 'loading' ? '…' : status === 'success' ? '✓' : '!'}
        </span>
        <div>
          <strong>
            {status === 'loading'
              ? 'Đang xác minh…'
              : status === 'success'
                ? 'Email đã được xác minh'
                : 'Liên kết không hợp lệ hoặc đã hết hạn'}
          </strong>
          <p>
            {status === 'success'
              ? 'Tài khoản của bạn đã sẵn sàng.'
              : status === 'error'
                ? 'Đăng nhập để yêu cầu gửi lại email xác minh.'
                : 'Vui lòng chờ trong giây lát.'}
          </p>
        </div>
      </div>
      <p>
        <Link to={status === 'success' ? '/dashboard' : '/login'}>
          {status === 'success' ? 'Mở bảng học tập' : 'Đăng nhập'}
        </Link>
      </p>
    </section>
  );
}
