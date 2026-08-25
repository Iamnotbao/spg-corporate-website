import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setStudentToken } from '../../../services/httpClient.js';
import { useStudentAuth } from '../StudentAuthContext.jsx';

export default function OAuthCallbackPage() {
  const navigate = useNavigate();
  const auth = useStudentAuth();
  const [message, setMessage] = useState('Đang hoàn tất đăng nhập…');

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const token = params.get('token');
    const error = params.get('error');

    window.history.replaceState(null, '', window.location.pathname);

    if (error || !token) {
      setMessage(error || 'Không nhận được thông tin đăng nhập.');
      return;
    }

    setStudentToken(token);
    auth
      .refreshSession()
      .then(() => navigate('/dashboard', { replace: true }))
      .catch(() => {
        setStudentToken('');
        setMessage('Không thể xác thực phiên đăng nhập. Vui lòng thử lại.');
      });
  }, [auth, navigate]);

  return (
    <section className="student-access-card" aria-live="polite">
      <p className="public-eyebrow">Mandora</p>
      <h1>Đăng nhập mạng xã hội</h1>
      <p>{message}</p>
    </section>
  );
}
