const { getSupabaseAdmin } = require('../../lib/supabaseAdmin');
const { nowInIstanbul } = require('../../lib/timezone');
const { normalizeMobileNumber, requiredString } = require('../../lib/validate');
const { isInboundRequestAuthorized } = require('../../lib/auth');
const { checkRateLimit, getClientIp } = require('../../lib/rateLimit');

const RATE_LIMIT_PER_MINUTE = parseInt(process.env.INBOUND_RATE_LIMIT_PER_MINUTE, 10) || 300;

export const config = {
  api: {
    bodyParser: { sizeLimit: '100kb' },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  if (!isInboundRequestAuthorized(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized: invalid or missing x-api-key.' });
  }

  if (!checkRateLimit(`${getClientIp(req)}:keyword3`, RATE_LIMIT_PER_MINUTE)) {
    return res.status(429).json({ success: false, error: 'Too many requests. Please slow down and retry shortly.' });
  }

  const body = req.body || {};
  const mobile_number = normalizeMobileNumber(body.mobile_number);
  const keyword3 = requiredString(body.keyword3, 200);
  const reason = body.reason == null ? null : String(body.reason).trim().slice(0, 2000);
  const other = body.other == null ? null : String(body.other).trim().slice(0, 2000);

  const errors = [];
  if (!mobile_number) errors.push('mobile_number is required and must be a valid phone number (7-15 digits).');
  if (!keyword3) errors.push('keyword3 is required.');
  if (errors.length) return res.status(400).json({ success: false, error: errors.join(' ') });

  const { response_date, response_time } = nowInIstanbul();

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('keyword3_responses')
      .insert([{ mobile_number, keyword3, reason, other, response_date, response_time }])
      .select('id, mobile_number, keyword3, reason, other, response_date, response_time')
      .single();

    if (error) {
      console.error('keyword3 insert error:', error);
      return res.status(500).json({ success: false, error: 'Failed to save keyword3 response.' });
    }

    return res.status(201).json({ success: true, data });
  } catch (err) {
    console.error('keyword3 handler error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};
