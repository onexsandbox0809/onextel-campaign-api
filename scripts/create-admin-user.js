/**
 * Usage (run locally, never in the browser):
 *   node scripts/create-admin-user.js <username> <password>
 *
 * Requires the same env vars as the app: NEXT_PUBLIC_SUPABASE_URL and
 * SUPABASE_SERVICE_ROLE_KEY (put them in a local .env.local and load it,
 * or export them in your shell first).
 */
require('dotenv').config({ path: '.env.local' });
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

async function main() {
  const [, , username, password] = process.argv;

  if (!username || !password) {
    console.error('Usage: node scripts/create-admin-user.js <username> <password>');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment.');
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const password_hash = await bcrypt.hash(password, 10);

  const { data, error } = await supabase
    .from('app_users')
    .upsert({ username, password_hash, is_active: true }, { onConflict: 'username' })
    .select('id, username')
    .single();

  if (error) {
    console.error('Failed to create/update user:', error.message);
    process.exit(1);
  }

  console.log(`User "${data.username}" is ready to sign in.`);
}

main();
