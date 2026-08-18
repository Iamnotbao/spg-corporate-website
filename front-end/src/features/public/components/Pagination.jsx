function getVisiblePages(current, total) {
  if (total <= 5) return Array.from({ length: total }, (_, index) => index + 1);

  const start = Math.min(Math.max(current - 2, 1), total - 4);
  return Array.from({ length: 5 }, (_, index) => start + index);
}

export default function Pagination({ label, onChange, page, totalPages }) {
  if (totalPages <= 1) return null;

  const visiblePages = getVisiblePages(page, totalPages);

  return (
    <nav className="public-pagination" aria-label={`Phân trang ${label}`}>
      <button
        className="public-pagination__direction"
        type="button"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
      >
        <span aria-hidden="true">←</span>
        <span>Trước</span>
      </button>

      <div className="public-pagination__pages">
        {visiblePages[0] > 1 && <span aria-hidden="true">…</span>}
        {visiblePages.map((pageNumber) => (
          <button
            key={pageNumber}
            type="button"
            aria-label={`Trang ${pageNumber}`}
            aria-current={pageNumber === page ? 'page' : undefined}
            onClick={() => onChange(pageNumber)}
          >
            {String(pageNumber).padStart(2, '0')}
          </button>
        ))}
        {visiblePages.at(-1) < totalPages && <span aria-hidden="true">…</span>}
      </div>

      <span className="public-pagination__mobile-status">
        {page} / {totalPages}
      </span>

      <button
        className="public-pagination__direction"
        type="button"
        disabled={page === totalPages}
        onClick={() => onChange(page + 1)}
      >
        <span>Sau</span>
        <span aria-hidden="true">→</span>
      </button>
    </nav>
  );
}
