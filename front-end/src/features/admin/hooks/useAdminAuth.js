import { useCallback, useEffect, useState } from 'react';
import {
  getAdminToken,
  loginAdmin,
  setAdminToken,
  verifyAdminSession,
} from '../../../services/adminService.js';
import { getErrorMessage, isUnauthorized } from '../utils.js';

export function useAdminAuth() {
  const [status, setStatus] = useState(() =>
    getAdminToken() ? 'checking' : 'signedOut',
  );
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!getAdminToken()) return undefined;

    const controller = new AbortController();
    setStatus('checking');

    verifyAdminSession({ signal: controller.signal })
      .then(() => {
        setError('');
        setStatus('signedIn');
      })
      .catch((sessionError) => {
        if (sessionError?.name === 'AbortError') return;
        if (isUnauthorized(sessionError)) setAdminToken('');
        setError(
          isUnauthorized(sessionError)
            ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
            : getErrorMessage(
                sessionError,
                'Không thể kiểm tra phiên đăng nhập. Vui lòng thử lại.',
              ),
        );
        setStatus('signedOut');
      });

    return () => controller.abort();
  }, []);

  const login = useCallback(async (password) => {
    setSubmitting(true);
    setError('');
    try {
      await loginAdmin(password);
      setStatus('signedIn');
      return true;
    } catch (loginError) {
      setError(
        loginError?.status === 401
          ? 'Mật khẩu quản trị không đúng.'
          : getErrorMessage(loginError, 'Không thể đăng nhập lúc này.'),
      );
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const logout = useCallback(() => {
    setAdminToken('');
    setError('');
    setStatus('signedOut');
  }, []);

  const handleUnauthorized = useCallback((requestError) => {
    if (!isUnauthorized(requestError)) return false;
    setAdminToken('');
    setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    setStatus('signedOut');
    return true;
  }, []);

  return {
    status,
    error,
    submitting,
    login,
    logout,
    handleUnauthorized,
  };
}
