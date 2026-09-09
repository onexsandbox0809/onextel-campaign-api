const { getSupabaseAdmin } = require('../../lib/supabaseAdmin');
const { nowInIstanbul } = require('../../lib/timezone');
const { normalizeMobileNumber, requiredString, optionalString } = require('../../lib/validate');
const { isInboundRequestAuthorized } = require('../../lib/auth');

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

  const body = req.body || {};
  const mobile_number = normalizeMobileNumber(body.mobile_number);
  const keyword_selected = requiredString(body.keyword_selected, 200);
  const reason = optionalString(body.reason, 500);
  const other = optionalString(body.other, 1000);

  const errors = [];
  if (!mobile_number) errors.push('mobile_number is required and must be a valid phone number (7-15 digits).');
  if (!keyword_selected) errors.push('keyword_selected is required.');
  if (errors.length) return res.status(400).json({ success: false, error: errors.join(' ') });

  const { response_date, response_time } = nowInIstanbul();

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('keyword_selected_responses')
      .insert([{ mobile_number, keyword_selected, reason, other, response_date, response_time }])
      .select('id, mobile_number, keyword_selected, reason, other, response_date, response_time')
      .single();

    if (error) {
      console.error('keyword-selected insert error:', error);
      return res.status(500).json({ success: false, error: 'Failed to save keyword_selected response.' });
    }

    return res.status(201).json({ success: true, data });
  } catch (err) {
    console.error('keyword-selected handler error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};
