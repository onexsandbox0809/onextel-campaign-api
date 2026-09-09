import { useState } from 'react';
import { useRouter } from 'next/router';
import { getSessionFromRequest } from '../lib/auth';

export async function getServerSideProps(context) {
  const session = getSessionFromRequest(context.req);
  if (session) {
    return { redirect: { destination: '/dashboard/consolidated', permanent: false } };
  }
  return { props: {} };
}

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || 'Invalid username or password.');
        return;
      }
      router.push('/dashboard/consolidated');
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-hero">
          <h1>Messaging solutions to scale your business</h1>
          <p>
            SMS &amp; WhatsApp campaign tracking with end-to-end encryption, DLT-friendly delivery,
            realtime analytics, and intelligent keyword-based response capture.
          </p>
        </div>

        <div className="login-form-panel">
          <h2>Sign In</h2>
          {error ? <div className="login-error">{error}</div> : null}
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button className="login-submit" type="submit" disabled={submitting}>
              {submitting ? 'Signing in...' : 'Sign In →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
