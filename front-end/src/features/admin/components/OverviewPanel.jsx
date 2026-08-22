import { useAdminOverview } from '../hooks/useAdminOverview.js';
import AdminIcon from './AdminIcon.jsx';
import { AdminAlert, AdminSkeletonRows } from './AdminFeedback.jsx';

const STAT_ITEMS = [
  {
    key: 'posts',
    label: 'Blog',
    helper: 'Bài viết đang quản lý',
    icon: 'posts',
  },
  {
    key: 'jobs',
    label: 'Tuyển dụng',
    helper: 'Vị trí đang quản lý',
    icon: 'jobs',
  },
  {
    key: 'applications',
    label: 'Hồ sơ ứng tuyển',
    helper: 'Hồ sơ đã tiếp nhận',
    icon: 'applications',
  },
];

export default function OverviewPanel({ onNavigate, onUnauthorized }) {
  const { stats, loading, error, refresh } = useAdminOverview(onUnauthorized);

  return (
    <div className="admin-overview">
      {error && <AdminAlert onRetry={refresh}>{error}</AdminAlert>}

      {loading && !error ? (
        <AdminSkeletonRows count={3} />
      ) : (
        <section className="admin-stat-grid" aria-label="Thống kê nội dung">
          {STAT_ITEMS.map((item) => (
            <button
              className="admin-stat-card"
              key={item.key}
              onClick={() => onNavigate(item.key)}
              type="button"
            >
              <span className="admin-stat-card__icon">
                <AdminIcon name={item.icon} size={23} />
              </span>
              <span className="admin-stat-card__copy">
                <span>{item.label}</span>
                <strong>{stats[item.key].toLocaleString('vi-VN')}</strong>
                <small>{item.helper}</small>
              </span>
              <AdminIcon className="admin-stat-card__arrow" name="arrowRight" />
            </button>
          ))}
        </section>
      )}

      <section className="admin-welcome-card">
        <div>
          <p className="admin-eyebrow">Mandora Content Studio</p>
          <h2>Quản lý nội dung trong một nơi.</h2>
          <p>
            Quản lý Blog, thư viện media và các nội dung hiện có trong một không gian làm
            việc thống nhất.
          </p>
        </div>
        <div className="admin-welcome-card__actions">
          <button
            className="admin-button admin-button--primary"
            onClick={() => onNavigate('posts')}
            type="button"
          >
            <AdminIcon name="plus" size={18} />
            Quản lý Blog
          </button>
          <button
            className="admin-button admin-button--secondary"
            onClick={() => onNavigate('jobs')}
            type="button"
          >
            Xem tuyển dụng
          </button>
        </div>
      </section>
    </div>
  );
}
