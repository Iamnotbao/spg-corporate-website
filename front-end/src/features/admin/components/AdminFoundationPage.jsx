import AdminIcon from './AdminIcon.jsx';
import AdminPageHeader from './AdminPageHeader.jsx';

const FOUNDATIONS = {
  courses: {
    eyebrow: 'Learning content',
    title: 'Khóa học',
    description: 'Nơi quản lý danh mục và trạng thái xuất bản của khóa học Mandora.',
    createLabel: 'Tạo khóa học',
    filterLabel: 'Trạng thái',
  },
  units: {
    eyebrow: 'Learning content',
    title: 'Chương học',
    description: 'Nơi tổ chức các chương theo đúng thứ tự trong từng khóa học.',
    createLabel: 'Tạo chương học',
    filterLabel: 'Khóa học',
  },
  lessons: {
    eyebrow: 'Learning content',
    title: 'Bài học',
    description:
      'Nơi biên soạn và xuất bản bài học thuộc cấu trúc Course → Unit → Lesson.',
    createLabel: 'Tạo bài học',
    filterLabel: 'Loại bài học',
  },
  vocabulary: {
    eyebrow: 'Learning content',
    title: 'Từ vựng',
    description:
      'Không gian quản lý nội dung từ vựng sau khi quan hệ dữ liệu được xác nhận.',
    createLabel: 'Tạo từ vựng',
    filterLabel: 'Cấp độ',
  },
  grammar: {
    eyebrow: 'Learning content',
    title: 'Ngữ pháp',
    description:
      'Nền tảng quản trị nội dung ngữ pháp; chưa có hợp đồng API trong repository.',
    createLabel: 'Tạo nội dung',
    filterLabel: 'Cấp độ',
  },
  students: {
    eyebrow: 'Users',
    title: 'Học viên',
    description:
      'Tài khoản học viên đã tồn tại; danh sách quản trị học viên được dành cho giai đoạn báo cáo tiếp theo.',
    filterLabel: 'Trạng thái tài khoản',
  },
  progress: {
    eyebrow: 'Users',
    title: 'Tiến độ học tập',
    description:
      'Enrollment, LessonProgress và QuizAttempt đã tồn tại; báo cáo tổng hợp chưa thuộc Phase 4C-1.',
    filterLabel: 'Khóa học',
  },
  settings: {
    eyebrow: 'System',
    title: 'Cài đặt Mandora',
    description: 'Cài đặt sản phẩm Mandora chưa có schema hoặc API an toàn để chỉnh sửa.',
  },
};

export default function AdminFoundationPage({ section }) {
  const content = FOUNDATIONS[section];

  return (
    <div className="admin-foundation-page">
      <AdminPageHeader
        action={
          content.createLabel ? (
            <button className="admin-button admin-button--primary" disabled type="button">
              <AdminIcon name="plus" size={17} />
              {content.createLabel}
            </button>
          ) : null
        }
        description={content.description}
        eyebrow={content.eyebrow}
        title={content.title}
      />

      <section className="admin-panel admin-foundation-panel">
        <div className="admin-foundation-toolbar" aria-label="Bộ lọc chưa được kết nối">
          <label>
            <span className="admin-sr-only">Tìm kiếm</span>
            <AdminIcon name="search" size={18} />
            <input disabled placeholder={`Tìm trong ${content.title.toLowerCase()}…`} />
          </label>
          {content.filterLabel && (
            <label>
              <span className="admin-sr-only">{content.filterLabel}</span>
              <select disabled defaultValue="">
                <option value="">{content.filterLabel}</option>
              </select>
            </label>
          )}
        </div>

        <div className="admin-foundation-empty">
          <span className="admin-foundation-empty__icon" aria-hidden="true">
            <AdminIcon name="units" size={27} />
          </span>
          <span className="admin-foundation-empty__status">
            UI foundation · Chưa kết nối API
          </span>
          <h3>Chưa có nguồn dữ liệu cho {content.title.toLowerCase()}</h3>
          <p>
            Trang này không tạo, sửa hoặc lưu dữ liệu. Backend, validation và quyền truy
            cập cần được thiết kế trong Phase 4 trước khi bật thao tác.
          </p>
        </div>
      </section>
    </div>
  );
}
