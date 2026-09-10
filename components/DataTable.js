const PAGE_SIZES = [25, 50, 75, 100];
const WRAP_COLUMNS = ['reason', 'other'];

function formatUpdatedAt(date) {
  if (!date) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function DataTable({
  columns,
  rows,
  loading,
  refreshing,
  lastUpdated,
  onRefresh,
  pagination,
  onPageChange,
  onPageSizeChange,
}) {
  const { page, pageSize, total, totalPages } = pagination;
  const startRow = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRow = Math.min(page * pageSize, total);

  return (
    <div className="table-card">
      {onRefresh ? (
        <div className="table-toolbar">
          <span className="table-toolbar-updated">
            {lastUpdated ? `Updated ${formatUpdatedAt(lastUpdated)}` : ' '}
          </span>
          <button
            type="button"
            className={`btn btn-refresh ${refreshing ? 'is-refreshing' : ''}`}
            onClick={() => {
              if (typeof onRefresh === 'function') onRefresh();
            }}
            disabled={refreshing || loading}
          >
            <svg className="refresh-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path
                fill="currentColor"
                d="M13.65 2.35a6.5 6.5 0 1 0 1.65 6.4 1 1 0 0 0-1.94-.5A4.5 4.5 0 1 1 12.2 3.8L10.5 5.5H15V1l-1.35 1.35z"
              />
            </svg>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      ) : null}

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={WRAP_COLUMNS.includes(col.key) ? 'wrap-column' : ''}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length}>
                  <div className="empty-state">Loading...</div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <div className="empty-state">No records match the current filters.</div>
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={row.id || idx}>
                  {columns.map((col) => (
                    <td key={col.key} className={WRAP_COLUMNS.includes(col.key) ? 'wrap-cell' : ''}>{col.render ? col.render(row) : row[col.key] ?? '-'}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination-bar">
        <div>
          <select
            className="page-size-select"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size} per page
              </option>
            ))}
          </select>
        </div>

        <span className="pager-info">
          {total === 0 ? '0 results' : `${startRow}-${endRow} of ${total}`}
        </span>

        <div className="pager">
          <button disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            Prev
          </button>
          <span className="pager-info">
            Page {page} of {totalPages}
          </span>
          <button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}