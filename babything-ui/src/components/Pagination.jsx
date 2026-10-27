/** page bắt đầu từ 0 (giống API). */
export function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  return (
    <nav className="pagination" aria-label="Phân trang">
      <button type="button" className="btn btn-secondary" disabled={page <= 0} onClick={() => onChange(page - 1)}>
        Trang trước
      </button>
      <span className="muted">
        Trang {page + 1} / {totalPages}
      </span>
      <button
        type="button"
        className="btn btn-secondary"
        disabled={page >= totalPages - 1}
        onClick={() => onChange(page + 1)}
      >
        Trang sau
      </button>
    </nav>
  );
}
