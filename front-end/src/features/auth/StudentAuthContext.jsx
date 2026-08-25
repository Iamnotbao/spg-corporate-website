import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { getStudentToken, setStudentToken } from '../../services/httpClient.js';
import {
  getStudentSession,
  loginStudent,
  registerStudent,
} from './services/studentAuthService.js';

const StudentAuthContext = createContext(null);

export function StudentAuthProvider({ children }) {
  const [status, setStatus] = useState(getStudentToken() ? 'checking' : 'signed-out');
  const [user, setUser] = useState(null);
  const refreshSession = useCallback(async () => {
    const result = await getStudentSession();
    setUser(result.user);
    setStatus('signed-in');
    return result.user;
  }, []);

  useEffect(() => {
    if (!getStudentToken()) return;
    let current = true;
    getStudentSession()
      .then((result) => {
        if (!current) return;
        setUser(result.user);
        setStatus('signed-in');
      })
      .catch(() => {
        if (!current) return;
        setStudentToken('');
        setUser(null);
        setStatus('signed-out');
      });
    return () => {
      current = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      status,
      user,
      async login(credentials) {
        const result = await loginStudent(credentials);
        setStudentToken(result.token);
        setUser(result.user);
        setStatus('signed-in');
        return result.user;
      },
      async register(details) {
        const result = await registerStudent(details);
        setStudentToken(result.token);
        setUser(result.user);
        setStatus('signed-in');
        return result.user;
      },
      refreshSession,
      logout() {
        setStudentToken('');
        setUser(null);
        setStatus('signed-out');
      },
    }),
    [refreshSession, status, user],
  );

  return (
    <StudentAuthContext.Provider value={value}>{children}</StudentAuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStudentAuth() {
  const context = useContext(StudentAuthContext);
  if (!context) throw new Error('useStudentAuth must be used inside StudentAuthProvider');
  return context;
}
