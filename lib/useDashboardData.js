import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';

const EMPTY_FILTERS = { mobile_number: '', keyword: '', start_date: '', end_date: '' };

export function useDashboardData(endpoint) {
  const router = useRouter();
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState('');

  // `silent`: used by the manual refresh button. Keeps the currently
  // rendered rows on screen (no "Loading..." flash) while new data comes
  // in, so a live campaign feed doesn't visibly blank out every refresh.
  const load = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError('');

    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    if (appliedFilters.mobile_number) params.set('mobile_number', appliedFilters.mobile_number);
    if (appliedFilters.keyword) params.set('keyword', appliedFilters.keyword);
    if (appliedFilters.start_date) params.set('start_date', appliedFilters.start_date);
    if (appliedFilters.end_date) params.set('end_date', appliedFilters.end_date);

    try {
      const res = await fetch(`${endpoint}?${params.toString()}`, { credentials: 'include' });
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const json = await res.json();
      if (!json.success) {
        setError(json.error || 'Failed to load data.');
        setRows([]);
        return;
      }
      setRows(json.data || []);
      setTotal(json.pagination?.total || 0);
      setTotalPages(json.pagination?.totalPages || 1);
      setLastUpdated(new Date());
    } catch (err) {
      setError('Network error while loading data.');
    } finally {
      if (silent) setRefreshing(false);
      else setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, page, pageSize, appliedFilters]);

  useEffect(() => {
    load();
  }, [load]);

  function refresh() {
    load({ silent: true });
  }

  function applyFilters() {
    setPage(1);
    setAppliedFilters(draftFilters);
  }

  function clearFilters() {
    setDraftFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setPage(1);
  }

  function changePageSize(size) {
    setPageSize(size);
    setPage(1);
  }

  return {
    draftFilters,
    setDraftFilters,
    appliedFilters,
    applyFilters,
    clearFilters,
    page,
    setPage,
    pageSize,
    changePageSize,
    rows,
    total,
    totalPages,
    loading,
    refreshing,
    lastUpdated,
    refresh,
    error,
  };
}
