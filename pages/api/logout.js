const { buildLogoutCookie } = require('../../lib/auth');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  res.setHeader('Set-Cookie', buildLogoutCookie());
  return res.status(200).json({ success: true });
};
