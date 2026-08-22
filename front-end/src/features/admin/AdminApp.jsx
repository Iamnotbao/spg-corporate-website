import { useCallback, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createAdminContent, updateAdminContent } from '../../services/adminService.js';
import AdminLayout from '../../layouts/AdminLayout.jsx';
import '../../styles/admin.css';
import '../../styles/content-import.css';
import './styles/users.css';
import './styles/categories.css';
import './styles/admin-phase-three.css';
import './styles/learning.css';
import './styles/chat.css';
import './styles/communications.css';
import './styles/mobile-polish.css';
import AdminLogin from './components/AdminLogin.jsx';
import AdminLearningPanel from './components/AdminLearningPanel.jsx';
import AdminQuizPanel from './components/AdminQuizPanel.jsx';
import AdminProgressPanel from './components/AdminProgressPanel.jsx';
import AdminRouteState from './components/AdminRouteState.jsx';
import AdminVocabularyPanel from './components/AdminVocabularyPanel.jsx';
import CategoriesPanel from './components/CategoriesPanel.jsx';
import ChatPanel from './components/ChatPanel.jsx';
import CommunicationsPanel from './components/CommunicationsPanel.jsx';
import ContentDetailModal from './components/ContentDetailModal.jsx';
import ContentEditor from './components/ContentEditor.jsx';
import ContentWorkspace from './components/ContentWorkspace.jsx';
import MediaLibraryPanel from './components/MediaLibraryPanel.jsx';
import OverviewPanel from './components/OverviewPanel.jsx';
import StudentsPanel from './components/StudentsPanel.jsx';
import UsersPanel from './components/UsersPanel.jsx';
import { AdminToast } from './components/AdminFeedback.jsx';
import { CONTENT_LABELS } from './constants.js';
import {
  canAccessAdminSection,
  findAdminSectionByKey,
  findAdminSectionByPath,
} from './navigation.js';
import { useAdminAuth } from './hooks/useAdminAuth.js';

export default function AdminApp() {
  const auth = useAdminAuth();
  const location = useLocation();
  const routerNavigate = useNavigate();
  const activeRoute = findAdminSectionByPath(location.pathname);
  const section = activeRoute?.key || '';
  const [editor, setEditor] = useState(null);
  const [detail, setDetail] = useState(null);
  const [toast, setToast] = useState({ message: '', variant: 'success' });

  const notify = useCallback(
    (message, variant = 'success') => setToast({ message, variant }),
    [],
  );
  const closeToast = useCallback(
    () => setToast((current) => ({ ...current, message: '' })),
    [],
  );

  const navigate = useCallback(
    (nextSection) => {
      const item = findAdminSectionByKey(nextSection);
      if (!item) return;
      if (!canAccessAdminSection(auth.user, item)) {
        notify('Tài khoản không có quyền truy cập mục này.', 'error');
        return;
      }
      setDetail(null);
      setEditor(null);
      routerNavigate(item.path);
    },
    [auth.user, notify, routerNavigate],
  );

  const openCreatePost = useCallback(() => {
    setEditor({ type: 'posts', item: null });
    setDetail(null);
  }, []);
  const openEditPost = useCallback((item) => {
    setEditor({ type: 'posts', item });
    setDetail(null);
  }, []);

  const handleSave = useCallback(
    async (payload) => {
      if (!editor) return;
      if (editor.item) {
        const id = editor.item._id?.$oid || editor.item._id || editor.item.id;
        await updateAdminContent(editor.type, id, payload);
        notify(`Đã cập nhật ${CONTENT_LABELS[editor.type].singular}.`);
      } else {
        await createAdminContent(editor.type, payload);
        notify(`Đã tạo ${CONTENT_LABELS[editor.type].singular}.`);
      }
      setEditor(null);
    },
    [editor, notify],
  );

  const headerTitle = useMemo(() => {
    if (editor) {
      return `${editor.item ? 'Chỉnh sửa' : 'Tạo'} ${CONTENT_LABELS[editor.type].singular}`;
    }
    return activeRoute?.label || 'Không tìm thấy';
  }, [activeRoute, editor]);

  if (auth.status !== 'signedIn') {
    return (
      <AdminLogin
        checking={auth.status === 'checking'}
        error={auth.error}
        onSubmit={auth.login}
        submitting={auth.submitting}
      />
    );
  }

  const canAccessRoute = activeRoute && canAccessAdminSection(auth.user, activeRoute);

  let page;
  if (!activeRoute) {
    page = <AdminRouteState onDashboard={() => navigate('dashboard')} />;
  } else if (!canAccessRoute) {
    page = <AdminRouteState accessDenied onDashboard={() => navigate('dashboard')} />;
  } else if (editor) {
    page = (
      <ContentEditor
        item={editor.item}
        key={`posts-${editor.item?._id?.$oid || editor.item?._id || 'new'}`}
        onBack={() => setEditor(null)}
        onSave={handleSave}
        onUnauthorized={auth.handleUnauthorized}
        type="posts"
      />
    );
  } else if (section === 'dashboard') {
    page = (
      <OverviewPanel
        onCreatePost={openCreatePost}
        onNavigate={navigate}
        onUnauthorized={auth.handleUnauthorized}
      />
    );
  } else if (['courses', 'units', 'lessons'].includes(section)) {
    page = (
      <AdminLearningPanel
        onNotify={notify}
        onUnauthorized={auth.handleUnauthorized}
        section={section}
      />
    );
  } else if (section === 'vocabulary') {
    page = (
      <AdminVocabularyPanel onNotify={notify} onUnauthorized={auth.handleUnauthorized} />
    );
  } else if (section === 'quizzes') {
    page = <AdminQuizPanel onNotify={notify} onUnauthorized={auth.handleUnauthorized} />;
  } else if (section === 'progress') {
    page = <AdminProgressPanel onUnauthorized={auth.handleUnauthorized} />;
  } else if (section === 'students') {
    page = <StudentsPanel onUnauthorized={auth.handleUnauthorized} />;
  } else if (section === 'blog') {
    page = (
      <ContentWorkspace
        key="posts"
        onCreate={openCreatePost}
        onEdit={openEditPost}
        onNotify={notify}
        onUnauthorized={auth.handleUnauthorized}
        onView={(item) => setDetail({ item, type: 'posts' })}
        type="posts"
      />
    );
  } else if (section === 'media') {
    page = (
      <MediaLibraryPanel onNotify={notify} onUnauthorized={auth.handleUnauthorized} />
    );
  } else if (section === 'communications') {
    page = (
      <CommunicationsPanel onNotify={notify} onUnauthorized={auth.handleUnauthorized} />
    );
  } else if (section === 'chat') {
    page = <ChatPanel onNotify={notify} onUnauthorized={auth.handleUnauthorized} />;
  } else if (section === 'categories') {
    page = <CategoriesPanel onNotify={notify} onUnauthorized={auth.handleUnauthorized} />;
  } else {
    page = (
      <UsersPanel
        currentUser={auth.user}
        onNotify={notify}
        onUnauthorized={auth.handleUnauthorized}
      />
    );
  }

  return (
    <AdminLayout
      activeSection={editor ? 'blog' : section}
      currentUser={auth.user}
      headerTitle={headerTitle}
      onLogout={auth.logout}
      onNavigate={navigate}
    >
      {page}
      {detail && (
        <ContentDetailModal
          item={detail.item}
          onClose={() => setDetail(null)}
          onEdit={openEditPost}
          type="posts"
        />
      )}
      <AdminToast message={toast.message} onClose={closeToast} variant={toast.variant} />
    </AdminLayout>
  );
}
