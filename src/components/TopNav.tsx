import Link from 'next/link';

export default function TopNav() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-[var(--ink-muted)]">Texas + Remote</p>
        <h1 className="text-3xl md:text-4xl font-semibold">Frontend Radar</h1>
        <p className="text-sm text-[var(--ink-muted)]">Scans every 6 hours for roles in Texas or US remote.</p>
      </div>
      <nav className="flex items-center gap-3">
        <Link className="secondary-button" href="/">
          Live Feed
        </Link>
        <Link className="secondary-button" href="/applied">
          Applied
        </Link>
        <Link className="primary-button" href="/account">
          Account
        </Link>
      </nav>
    </header>
  );
}
