import { NavLink, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { indexer } from '../api/client';
import { GridIcon, ReceiptIcon, WalletIcon } from './icons';
import type { HealthDto } from '../api/types';

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
  icon: React.ReactElement;
}

const NAV: NavItem[] = [
  { to: '/', label: 'Browse', end: true, icon: <GridIcon /> },
  { to: '/leases', label: 'Leases', icon: <ReceiptIcon /> },
];

export function Layout() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: () => indexer.health(),
    refetchInterval: 30_000,
  });

  return (
    <div className="min-h-screen flex flex-col bg-br-surface">
      <div className="flex flex-1">
        {/* Sidebar nav (Spotify DNA §4). Slight elevation from surface, no
            structural border — the bg shift is the separator (ui-design §6). */}
        <aside className="hidden md:flex w-sidebar shrink-0 flex-col bg-br-surface-1 px-6 py-8">
          <Logo />
          <nav className="mt-10 flex flex-col gap-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  [
                    'group relative flex items-center gap-3 rounded px-3 py-2 text-sm font-medium transition',
                    isActive
                      ? 'text-br-fg'
                      : 'text-br-muted hover:text-br-fg hover:bg-br-surface-2',
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <>
                    {/* 2-signal active indicator: colour + accent bar (§8 nav) */}
                    {isActive && (
                      <span
                        aria-hidden
                        className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-br-accent"
                      />
                    )}
                    <span
                      className={
                        isActive ? 'text-br-accent' : 'text-br-dim group-hover:text-br-fg'
                      }
                    >
                      {item.icon}
                    </span>
                    {item.label}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto pt-8">
            <HealthIndicator data={health.data} error={health.error} loading={health.isLoading} />
          </div>
        </aside>

        <main className="flex-1 overflow-auto pb-24">
          <Outlet />
        </main>
      </div>

      {/* Sticky active-lease bar (Spotify DNA §7). Placeholder until wallet
          lands with Plan 2 SDK. Sits above the main overflow. */}
      <ActiveLeaseBar />
    </div>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <img
        src="/brand/logo-mark.svg"
        alt=""
        width={36}
        height={38}
        className="shrink-0 drop-shadow-[0_0_18px_hsl(168,88%,42%,0.25)]"
      />
      <div>
        <div className="text-base font-semibold tracking-tight leading-none">ByteRent</div>
        <div className="mt-1.5 text-[10px] uppercase tracking-[0.14em] text-br-dim">
          testnet
        </div>
      </div>
    </div>
  );
}

function HealthIndicator({
  data,
  error,
  loading,
}: {
  data: HealthDto | undefined;
  error: unknown;
  loading: boolean;
}) {
  const dotColor =
    loading || !data
      ? 'bg-br-faint'
      : error
      ? 'bg-br-danger'
      : data.healthy
      ? 'bg-br-success'
      : 'bg-br-warning';
  const status = loading
    ? 'connecting'
    : error
    ? 'offline'
    : data?.healthy
    ? 'healthy'
    : 'degraded';

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={`inline-block h-2 w-2 rounded-full ${dotColor}`} aria-hidden />
      <div className="flex flex-col">
        <span className="text-br-muted">indexer · {status}</span>
        {data && !error && (
          <span className="text-br-dim font-mono">
            tip {data.tip_block_number.toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
}

function ActiveLeaseBar() {
  return (
    <div className="sticky bottom-0 z-[100] bg-br-surface-1/95 backdrop-blur supports-[backdrop-filter]:bg-br-surface-1/70 shadow-lg">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-3.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-br-surface-2 text-br-dim">
          <WalletIcon />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-br-fg">No wallet connected</div>
          <div className="text-xs text-br-dim">Track your active leases in real-time</div>
        </div>
        <button
          type="button"
          className="rounded bg-br-accent px-4 py-2 text-sm font-medium text-br-accent-ink transition hover:bg-br-accent-hover disabled:opacity-40 disabled:cursor-not-allowed"
          disabled
          title="Wallet integration ships with Plan 2 SDK"
        >
          Connect wallet
        </button>
      </div>
    </div>
  );
}
