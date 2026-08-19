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
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!getAdminToken()) return undefined;

    const controller = new AbortController();
    setStatus('checking');

    verifyAdminSession({ signal: controller.signal })
      .then((payload) => {
        setUser(payload?.user || null);
        setError('');
        setStatus('signedIn');
      })
      .catch((sessionError) => {
        if (sessionError?.name === 'AbortError') return;
        if (isUnauthorized(sessionError)) setAdminToken('');
        setUser(null);
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

  const login = useCallback(async (username, password) => {
    setSubmitting(true);
    setError('');
    try {
      const payload = await loginAdmin(username, password);
      setUser(payload?.user || null);
      setStatus('signedIn');
      return true;
    } catch (loginError) {
      setUser(null);
      setError(
        loginError?.status === 401
          ? 'Tên đăng nhập hoặc mật khẩu không đúng.'
          : getErrorMessage(loginError, 'Không thể đăng nhập lúc này.'),
      );
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const logout = useCallback(() => {
    setAdminToken('');
    setUser(null);
    setError('');
    setStatus('signedOut');
  }, []);

  const handleUnauthorized = useCallback((requestError) => {
    if (!isUnauthorized(requestError)) return false;
    setAdminToken('');
    setUser(null);
    setError(
      requestError?.status === 403
        ? 'Tài khoản không có quyền thực hiện thao tác này.'
        : 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
    );
    setStatus('signedOut');
    return true;
  }, []);

  return {
    status,
    user,
    error,
    submitting,
    login,
    logout,
    handleUnauthorized,
  };
}
