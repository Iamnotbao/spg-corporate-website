import { useCallback, useMemo, useState } from 'react';
import { createAdminContent, updateAdminContent } from '../../services/adminService.js';
import '../../styles/admin.css';
import ApplicationsPanel from './components/ApplicationsPanel.jsx';
import AdminLayout from './components/AdminLayout.jsx';
import AdminLogin from './components/AdminLogin.jsx';
import ContentDetailModal from './components/ContentDetailModal.jsx';
import ContentEditor from './components/ContentEditor.jsx';
import ContentWorkspace from './components/ContentWorkspace.jsx';
import OverviewPanel from './components/OverviewPanel.jsx';
import { AdminToast } from './components/AdminFeedback.jsx';
import { ADMIN_SECTIONS, CONTENT_LABELS } from './constants.js';
import { useAdminAuth } from './hooks/useAdminAuth.js';

export default function AdminApp() {
  const auth = useAdminAuth();
  const [section, setSection] = useState('overview');
  const [editor, setEditor] = useState(null);
  const [detail, setDetail] = useState(null);
  const [toast, setToast] = useState({ message: '', variant: 'success' });

  const notify = useCallback((message, variant = 'success') => {
    setToast({ message, variant });
  }, []);

  const closeToast = useCallback(() => {
    setToast((current) => ({ ...current, message: '' }));
  }, []);

  const navigate = useCallback((nextSection) => {
    setDetail(null);
    setEditor(null);
    setSection(nextSection);
  }, []);

  const openCreate = useCallback((type) => {
    setEditor({ type, item: null });
    setDetail(null);
  }, []);

  const openEdit = useCallback(
    (item, type = section) => {
      setEditor({ type, item });
      setDetail(null);
    },
    [section],
  );

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
      return `${editor.item ? 'Chỉnh sửa' : 'Tạo'} ${
        CONTENT_LABELS[editor.type].singular
      }`;
    }
    return ADMIN_SECTIONS.find((item) => item.key === section)?.label || 'Quản trị';
  }, [editor, section]);

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

  return (
    <AdminLayout
      activeSection={editor?.type || section}
      headerTitle={headerTitle}
      onLogout={auth.logout}
      onNavigate={navigate}
    >
      {editor ? (
        <ContentEditor
          item={editor.item}
          key={`${editor.type}-${editor.item?._id?.$oid || editor.item?._id || 'new'}`}
          onBack={() => setEditor(null)}
          onSave={handleSave}
          onUnauthorized={auth.handleUnauthorized}
          type={editor.type}
        />
      ) : section === 'overview' ? (
        <OverviewPanel onNavigate={navigate} onUnauthorized={auth.handleUnauthorized} />
      ) : section === 'posts' || section === 'jobs' ? (
        <ContentWorkspace
          key={section}
          onCreate={() => openCreate(section)}
          onEdit={(item) => openEdit(item, section)}
          onNotify={notify}
          onUnauthorized={auth.handleUnauthorized}
          onView={(item) => setDetail({ item, type: section })}
          type={section}
        />
      ) : (
        <ApplicationsPanel onNotify={notify} onUnauthorized={auth.handleUnauthorized} />
      )}

      {detail && (
        <ContentDetailModal
          item={detail.item}
          onClose={() => setDetail(null)}
          onEdit={(item) => openEdit(item, detail.type)}
          type={detail.type}
        />
      )}

      <AdminToast message={toast.message} onClose={closeToast} variant={toast.variant} />
    </AdminLayout>
  );
}
