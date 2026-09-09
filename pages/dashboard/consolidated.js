import Layout from '../../components/Layout';
import Filters from '../../components/Filters';
import DataTable from '../../components/DataTable';
import { useDashboardData } from '../../lib/useDashboardData';
import { requireAuth } from '../../lib/withAuthSSR';

export async function getServerSideProps(context) {
  return requireAuth(context);
}

const COLUMNS = [
  {
    key: 'source_table',
    label: 'Source',
    render: (row) => <span className="badge-source">{formatSource(row.source_table)}</span>,
  },
  { key: 'mobile_number', label: 'Mobile Number' },
  { key: 'keyword', label: 'Keyword' },
  { key: 'reason', label: 'Reason' },
  { key: 'other', label: 'Other' },
  { key: 'response_date', label: 'Date' },
  { key: 'response_time', label: 'Time' },
];

function formatSource(source) {
  const map = {
    keyword1: 'Keyword 1',
    keyword2: 'Keyword 2',
    keyword3: 'Keyword 3',
    keyword_selected: 'Keyword Selected',
  };
  return map[source] || source;
}

export default function ConsolidatedReportPage({ username }) {
  const d = useDashboardData('/api/dashboard/consolidated');

  return (
    <Layout
      title="Consolidated Report"
      subtitle="All keyword responses combined into one unified view."
      username={username}
    >
      <Filters
        draft={d.draftFilters}
        onChange={d.setDraftFilters}
        onApply={d.applyFilters}
        onClear={d.clearFilters}
        keywordLabel="Keyword"
      />
      {d.error ? <div className="login-error">{d.error}</div> : null}
      <DataTable
        columns={COLUMNS}
        rows={d.rows}
        loading={d.loading}
        pagination={{ page: d.page, pageSize: d.pageSize, total: d.total, totalPages: d.totalPages }}
        onPageChange={d.setPage}
        onPageSizeChange={d.changePageSize}
      />
    </Layout>
  );
}
