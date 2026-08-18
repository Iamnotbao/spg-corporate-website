import { CONTENT_LABELS } from '../constants.js';
import { formatAdminDate, getItemId, getItemSummary } from '../utils.js';
import AdminIcon from './AdminIcon.jsx';
import { AdminEmpty, AdminSkeletonRows } from './AdminFeedback.jsx';

export default function ContentList({
  actionId,
  items,
  loading,
  onDelete,
  onEdit,
  onSelect,
  onSelectAll,
  onView,
  selectedIds,
  type,
}) {
  if (loading && !items.length) return <AdminSkeletonRows />;

  if (!items.length) {
    return (
      <AdminEmpty title="Không tìm thấy dữ liệu">
        Thử thay đổi từ khóa hoặc bộ lọc, hoặc tạo {CONTENT_LABELS[type].singular} đầu
        tiên.
      </AdminEmpty>
    );
  }

  const allSelected = items.every((item) => selectedIds.includes(getItemId(item)));

  return (
    <div className={`admin-table-wrap${loading ? ' is-refreshing' : ''}`}>
      {loading && (
        <div className="admin-table-progress" role="status">
          <span className="admin-spinner" />
          <span className="admin-sr-only">Đang cập nhật dữ liệu…</span>
        </div>
      )}
      <table className="admin-table">
        <thead>
          <tr>
            <th className="admin-table__checkbox">
              <label>
                <span className="admin-sr-only">Chọn tất cả trên trang</span>
                <input
                  checked={allSelected}
                  onChange={(event) => onSelectAll(event.target.checked)}
                  type="checkbox"
                />
              </label>
            </th>
            <th>Nội dung</th>
            {type === 'jobs' && <th>Thông tin</th>}
            <th>Trạng thái</th>
            <th>Cập nhật</th>
            <th className="admin-table__actions-heading">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const id = getItemId(item);
            const working = actionId === id;
            return (
              <tr key={id}>
                <td className="admin-table__checkbox" data-label="Chọn">
                  <input
                    checked={selectedIds.includes(id)}
                    onChange={() => onSelect(id)}
                    type="checkbox"
                  />
                </td>
                <td data-label="Nội dung">
                  <div className="admin-content-cell">
                    <div className="admin-content-cell__image">
                      {item.imageUrl ? (
                        <img
                          alt=""
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.style.display = 'none';
                          }}
                          src={item.imageUrl}
                        />
                      ) : (
                        <AdminIcon name="image" size={21} />
                      )}
                    </div>
                    <div>
                      <strong title={item.title}>
                        {item.title || 'Chưa có tiêu đề'}
                      </strong>
                      <small title={getItemSummary(item)}>{getItemSummary(item)}</small>
                    </div>
                  </div>
                </td>
                {type === 'jobs' && (
                  <td data-label="Thông tin">
                    <div className="admin-job-meta">
                      <span>{item.location || 'Chưa có địa điểm'}</span>
                      <small>{item.type || 'Chưa phân loại'}</small>
                    </div>
                  </td>
                )}
                <td data-label="Trạng thái">
                  <span
                    className={`admin-badge${
                      item.published === false ? ' admin-badge--muted' : ''
                    }`}
                  >
                    <i />
                    {item.published === false ? 'Đang ẩn' : 'Hiển thị'}
                  </span>
                </td>
                <td data-label="Cập nhật">
                  <span className="admin-date">
                    {formatAdminDate(item.updatedAt || item.createdAt)}
                  </span>
                </td>
                <td data-label="Thao tác">
                  <div className="admin-row-actions">
                    <button
                      aria-label={`Xem ${item.title || 'nội dung'}`}
                      onClick={() => onView(item)}
                      title="Xem nhanh"
                      type="button"
                    >
                      <AdminIcon name="eye" size={17} />
                    </button>
                    <button
                      aria-label={`Sửa ${item.title || 'nội dung'}`}
                      onClick={() => onEdit(item)}
                      title="Chỉnh sửa"
                      type="button"
                    >
                      <AdminIcon name="edit" size={17} />
                    </button>
                    <button
                      aria-label={`Xóa ${item.title || 'nội dung'}`}
                      className="is-danger"
                      disabled={working}
                      onClick={() => onDelete(item)}
                      title="Xóa"
                      type="button"
                    >
                      {working ? (
                        <span className="admin-spinner" />
                      ) : (
                        <AdminIcon name="trash" size={17} />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
