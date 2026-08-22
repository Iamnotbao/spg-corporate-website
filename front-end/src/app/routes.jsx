import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout.jsx';
import PublicLayout from '../layouts/PublicLayout.jsx';
import StudentLayout from '../layouts/StudentLayout.jsx';
import BlogDetailPage from '../features/blog/pages/BlogDetailPage.jsx';
import BlogPage from '../features/blog/pages/BlogPage.jsx';
import LoginPage from '../features/auth/pages/LoginPage.jsx';
import CourseDetailPage from '../features/courses/pages/CourseDetailPage.jsx';
import CoursesPage from '../features/courses/pages/CoursesPage.jsx';
import LessonPage from '../features/courses/pages/LessonPage.jsx';
import CharactersPage from '../features/learning/pages/CharactersPage.jsx';
import HskPage from '../features/learning/pages/HskPage.jsx';
import PracticeModePage from '../features/learning/pages/PracticeModePage.jsx';
import PracticePage from '../features/learning/pages/PracticePage.jsx';
import VocabularyPage from '../features/learning/pages/VocabularyPage.jsx';
import HomePage from '../features/public/pages/HomePage.jsx';
import NotFoundPage from '../features/public/pages/NotFoundPage.jsx';
import MyCoursesPage from '../features/student/pages/MyCoursesPage.jsx';
import QuizPage from '../features/quizzes/pages/QuizPage.jsx';

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
        <Route path="/register" element={<LoginPage initialMode="register" />} />
      </Route>
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/courses/:courseSlug" element={<CourseDetailPage />} />
        <Route path="/courses/:courseSlug/lessons/:lessonSlug" element={<LessonPage />} />
        <Route path="/hsk" element={<HskPage />} />
        <Route path="/vocabulary" element={<VocabularyPage />} />
        <Route path="/characters" element={<CharactersPage />} />
        <Route path="/practice" element={<PracticePage />} />
        <Route path="/practice/:mode" element={<PracticeModePage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/blog/:id" element={<BlogDetailPage />} />
        <Route element={<StudentLayout />}>
          <Route path="/my-courses" element={<MyCoursesPage />} />
          <Route
            path="/courses/:courseSlug/lessons/:lessonSlug/quiz"
            element={<QuizPage />}
          />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
