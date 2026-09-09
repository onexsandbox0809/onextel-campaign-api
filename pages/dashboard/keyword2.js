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
  { key: 'keyword2', label: 'Keyword 2' },
  { key: 'reason', label: 'Reason' },
  { key: 'other', label: 'Other' },
  { key: 'response_date', label: 'Date' },
  { key: 'response_time', label: 'Time' },
];

export default function Keyword2Page({ username }) {
  const d = useDashboardData('/api/dashboard/keyword2');

  return (
    <Layout title="Keyword 2" subtitle="Responses collected for Keyword 2." username={username}>
      <Filters
        draft={d.draftFilters}
        onChange={d.setDraftFilters}
        onApply={d.applyFilters}
        onClear={d.clearFilters}
        keywordLabel="Keyword 2"
      />
      <ExportButtons
        endpoint="/api/dashboard/keyword2"
        filters={d.appliedFilters}
        columns={COLUMNS}
        filename="keyword2-report"
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
