const { getSupabaseAdmin } = require('./supabaseAdmin');
const { getSessionFromRequest } = require('./auth');

const ALLOWED_PAGE_SIZES = [25, 50, 75, 100];

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
