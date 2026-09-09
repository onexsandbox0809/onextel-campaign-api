import Layout from '../../components/Layout';
import Filters from '../../components/Filters';
import DataTable from '../../components/DataTable';
import { useDashboardData } from '../../lib/useDashboardData';
import { requireAuth } from '../../lib/withAuthSSR';

export async function getServerSideProps(context) {
  return requireAuth(context);
}

const COLUMNS = [
  { key: 'mobile_number', label: 'Mobile Number' },
  { key: 'keyword1', label: 'Keyword 1' },
  { key: 'response_date', label: 'Date' },
  { key: 'response_time', label: 'Time' },
];

export default function Keyword1Page({ username }) {
  const d = useDashboardData('/api/dashboard/keyword1');

  return (
    <Layout title="Keyword 1" subtitle="Responses collected for Keyword 1." username={username}>
      <Filters
        draft={d.draftFilters}
        onChange={d.setDraftFilters}
        onApply={d.applyFilters}
        onClear={d.clearFilters}
        keywordLabel="Keyword 1"
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
