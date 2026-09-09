const bcrypt = require('bcryptjs');
const { getSupabaseAdmin } = require('../../lib/supabaseAdmin');
const { signSessionToken, buildSessionCookie } = require('../../lib/auth');
const { requiredString } = require('../../lib/validate');

export const config = {
  api: {
    bodyParser: { sizeLimit: '10kb' },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  const body = req.body || {};
  const username = requiredString(body.username, 100);
  const password = typeof body.password === 'string' ? body.password : null;

  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'username and password are required.' });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: user, error } = await supabase
      .from('app_users')
      .select('id, username, password_hash, is_active')
      .ilike('username', username)
      .maybeSingle();

    // Always run a bcrypt compare even when the user isn't found, using a
    // fixed dummy hash, so response timing doesn't reveal whether the
    // username exists.
    const dummyHash = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8j8sSD5NfC3F9m6M6M6h8y8y8y8y8y';
    const hashToCheck = user && user.is_active ? user.password_hash : dummyHash;
    const passwordMatches = await bcrypt.compare(password, hashToCheck);

    if (error || !user || !user.is_active || !passwordMatches) {
      return res.status(401).json({ success: false, error: 'Invalid username or password.' });
    }

    const token = signSessionToken(user);
    res.setHeader('Set-Cookie', buildSessionCookie(token));
    return res.status(200).json({ success: true, data: { username: user.username } });
  } catch (err) {
    console.error('login handler error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};
