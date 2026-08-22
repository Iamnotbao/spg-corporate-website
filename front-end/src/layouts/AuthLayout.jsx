import { Link, Outlet } from 'react-router-dom';
import Brand from '../components/ui/Brand.jsx';
import '../styles/mandora-public.css';

export default function AuthLayout({ children }) {
  return (
    <main className="auth-layout">
      <div className="auth-layout__topbar">
        <Brand />
        <Link to="/">Về trang chủ</Link>
      </div>
      <div className="auth-layout__content">{children || <Outlet />}</div>
    </main>
  );
}
