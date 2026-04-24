import { NavLink, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { indexer } from '../api/client';
import { GridIcon, ReceiptIcon, SettingsIcon, WalletIcon } from './icons';
import { TopBar } from './TopBar';
import { useWallet } from '../wallet/useWallet';
import { formatAddress } from '../wallet/formatAddress';
import type { SyncStatus } from '../api/light/syncStatus';

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
  icon: React.ReactElement;
}

const NAV: NavItem[] = [
  { to: '/', label: 'Browse', end: true, icon: <GridIcon /> },
  { to: '/leases', label: 'Leases', icon: <ReceiptIcon /> },
  { to: '/settings', label: 'Settings', icon: <SettingsIcon /> },
];

export function Layout() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: () => indexer.health(),
    refetchInterval: 30_000,
  });

  return (
    <div className="min-h-screen flex flex-col bg-br-surface">
      <TopBar />
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
                    // Active has 3 signals (accent bar + bg + white text); hover
                    // only lightens text and adds a subtle bg — so active always
                    // reads stronger than hover (ui-design §9 active>hover).
                    isActive
                      ? 'bg-br-surface-2 text-br-fg'
                      : 'text-br-muted hover:text-br-fg hover:bg-br-surface-2/40',
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
  data: SyncStatus | undefined;
  error: unknown;
  loading: boolean;
}) {
  // Sidebar indicator reflects the public CKB RPC state — that's the
  // primary read backend since the hybrid rewire. Light-client status
  // (peer count, sync progress, scripts watched) lives in /settings
  // since it's only meaningful once the user's wallet is connected.
  const dotColor =
    loading || !data
      ? 'bg-br-faint'
      : error || !data.rpcReachable
      ? 'bg-br-danger'
      : 'bg-br-success';

  const label = loading
    ? 'connecting'
    : error || !data?.rpcReachable
    ? 'offline'
    : 'online';

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={`inline-block h-2 w-2 rounded-full ${dotColor}`} aria-hidden />
      <div className="flex flex-col">
        <span className="text-br-muted">rpc · {label}</span>
        {data && data.rpcReachable && (
          <span className="text-br-dim font-mono">
            tip {data.tipBlock.toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
}

function ActiveLeaseBar() {
  const { isConnected, address, walletName, connect, disconnect } = useWallet();

  return (
    <div className="sticky bottom-0 z-[100] bg-br-surface-1/95 backdrop-blur supports-[backdrop-filter]:bg-br-surface-1/70 shadow-lg">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 md:gap-4 md:px-6 md:py-3.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-br-surface-2 text-br-dim md:h-10 md:w-10">
          <WalletIcon />
        </div>
        <div className="flex-1 min-w-0">
          {isConnected && address ? (
            // Full address, wrapped. `break-all` allows mid-string wrap (CKB
            // addresses have no natural break points); `font-mono` keeps the
            // wrapped block rectangular and scannable; `leading-snug` stops
            // the 3-4 lines from dominating the bar vertically.
            <div className="font-mono text-[11px] leading-snug text-br-fg break-all">
              {formatAddress(address)}
            </div>
          ) : (
            <div className="text-sm text-br-fg truncate">No wallet connected</div>
          )}
          {/* Sub-copy hidden on mobile to leave room for the CTA (ui-design §2
              proximity — related signals stay grouped; less-essential copy
              yields space first). */}
          <div className="hidden sm:block text-xs text-br-dim mt-0.5">
            {isConnected && walletName
              ? `via ${walletName}`
              : 'Track your active leases in real-time'}
          </div>
        </div>
        <button
          type="button"
          className="rounded bg-br-accent px-3.5 py-2 text-sm font-medium text-br-accent-ink transition hover:bg-br-accent-hover disabled:opacity-40 disabled:cursor-not-allowed md:px-4"
          onClick={isConnected ? disconnect : connect}
        >
          {isConnected ? (
            'Disconnect'
          ) : (
            <>
              Connect
              <span className="hidden sm:inline"> wallet</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
