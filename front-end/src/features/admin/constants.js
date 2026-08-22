export const ADMIN_SECTIONS = [
  { key: 'overview', label: 'Tổng quan', icon: 'overview' },
  {
    key: 'site-profile',
    label: 'Cấu hình trang cũ',
    icon: 'overview',
    permission: 'settings.read',
  },
  { key: 'media', label: 'Thư viện ảnh', icon: 'posts', permission: 'media.read' },
  { key: 'posts', label: 'Blog', icon: 'posts', permission: 'posts.read' },
  {
    key: 'categories',
    label: 'Chuyên mục Blog',
    icon: 'posts',
    permission: 'categories.read',
  },
  { key: 'jobs', label: 'Tuyển dụng (cũ)', icon: 'jobs', permission: 'jobs.read' },
  {
    key: 'communications',
    label: 'Thông báo & sự kiện',
    icon: 'communications',
    permission: 'communications.read',
  },
  { key: 'chat', label: 'Chat & liên hệ', icon: 'chat', permission: 'chat.read' },
  {
    key: 'languages',
    label: 'Ngôn ngữ',
    icon: 'languages',
    permission: 'languages.read',
  },
  {
    key: 'applications',
    label: 'Hồ sơ ứng tuyển (cũ)',
    icon: 'applications',
    permission: 'applications.read',
  },
  { key: 'users', label: 'Người dùng', icon: 'users', permission: 'users.read' },
];

export const CONTENT_LABELS = {
  posts: {
    singular: 'bài viết',
    plural: 'Quản lý Blog',
    description: 'Tạo, biên tập và kiểm soát trạng thái xuất bản nội dung Mandora.',
  },
  jobs: {
    singular: 'tin tuyển dụng',
    plural: 'Tuyển dụng',
    description: 'Quản lý cơ hội nghề nghiệp và thông tin tuyển dụng.',
  },
};

export const DEFAULT_FILTERS = {
  search: '',
  published: '',
  category: 'hoc-tieng-trung',
  jobType: '',
  location: '',
  pageSize: 10,
};
export const JOB_TYPES = ['Full-time', 'Part-time', 'Intern', 'Contract', 'Freelance'];
export const NEWS_CATEGORIES = [
  { value: 'hoc-tieng-trung', label: 'Học tiếng Trung' },
  { value: 'hsk', label: 'HSK' },
  { value: 'tu-vung', label: 'Từ vựng' },
  { value: 'ngu-phap', label: 'Ngữ pháp' },
  { value: 'han-tu', label: 'Hán tự' },
  { value: 'van-hoa', label: 'Văn hóa' },
  { value: 'kinh-nghiem-hoc-tap', label: 'Kinh nghiệm học tập' },
];
export const POST_PAGE_PLACEMENTS = [
  { value: 'highlights', label: 'Con số & dấu ấn' },
  { value: 'partners', label: 'Đối tác & hợp tác' },
  { value: 'location', label: 'Vị trí công ty' },
  { value: 'supply-chain-consulting', label: 'Năng lực sản xuất' },
];
export const PERMISSION_GROUPS = [
  [
    'Bài viết',
    ['posts.read', 'posts.create', 'posts.update', 'posts.delete', 'posts.import'],
  ],
  [
    'Tuyển dụng',
    ['jobs.read', 'jobs.create', 'jobs.update', 'jobs.delete', 'jobs.import'],
  ],
  ['Hồ sơ ứng tuyển', ['applications.read', 'applications.download']],
  ['Người dùng', ['users.read', 'users.create', 'users.update', 'users.delete']],
  [
    'Category',
    ['categories.read', 'categories.create', 'categories.update', 'categories.delete'],
  ],
  ['Thông báo & sự kiện', ['communications.read', 'communications.update']],
  ['Chat & liên hệ', ['chat.read', 'chat.reply', 'chat.settings']],
  [
    'Ngôn ngữ',
    ['languages.read', 'languages.create', 'languages.update', 'languages.delete'],
  ],
  ['Thư viện ảnh', ['media.read', 'media.delete']],
  ['Cài đặt & trang chủ', ['settings.read', 'settings.update']],
];
export const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

const EMPTY_TRANSLATIONS = {
  en: {
    title: '',
    summary: '',
    content: '',
    description: '',
    location: '',
    salary: '',
    benefits: '',
    workingHours: '',
  },
  'zh-tw': {
    title: '',
    summary: '',
    content: '',
    description: '',
    location: '',
    salary: '',
    benefits: '',
    workingHours: '',
  },
};

export const EMPTY_CONTENT = {
  posts: {
    title: '',
    category: 'hoc-tieng-trung',
    pageKeys: [],
    summary: '',
    content: '',
    contentBlocks: [],
    imageUrl: '',
    imagePublicId: '',
    images: [],
    imagePublicIds: [],
    published: true,
    translations: structuredClone(EMPTY_TRANSLATIONS),
  },
  jobs: {
    title: '',
    summary: '',
    description: '',
    contentBlocks: [],
    location: '',
    type: 'Full-time',
    salary: '',
    benefits: '',
    workingHours: '',
    imageUrl: '',
    imagePublicId: '',
    images: [],
    imagePublicIds: [],
    published: true,
    translations: structuredClone(EMPTY_TRANSLATIONS),
  },
};
