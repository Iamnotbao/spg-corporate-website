import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout.jsx';
import PublicLayout from '../layouts/PublicLayout.jsx';
import BlogPage from '../features/blog/pages/BlogPage.jsx';
import LoginPage from '../features/auth/pages/LoginPage.jsx';
import FoundationPage from '../features/public/pages/FoundationPage.jsx';
import HomePage from '../features/public/pages/HomePage.jsx';
import NotFoundPage from '../features/public/pages/NotFoundPage.jsx';

const AdminApp = lazy(() => import('../features/admin/AdminApp.jsx'));

function AdminRoute() {
  return (
    <Suspense fallback={<div className="app-route-loading">Đang mở trang quản trị…</div>}>
      <AdminApp />
    </Suspense>
  );
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/admin/*" element={<AdminRoute />} />
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route
          path="/courses"
          element={
            <FoundationPage
              description="Khám phá lộ trình tiếng Trung được tổ chức theo mục tiêu học tập."
              eyebrow="Lộ trình học tập"
              title="Khóa học"
            />
          }
        />
        <Route
          path="/hsk"
          element={
            <FoundationPage
              description="Định hướng kiến thức và kỹ năng cần thiết cho từng cấp độ HSK."
              eyebrow="Khung năng lực"
              title="HSK"
            />
          }
        />
        <Route
          path="/vocabulary"
          element={
            <FoundationPage
              description="Xây dựng vốn từ tiếng Trung theo chủ đề và ngữ cảnh sử dụng."
              eyebrow="Nền tảng ngôn ngữ"
              title="Từ vựng"
            />
          }
        />
        <Route
          path="/characters"
          element={
            <FoundationPage
              description="Tìm hiểu cấu tạo, ý nghĩa và cách ghi nhớ Hán tự."
              eyebrow="Chữ viết"
              title="Hán tự"
            />
          }
        />
        <Route
          path="/practice"
          element={
            <FoundationPage
              description="Củng cố kiến thức bằng những hoạt động học tập tập trung."
              eyebrow="Ôn tập"
              title="Luyện tập"
            />
          }
        />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
