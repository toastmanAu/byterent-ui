// Settings page. Since the light-client port, the indexer-URL picker is
// gone — the browser runs its own node, there's nothing to point at. We
// keep the route for future settings + to show the user diagnostics
// about the local light client's sync state and peer count.

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ccc } from '@ckb-ccc/connector-react';
import { getSyncStatus, type SyncStatus } from '../api/light/syncStatus';
import { ArrowLeftIcon } from '../components/icons';
import { useWallet } from '../wallet/useWallet';

const TESTNET_TX_EXPLORER = 'https://testnet.explorer.nervos.org/transaction';

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

      <TestSignSection />
    </div>
  );
}

function TestSignSection() {
  const { isConnected, signer, address } = useWallet();
  const [status, setStatus] = useState<
    | { kind: 'idle' }
    | { kind: 'building' }
    | { kind: 'waiting' }
    | { kind: 'submitting' }
    | { kind: 'done'; txHash: string }
    | { kind: 'error'; message: string }
  >({ kind: 'idle' });

  const onClick = async () => {
    if (!signer || !address) return;
    setStatus({ kind: 'building' });
    try {
      // 64-byte self-transfer: send 62 CKB (sighash min capacity) back
      // to the same address. Smallest realistic JoyID-signed tx —
      // exercises the full redirect-relay path without needing any
      // ByteRent-specific scripts.
      const tx = ccc.Transaction.from({
        outputs: [
          {
            lock: (await signer.getRecommendedAddressObj()).script,
            capacity: ccc.fixedPointFrom(62),
          },
        ],
        outputsData: ['0x'],
      });

      await tx.completeInputsByCapacity(signer);

      // ckb-transactions.md §1: pad witness[0] with 1000-byte
      // placeholder BEFORE completeFeeBy so fee estimate accounts for
      // JoyID's real lock size. Subsequent signing trims it back.
      const placeholder = ccc.WitnessArgs.from({
        lock: '0x' + '00'.repeat(1000),
      });
      if (tx.witnesses.length === 0) {
        tx.witnesses.push(ccc.hexFrom(placeholder.toBytes()));
      } else {
        tx.witnesses[0] = ccc.hexFrom(placeholder.toBytes());
      }

      await tx.completeFeeBy(signer, 1000);

      setStatus({ kind: 'waiting' });
      const signed = await signer.signOnlyTransaction(tx);

      setStatus({ kind: 'submitting' });
      const txHash = await signer.client.sendTransaction(signed);
      setStatus({ kind: 'done', txHash });
    } catch (err) {
      setStatus({
        kind: 'error',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };

  return (
    <section className="mt-10">
      <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-br-muted">
        Developer · sign test
      </h2>

      <div className="mt-4 rounded-xl bg-br-surface-1 p-5 text-sm">
        <p className="text-br-dim">
          Exercises the JoyID redirect-relay signing path end-to-end by sending{' '}
          <span className="font-mono text-br-fg">62 Fibt</span> back to yourself
          on testnet. Returns a real tx hash you can look up on-chain.
        </p>

        {!isConnected && (
          <p className="mt-3 text-xs text-br-warning">
            Connect a wallet first — the sign button stays disabled until a JoyID
            session is active.
          </p>
        )}

        <button
          type="button"
          onClick={onClick}
          disabled={!isConnected || status.kind === 'building' || status.kind === 'waiting' || status.kind === 'submitting'}
          className="mt-4 rounded bg-br-accent px-4 py-2 text-sm font-medium text-br-accent-ink transition hover:bg-br-accent-hover disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {status.kind === 'building' && 'Building tx…'}
          {status.kind === 'waiting' && 'Waiting for phone…'}
          {status.kind === 'submitting' && 'Submitting…'}
          {(status.kind === 'idle' || status.kind === 'done' || status.kind === 'error') && 'Sign test transaction'}
        </button>

        {status.kind === 'done' && (
          <div className="mt-4 rounded bg-br-surface-2 p-3 text-xs">
            <div className="text-br-success">Tx accepted by pool ✓</div>
            <a
              href={`${TESTNET_TX_EXPLORER}/${status.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 block font-mono text-[11px] break-all text-br-accent hover:underline"
            >
              {status.txHash}
            </a>
          </div>
        )}
        {status.kind === 'error' && (
          <div className="mt-4 rounded bg-br-surface-2 p-3 text-xs text-br-danger">
            {status.message}
          </div>
        )}
      </div>
    </section>
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
