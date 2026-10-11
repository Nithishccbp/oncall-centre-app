// Round prev/next buttons with "Page x of y".
import './Pager.css';

export default function Pager({ page, totalPages, onChange }) {
  return (
    <div className="pager">
      <button className="pager__btn" disabled={page === 0} onClick={() => onChange(page - 1)} aria-label="Previous page">
        <i className="ti ti-chevron-left" />
      </button>
      <span className="pager__text">Page {page + 1} of {totalPages}</span>
      <button className="pager__btn" disabled={page >= totalPages - 1} onClick={() => onChange(page + 1)} aria-label="Next page">
        <i className="ti ti-chevron-right" />
      </button>
    </div>
  );
}
