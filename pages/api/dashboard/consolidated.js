const { runDashboardQuery } = require('../../../lib/dashboardQuery');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, error: 'Method not allowed. Use GET.' });
  }

  await runDashboardQuery(req, res, {
    table: 'consolidated_report',
    keywordColumn: 'keyword',
  });
};
