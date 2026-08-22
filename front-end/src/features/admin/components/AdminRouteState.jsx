import AdminIcon from './AdminIcon.jsx';

export default function AdminRouteState({ accessDenied = false, onDashboard }) {
  return (
    <section className="admin-panel admin-route-state">
      <span aria-hidden="true">
        <AdminIcon name={accessDenied ? 'warning' : 'search'} size={28} />
      </span>
      <p className="admin-eyebrow">{accessDenied ? 'Không đủ quyền' : '404'}</p>
      <h2>
        {accessDenied
          ? 'Bạn không thể truy cập khu vực này.'
          : 'Không tìm thấy trang quản trị.'}
      </h2>
      <p>
        {accessDenied
          ? 'Quyền truy cập tiếp tục do API hiện có quyết định; giao diện không thay thế kiểm tra phía backend.'
          : 'Đường dẫn này không thuộc cấu trúc Mandora Admin hiện tại.'}
      </p>
      <button
        className="admin-button admin-button--primary"
        onClick={onDashboard}
        type="button"
      >
        Về Dashboard
      </button>
    </section>
  );
}
