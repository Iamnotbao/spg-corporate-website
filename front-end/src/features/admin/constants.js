export const ADMIN_SECTIONS = [
  { key: 'overview', label: 'Tổng quan', icon: 'overview', roles: ['admin', 'employee'] },
  { key: 'posts', label: 'Bài viết', icon: 'posts', roles: ['admin', 'employee'] },
  { key: 'jobs', label: 'Tuyển dụng', icon: 'jobs', roles: ['admin', 'employee'] },
  { key: 'applications', label: 'Hồ sơ ứng tuyển', icon: 'applications', roles: ['admin'] },
  { key: 'users', label: 'Người dùng', icon: 'users', roles: ['admin'] },
];

export const CONTENT_LABELS = {
  posts: {
    singular: 'bài viết',
    plural: 'Bài viết',
    description: 'Quản lý tin tức và nội dung đang hiển thị trên website.',
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
  jobType: '',
  location: '',
  pageSize: 10,
};

export const JOB_TYPES = ['Full-time', 'Part-time', 'Intern', 'Contract', 'Freelance'];

export const NEWS_CATEGORIES = [
  { value: 'activity', label: 'Hoạt động' },
  { value: 'talent', label: 'Phát triển nhân tài' },
  { value: 'union', label: 'Công đoàn' },
  { value: 'company', label: 'Tin doanh nghiệp' },
  { value: 'achievement', label: 'Thành tựu' },
];

export const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

export const EMPTY_CONTENT = {
  posts: {
    title: '',
    category: 'activity',
    summary: '',
    content: '',
    imageUrl: '',
    imagePublicId: '',
    images: [],
    imagePublicIds: [],
    published: true,
  },
  jobs: {
    title: '',
    summary: '',
    description: '',
    location: '',
    type: 'Full-time',
    salary: '',
    benefits: '',
    workingHours: '',
    imageUrl: '',
    imagePublicId: '',
    published: true,
  },
};
