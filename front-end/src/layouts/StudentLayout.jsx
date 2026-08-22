import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { LoadingState } from '../components/ui/ContentState.jsx';
import { useStudentAuth } from '../features/auth/StudentAuthContext.jsx';

export default function StudentLayout() {
  const auth = useStudentAuth();
  const location = useLocation();

  if (auth.status === 'checking') {
    return <LoadingState count={1} label="Đang kiểm tra phiên học viên" />;
  }
  if (auth.status !== 'signed-in') {
    return <Navigate replace state={{ from: location.pathname }} to="/login" />;
  }
  return <Outlet />;
}
