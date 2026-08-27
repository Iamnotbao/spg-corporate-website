export const ADMIN_NAV_GROUPS = [
  {
    label: '',
    items: [{ key: 'dashboard', label: 'Dashboard', icon: 'overview', path: '/admin' }],
  },
  {
    label: 'Learning',
    items: [
      { key: 'courses', label: 'Khóa học', icon: 'courses', path: '/admin/courses', adminOnly: true },
      { key: 'units', label: 'Chương học', icon: 'units', path: '/admin/units', adminOnly: true },
      { key: 'lessons', label: 'Bài học', icon: 'lessons', path: '/admin/lessons', adminOnly: true },
      { key: 'vocabulary', label: 'Từ vựng', icon: 'vocabulary', path: '/admin/vocabulary', adminOnly: true },
      { key: 'characters', label: 'Hán tự', icon: 'characters', path: '/admin/characters', adminOnly: true },
      { key: 'quizzes', label: 'Quiz', icon: 'quizzes', path: '/admin/quizzes', adminOnly: true },
      { key: 'hsk-exams', label: 'Thi thử HSK', icon: 'quizzes', path: '/admin/hsk-mock-exams', adminOnly: true },
      { key: 'videos', label: 'Video học tập', icon: 'media', path: '/admin/videos', adminOnly: true },
    ],
  },
  {
    label: 'Content',
    items: [
      { key: 'homepage', label: 'Trang chủ & bản đồ', icon: 'settings', path: '/admin/homepage', adminOnly: true },
      { key: 'blog', label: 'Blog', icon: 'posts', path: '/admin/blog', permission: 'posts.read' },
      { key: 'media', label: 'Media', icon: 'media', path: '/admin/media', permission: 'media.read' },
      { key: 'communications', label: 'Thông báo & sự kiện', icon: 'communications', path: '/admin/communications', permission: 'communications.read' },
      { key: 'chat', label: 'Chat & AI', icon: 'chat', path: '/admin/chat', permission: 'chat.read' },
    ],
  },
  {
    label: 'Users',
    items: [
      { key: 'students', label: 'Học viên', icon: 'users', path: '/admin/students', adminOnly: true },
      { key: 'progress', label: 'Tiến độ', icon: 'progress', path: '/admin/progress', adminOnly: true },
    ],
  },
  {
    label: 'System',
    items: [
      { key: 'trash', label: 'Thùng rác', icon: 'trash', path: '/admin/trash', adminOnly: true },
      { key: 'categories', label: 'Chuyên mục Blog', icon: 'categories', path: '/admin/categories', permission: 'categories.read' },
      { key: 'accounts', label: 'Tài khoản CMS', icon: 'users', path: '/admin/accounts', permission: 'users.read' },
    ],
  },
];

export const ADMIN_SECTIONS = ADMIN_NAV_GROUPS.flatMap((group) =>
  group.items.map((item) => ({ ...item, group: group.label })),
);

export function canAccessAdminSection(user, section) {
  if (!section) return false;
  if (section.adminOnly && user?.role !== 'admin') return false;
  if (!section.permission || user?.role === 'admin') return true;
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  return permissions.includes('*') || permissions.includes(section.permission);
}

export function findAdminSectionByKey(key) {
  return ADMIN_SECTIONS.find((item) => item.key === key) || null;
}

export function findAdminSectionByPath(pathname) {
  const normalized = String(pathname || '').replace(/\/+$/, '') || '/admin';
  return ADMIN_SECTIONS.find((item) => item.path === normalized) || null;
}
