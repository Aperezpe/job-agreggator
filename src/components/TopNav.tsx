'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function TopNav() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <header className="header">
      <div className="header-left">
        <div className="location-tag">Texas + Remote</div>
        <h1>Frontend Radar</h1>
        <p className="subtitle">
          <span className="pulse-dot" aria-hidden="true" />
          Scans every 6 hours for roles in Texas or US remote.
        </p>
      </div>
      <nav className="nav-tabs">
        <Link className={`nav-tab${isActive('/') ? ' nav-tab-active' : ''}`} href="/">
          Live Feed
        </Link>
        <Link className={`nav-tab${isActive('/applied') ? ' nav-tab-active' : ''}`} href="/applied">
          Applied
        </Link>
        <Link className={`nav-tab${isActive('/hidden') ? ' nav-tab-active' : ''}`} href="/hidden">
          Hidden
        </Link>
        <Link className={`nav-tab${isActive('/account') ? ' nav-tab-active' : ''}`} href="/account">
          Account
        </Link>
      </nav>
    </header>
  );
}
