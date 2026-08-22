import { useAdminOverview } from '../hooks/useAdminOverview.js';
import { formatAdminDate, getItemId } from '../utils.js';
import { AdminAlert, AdminEmpty, AdminSkeletonRows } from './AdminFeedback.jsx';
import AdminIcon from './AdminIcon.jsx';
import AdminPageHeader from './AdminPageHeader.jsx';
import AdminStatCard from './AdminStatCard.jsx';

export default function OverviewPanel({ onCreatePost, onNavigate, onUnauthorized }) {
  const { postCount, recentPosts, learning, loading, error, refresh } =
    useAdminOverview(onUnauthorized);

  return (
    <div className="admin-overview">
      <AdminPageHeader
        action={
          <button
            className="admin-button admin-button--primary"
            onClick={onCreatePost}
            type="button"
          >
            <AdminIcon name="plus" size={17} />
            Viết bài Blog
          </button>
        }
        description="Theo dõi nội dung đang hoạt động và đi nhanh đến các khu vực quản trị Mandora."
        eyebrow="Workspace"
        title="Chào mừng trở lại"
      />

      {error && <AdminAlert onRetry={refresh}>{error}</AdminAlert>}

      <section className="admin-stat-grid" aria-label="Tổng quan Mandora">
        <AdminStatCard
          helper="Dữ liệu thật từ Posts API"
          icon="posts"
          label="Bài viết Blog"
          onClick={() => onNavigate('blog')}
          value={loading ? null : postCount}
        />
        <AdminStatCard
          helper="Tất cả trạng thái nội dung"
          icon="courses"
          label="Khóa học"
          onClick={() => onNavigate('courses')}
          value={loading ? null : learning?.courses}
        />
        <AdminStatCard
          helper="Tài khoản vai trò student"
          icon="users"
          label="Học viên"
          onClick={() => onNavigate('students')}
          value={loading ? null : learning?.students}
        />
        <AdminStatCard
          helper="Enrollment đang hoạt động"
          icon="progress"
          label="Đang học"
          onClick={() => onNavigate('progress')}
          value={loading ? null : learning?.activeEnrollments}
        />
        <AdminStatCard
          helper="Bản ghi LessonProgress hoàn thành"
          icon="progress"
          label="Bài hoàn thành"
          onClick={() => onNavigate('progress')}
          value={loading ? null : learning?.completedLessons}
        />
        <AdminStatCard
          helper="Tổng lượt nộp bài"
          icon="quizzes"
          label="Lượt Quiz"
          onClick={() => onNavigate('quizzes')}
          value={loading ? null : learning?.quizAttempts}
        />
      </section>

      <div className="admin-dashboard-grid">
        <section className="admin-panel admin-dashboard-recent">
          <div className="admin-panel__heading">
            <div>
              <p className="admin-eyebrow">Nội dung thật</p>
              <h2>Blog cập nhật gần đây</h2>
              <p>Các bản ghi mới nhất từ hệ thống Posts hiện có.</p>
            </div>
            <button
              className="admin-button admin-button--secondary"
              onClick={() => onNavigate('blog')}
              type="button"
            >
              Xem tất cả
            </button>
          </div>
          {loading ? (
            <AdminSkeletonRows count={4} />
          ) : recentPosts.length ? (
            <div className="admin-recent-list">
              {recentPosts.map((post) => (
                <button
                  key={getItemId(post)}
                  onClick={() => onNavigate('blog')}
                  type="button"
                >
                  <span
                    className={`admin-status-dot${post.published === false ? ' is-draft' : ''}`}
                  />
                  <span>
                    <strong>{post.title || 'Chưa có tiêu đề'}</strong>
                    <small>
                      {post.published === false ? 'Bản nháp' : 'Đang hiển thị'} ·{' '}
                      {formatAdminDate(post.updatedAt || post.createdAt)}
                    </small>
                  </span>
                  <AdminIcon name="arrowRight" size={17} />
                </button>
              ))}
            </div>
          ) : (
            <AdminEmpty title="Chưa có bài viết Blog">
              Tạo bài viết đầu tiên khi nội dung Mandora đã sẵn sàng.
            </AdminEmpty>
          )}
        </section>

        <aside className="admin-panel admin-dashboard-actions">
          <p className="admin-eyebrow">Quick actions</p>
          <h2>Tiếp tục công việc</h2>
          <p>
            Những lối tắt này chỉ mở chức năng hiện có hoặc foundation được ghi nhãn rõ
            ràng.
          </p>
          <div>
            <button onClick={onCreatePost} type="button">
              <AdminIcon name="plus" />
              <span>
                <strong>Viết bài Blog</strong>
                <small>Posts API hiện có</small>
              </span>
            </button>
            <button onClick={() => onNavigate('media')} type="button">
              <AdminIcon name="media" />
              <span>
                <strong>Mở Media</strong>
                <small>Thư viện hiện có</small>
              </span>
            </button>
            <button onClick={() => onNavigate('courses')} type="button">
              <AdminIcon name="courses" />
              <span>
                <strong>Khóa học</strong>
                <small>Quản lý nội dung học</small>
              </span>
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
