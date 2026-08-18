import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import PublicApp, { CareerDetail, NewsDetail } from '../features/public/PublicApp.jsx';

const AdminApp = lazy(() => import('../features/admin/AdminApp.jsx'));

function AdminRoute() {
  return (
    <Suspense fallback={<div className="app-route-loading">Đang mở trang quản trị…</div>}>
      <AdminApp />
    </Suspense>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/admin/*" element={<AdminRoute />} />
      <Route path="/news/:id" element={<NewsDetail />} />
      <Route path="/careers/:id" element={<CareerDetail />} />
      <Route path="*" element={<PublicApp />} />
    </Routes>
  );
}
