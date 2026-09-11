const { getSupabaseAdmin } = require('./supabaseAdmin');
const { getSessionFromRequest } = require('./auth');

// 1000 is intentionally included for bulk CSV/Excel exports (see
// components/ExportButtons.js) -- it is NOT one of the choices in the
// on-screen page-size dropdown (that list lives separately in
// components/DataTable.js), so normal browsing never renders 1000 rows at
// once. Exports use it to cut the number of round-trips needed to pull a
// large dataset.
const ALLOWED_PAGE_SIZES = [25, 50, 75, 100, 1000];

// OFFSET-based pagination gets linearly slower for Postgres the deeper you
// page (it still has to walk/skip every prior row), so under high concurrent
// load a handful of clients requesting very deep pages can eat a
// disproportionate amount of database time. Cap how deep the API will page
// rather than let that happen silently -- callers who need to go further
// should narrow the date range or filters instead. 4000 pages x 100 rows is
// 400k rows deep, comfortably more than any real dashboard user needs.
const MAX_OFFSET_ROWS = 400000;

function parsePagination(query) {
  let pageSize = parseInt(query.pageSize, 10);
  if (!ALLOWED_PAGE_SIZES.includes(pageSize)) pageSize = 25;

  let page = parseInt(query.page, 10);
  if (!Number.isFinite(page) || page < 1) page = 1;

  return { page, pageSize };
}

/**
 * Runs a filtered, paginated select against `table`, matching `keywordColumn`
 * for the free-text keyword filter, mobile_number, and response_date range.
 * Requires a valid dashboard session cookie.
 */
async function runDashboardQuery(req, res, { table, keywordColumn }) {
  const session = getSessionFromRequest(req);
  if (!session) {
    res.status(401).json({ success: false, error: 'Not authenticated. Please log in again.' });
    return null;
  }

  const { page, pageSize } = parsePagination(req.query);
  const { mobile_number, keyword, start_date, end_date } = req.query;

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  if (from > MAX_OFFSET_ROWS) {
    res.status(400).json({
      success: false,
      error: 'This page is too deep to load directly. Narrow the date range or search filters and try again.',
    });
    return null;
  }

  const supabase = getSupabaseAdmin();
  let queryBuilder = supabase.from(table).select('*', { count: 'exact' });

  if (mobile_number) {
    queryBuilder = queryBuilder.ilike('mobile_number', `%${mobile_number.trim()}%`);
  }
  if (keyword) {
    queryBuilder = queryBuilder.ilike(keywordColumn, `%${keyword.trim()}%`);
  }
  if (start_date) {
    queryBuilder = queryBuilder.gte('response_date', start_date);
  }
  if (end_date) {
    queryBuilder = queryBuilder.lte('response_date', end_date);
  }

  queryBuilder = queryBuilder
    .order('response_date', { ascending: false })
    .order('response_time', { ascending: false })
    .range(from, to);

  const { data, error, count } = await queryBuilder;

  if (error) {
    console.error(`dashboard query error (${table}):`, error);
    res.status(500).json({ success: false, error: 'Failed to load data.' });
    return null;
  }

  res.status(200).json({
    success: true,
    data,
    pagination: {
      page,
      pageSize,
      total: count || 0,
      totalPages: Math.max(1, Math.ceil((count || 0) / pageSize)),
    },
  });
  return data;
}

module.exports = { runDashboardQuery, ALLOWED_PAGE_SIZES };