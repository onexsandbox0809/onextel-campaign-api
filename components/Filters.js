export default function Filters({ draft, onChange, onApply, onClear, keywordLabel }) {
  function update(field, value) {
    onChange({ ...draft, [field]: value });
  }

  return (
    <div className="filter-card">
      <div className="filter-grid">
        <div className="field">
          <label htmlFor="mobile_number">Mobile number</label>
          <input
            id="mobile_number"
            type="text"
            placeholder="Search by mobile number..."
            value={draft.mobile_number}
            onChange={(e) => update('mobile_number', e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="keyword">{keywordLabel || 'Keyword'}</label>
          <input
            id="keyword"
            type="text"
            placeholder={`Search by ${(keywordLabel || 'keyword').toLowerCase()}...`}
            value={draft.keyword}
            onChange={(e) => update('keyword', e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="start_date">Start date</label>
          <input
            id="start_date"
            type="date"
            value={draft.start_date}
            onChange={(e) => update('start_date', e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="end_date">End date</label>
          <input
            id="end_date"
            type="date"
            value={draft.end_date}
            onChange={(e) => update('end_date', e.target.value)}
          />
        </div>
      </div>
      <div className="filter-actions">
        <button className="btn btn-primary" onClick={onApply}>
          Apply
        </button>
        <button className="btn" onClick={onClear}>
          Clear
        </button>
      </div>
    </div>
  );
}
