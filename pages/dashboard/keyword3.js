import Layout from '../../components/Layout';
import Filters from '../../components/Filters';
import DataTable from '../../components/DataTable';
import ExportButtons from '../../components/ExportButtons';
import { useDashboardData } from '../../lib/useDashboardData';
import { requireAuth } from '../../lib/withAuthSSR';

export async function getServerSideProps(context) {
  return requireAuth(context);
}

const COLUMNS = [
  { key: 'mobile_number', label: 'Mobile Number' },
  { key: 'keyword3', label: 'Keyword 3' },
  { key: 'reason', label: 'Reason' },
  { key: 'other', label: 'Other' },
  { key: 'response_date', label: 'Date' },
  { key: 'response_time', label: 'Time' },
];

export default function Keyword3Page({ username }) {
  const d = useDashboardData('/api/dashboard/keyword3');

  return (
    <Layout title="Keyword 3" subtitle="Responses collected for Keyword 3." username={username}>
      <Filters
        draft={d.draftFilters}
        onChange={d.setDraftFilters}
        onApply={d.applyFilters}
        onClear={d.clearFilters}
        keywordLabel="Keyword 3"
      />
      <ExportButtons
        endpoint="/api/dashboard/keyword3"
        filters={d.appliedFilters}
        columns={COLUMNS}
        filename="keyword3-report"
      />
      {d.error ? <div className="login-error">{d.error}</div> : null}
      <DataTable
        columns={COLUMNS}
        rows={d.rows}
        loading={d.loading}
        refreshing={d.refreshing}
        lastUpdated={d.lastUpdated}
        onRefresh={d.refresh}
        pagination={{ page: d.page, pageSize: d.pageSize, total: d.total, totalPages: d.totalPages }}
        onPageChange={d.setPage}
        onPageSizeChange={d.changePageSize}
      />
    </Layout>
  );
}
