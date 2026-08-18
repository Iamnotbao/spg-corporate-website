import { getPaginationItems } from '../utils.js';
import AdminIcon from './AdminIcon.jsx';

export default function AdminPagination({ onPageChange, pagination }) {
  const { page, pageSize, total, totalPages } = pagination;
  if (!total) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const pages = getPaginationItems(page, totalPages);

  return (
    <footer className="admin-pagination">
      <p className="admin-pagination__summary" aria-live="polite">
        <span>Hiển thị</span>
        <strong>
          {start}–{end}
        </strong>
        <span>trên</span>
        <strong>{total.toLocaleString('vi-VN')}</strong>
        <span>kết quả</span>
      </p>
      <nav
        className="admin-pagination__controls"
        aria-label={`Phân trang, trang ${page} trên ${totalPages}`}
      >
        <button
          aria-label="Đi tới trang trước"
          className="admin-pagination__direction"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          type="button"
        >
          <AdminIcon name="arrowLeft" size={17} />
          <span>Trang trước</span>
        </button>

        <div className="admin-pagination__pages" aria-label="Danh sách trang">
          {pages.map((item) =>
            typeof item === 'number' ? (
              <button
                aria-label={`Đi tới trang ${item}`}
                aria-current={item === page ? 'page' : undefined}
                className={item === page ? 'is-active' : ''}
                key={item}
                onClick={() => onPageChange(item)}
                type="button"
              >
                {item}
              </button>
            ) : (
              <span aria-hidden="true" key={item}>
                …
              </span>
            ),
          )}
        </div>

        <button
          aria-label="Đi tới trang sau"
          className="admin-pagination__direction"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          type="button"
        >
          <span>Trang sau</span>
          <AdminIcon name="arrowRight" size={17} />
        </button>
      </nav>
    </footer>
  );
}
