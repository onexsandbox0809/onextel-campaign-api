const { createClient } = require('@supabase/supabase-js');

// Reuse a single client per warm Lambda/serverless instance instead of
// creating a new one on every request. supabase-js talks to Supabase over
// HTTPS (PostgREST), so this does not hold an open Postgres connection open -
// it just avoids re-creating the fetch/client wrapper for every invocation,
// which matters at high concurrency (thousands of requests/minute).
let cachedClient = null;

function getSupabaseAdmin() {
  if (cachedClient) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.'
    );
  }

  cachedClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: 'public' },
    global: { fetch },
  });

  return cachedClient;
}

module.exports = { getSupabaseAdmin };
