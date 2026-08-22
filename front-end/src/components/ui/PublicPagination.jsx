export default function PublicPagination({ page, pageSize, total, onPageChange }) {
  if (!total) return null;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <footer className="public-pagination" aria-label="Phân trang nội dung">
      <p className="public-pagination__summary">
        Hiển thị <strong>{start}–{end}</strong> trên <strong>{total}</strong> kết quả
      </p>
      <div className="public-pagination__controls">
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          type="button"
        >
          ← Trước
        </button>
        <span>
          Trang {page} / {totalPages}
        </span>
        <button
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          type="button"
        >
          Sau →
        </button>
      </div>
    </footer>
  );
}
