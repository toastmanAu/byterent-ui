// Mobile top bar — shown when the sidebar is hidden (below md:).
// Compact logo + route tabs. No hamburger menu because 2 items fit
// natively; if the nav grows beyond 3-4 items, switch to a menu.

import { NavLink } from 'react-router-dom';
import { GridIcon, ReceiptIcon } from './icons';

const NAV = [
  { to: '/', label: 'Browse', end: true, icon: <GridIcon size={16} /> },
  { to: '/leases', label: 'Leases', icon: <ReceiptIcon size={16} /> },
];

export function TopBar() {
  return (
    <header className="sticky top-0 z-[90] flex items-center gap-4 bg-br-surface-1/95 backdrop-blur supports-[backdrop-filter]:bg-br-surface-1/70 px-4 py-3 md:hidden">
      <NavLink to="/" className="flex items-center gap-2.5" aria-label="ByteRent home">
        <img src="/brand/logo-mark.svg" alt="" width={28} height={30} />
        <span className="text-base font-semibold tracking-tight">ByteRent</span>
      </NavLink>
      <nav className="ml-auto flex items-center gap-1">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              [
                'flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition',
                isActive
                  ? 'bg-br-surface-2 text-br-fg'
                  : 'text-br-muted hover:text-br-fg',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                <span className={isActive ? 'text-br-accent' : 'text-br-dim'}>
                  {n.icon}
                </span>
                {n.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
