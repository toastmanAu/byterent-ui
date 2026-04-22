import { NavLink, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { indexer } from '../api/client';

const NAV = [
  { to: '/', label: 'Browse', end: true },
  { to: '/leases', label: 'My Leases' },
];

export function Layout() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: () => indexer.health(),
  });

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex flex-1">
        {/* Sidebar nav — item 4 of the Spotify DNA. Placeholder shell for
            Chunk 3's ui-design polish. */}
        <aside className="w-56 shrink-0 border-r border-byterent-border bg-byterent-elevated p-6 flex flex-col">
          <div className="text-xl font-semibold mb-8 tracking-tight">ByteRent</div>
          <nav className="flex flex-col gap-1">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-sm transition ${
                    isActive
                      ? 'bg-byterent-surface text-white'
                      : 'text-byterent-muted hover:text-white hover:bg-byterent-surface/60'
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto text-xs text-byterent-muted">
            <HealthIndicator health={health.data} error={health.error} loading={health.isLoading} />
          </div>
        </aside>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* Sticky active-lease bar — item 7 of the Spotify DNA. Placeholder
          for Chunk 3; will show the user's next-expiring lease when a
          wallet is connected (wallet integration comes with Plan 2 SDK). */}
      <div className="border-t border-byterent-border bg-byterent-elevated px-6 py-3 text-sm text-byterent-muted">
        Connect wallet to see active leases
      </div>
    </div>
  );
}

function HealthIndicator({
  health,
  error,
  loading,
}: {
  health: Awaited<ReturnType<typeof indexer.health>> | undefined;
  error: unknown;
  loading: boolean;
}) {
  if (loading) return <div>indexer: connecting…</div>;
  if (error) {
    return (
      <div>
        indexer: <span className="text-red-400">offline</span>
      </div>
    );
  }
  if (!health) return null;
  const color = health.healthy ? 'text-byterent-accent' : 'text-red-400';
  return (
    <div>
      indexer: <span className={color}>{health.healthy ? 'healthy' : 'degraded'}</span>
      <div className="mt-0.5">tip {health.tip_block_number.toLocaleString()}</div>
    </div>
  );
}
