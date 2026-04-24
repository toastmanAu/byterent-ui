// Settings page. Since the light-client port, the indexer-URL picker is
// gone — the browser runs its own node, there's nothing to point at. We
// keep the route for future settings + to show the user diagnostics
// about the local light client's sync state and peer count.

import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getSyncStatus, type SyncStatus } from '../api/light/syncStatus';
import { ArrowLeftIcon } from '../components/icons';

export function Settings() {
  const navigate = useNavigate();
  const sync = useQuery({
    queryKey: ['light-client-sync'],
    queryFn: () => getSyncStatus(),
    refetchInterval: 5_000,
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-8 md:py-10">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-2 text-sm text-br-muted hover:text-br-fg transition"
      >
        <ArrowLeftIcon size={16} /> Back
      </button>

      <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-1 text-sm text-br-dim">
        ByteRent runs a CKB light client directly in your browser. No external
        indexer needed — data comes with a block proof from peer nodes.
      </p>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-br-muted">
          Light client
        </h2>

        <dl className="mt-4 grid gap-3 rounded-xl bg-br-surface-1 p-5 text-sm">
          <Row label="Status" value={syncLabel(sync.data, sync.isLoading, !!sync.error)} />
          <Row label="Peers connected" value={sync.data ? String(sync.data.connections) : '—'} />
          <Row
            label="Tip block"
            value={sync.data ? sync.data.tipBlock.toLocaleString() : '—'}
            mono
          />
          <Row
            label="Synced block"
            value={sync.data ? sync.data.syncedBlock.toLocaleString() : '—'}
            mono
          />
          <Row label="Sync progress" value={sync.data ? `${Math.floor(sync.data.syncedPercent)}%` : '—'} />
          <Row label="Scripts tracked" value={sync.data ? String(sync.data.scriptsRegistered) : '—'} />
          <Row
            label="Node ID"
            value={sync.data ? truncate(sync.data.nodeId) : '—'}
            mono
          />
        </dl>

        <p className="mt-4 text-xs text-br-dim">
          The first load of the dApp cold-starts the light client — expect a 10–30s delay
          as it handshakes with peers and catches up the header chain. Subsequent loads
          are instant (state lives in IndexedDB).
        </p>
      </section>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-br-dim">{label}</dt>
      <dd className={mono ? 'font-mono text-br-fg' : 'text-br-fg'}>{value}</dd>
    </div>
  );
}

function truncate(s: string, keep = 8): string {
  if (s.length <= keep * 2 + 3) return s;
  return `${s.slice(0, keep)}…${s.slice(-keep)}`;
}

function syncLabel(data: SyncStatus | undefined, loading: boolean, error: boolean): string {
  if (loading) return 'starting';
  if (error) return 'offline';
  if (!data) return 'unknown';
  if (data.connections < 2) return 'connecting to peers';
  if (data.syncedPercent >= 99) return 'synced';
  return `syncing (${Math.floor(data.syncedPercent)}%)`;
}
