import { useRouter } from 'next/router';

const NAV_ITEMS = [
  { href: '/dashboard/consolidated', label: 'Consolidated Report' },
  { href: '/dashboard/keyword1', label: 'Keyword 1' },
  { href: '/dashboard/keyword2', label: 'Keyword 2' },
  { href: '/dashboard/keyword3', label: 'Keyword 3' },
];

export default function Layout({ title, subtitle, username, children }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span>WA</span> Campaign Manager
        </div>
        {NAV_ITEMS.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={`nav-link ${router.pathname === item.href ? 'active' : ''}`}
          >
            {item.label}
          </a>
        ))}
        <div className="nav-spacer" />
      </aside>

      <main className="main">
        <div className="topbar">
          {username ? <span className="username">Signed in as {username}</span> : null}
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
        <h1 className="page-title">{title}</h1>
        {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
        {children}
      </main>
    </div>
  );
}
