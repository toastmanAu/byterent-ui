// Settings page. Since the light-client port, the indexer-URL picker is
// gone — the browser runs its own node, there's nothing to point at. We
// keep the route for future settings + to show the user diagnostics
// about the local light client's sync state and peer count.

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ccc } from '@ckb-ccc/connector-react';
import type { JoyIDRedirectSigner, TxPreview } from '@byterent/joyid-connect';
import { consumeSameDeviceSignResult } from '@byterent/joyid-connect';
import { getSyncStatus, type SyncStatus } from '../api/light/syncStatus';
import { ArrowLeftIcon } from '../components/icons';
import { useWallet } from '../wallet/useWallet';
import { isMobileDevice } from '../wallet/isMobileDevice';

const TESTNET_TX_EXPLORER = 'https://testnet.explorer.nervos.org/transaction';

// Wallet addresses on CKB are ~100 chars. Truncate for preview rows
// so the phone UI doesn't wrap into a scrollable block.
function truncateAddress(addr: string, keep = 8): string {
  if (addr.length <= keep * 2 + 3) return addr;
  return `${addr.slice(0, keep)}…${addr.slice(-keep)}`;
}

// Convert a fee in shannons to a friendly "X.XXX CKB" — at pool-min
// fees this is typically <0.001 CKB so we drop to shannons for display.
function formatFee(shannons: bigint): string {
  if (shannons < 100_000_000n) return `${shannons.toString()} shannons`;
  // Divide keeping 8 decimals, then trim trailing zeros.
  const whole = shannons / 100_000_000n;
  const frac = (shannons % 100_000_000n).toString().padStart(8, '0').replace(/0+$/, '');
  return frac.length ? `${whole}.${frac} CKB` : `${whole} CKB`;
}

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

      <WalletModeSection />

      <TestSignSection />
    </div>
  );
}

function WalletModeSection() {
  const onMobile = isMobileDevice();
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';

  return (
    <section className="mt-10">
      <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-br-muted">
        Wallet mode
      </h2>

      <dl className="mt-4 grid gap-3 rounded-xl bg-br-surface-1 p-5 text-sm">
        <Row
          label="Detected"
          value={onMobile ? 'mobile (stock CCC)' : 'desktop (redirect-relay)'}
        />
        <Row
          label="Override"
          value={
            new URLSearchParams(location.search).get('forceMobile') === '1'
              ? 'forceMobile=1'
              : new URLSearchParams(location.search).get('forceDesktop') === '1'
                ? 'forceDesktop=1'
                : '—'
          }
        />
        <div className="flex items-start justify-between gap-4">
          <dt className="text-br-dim shrink-0">User-Agent</dt>
          <dd className="font-mono text-[11px] text-br-fg break-all text-right">
            {ua}
          </dd>
        </div>
      </dl>

      <p className="mt-3 text-xs text-br-dim">
        Append <span className="font-mono">?forceDesktop=1</span> or{' '}
        <span className="font-mono">?forceMobile=1</span> to the URL to override.
      </p>
    </section>
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

  // On mobile, signOnlyTransaction navigates away — the click handler
  // never reaches the submit step. On return, consumeSameDeviceSignResult
  // hands us the reconstructed signed tx. Submit it here + display the
  // result, same UI state machine as the desktop flow.
  //
  // useRef gate prevents React 19 StrictMode's dev double-invoke from
  // consuming the result twice (second call would return null anyway
  // since state is cleared, but the visible "submitting" → "done" flash
  // only needs to run once).
  const resumed = useRef(false);
  useEffect(() => {
    if (resumed.current) return;
    resumed.current = true;
    const result = consumeSameDeviceSignResult();
    if (!result || !signer) return;
    setStatus({ kind: 'submitting' });
    signer.client
      .sendTransaction(result.signedTx)
      .then((txHash) => setStatus({ kind: 'done', txHash }))
      .catch((err: unknown) =>
        setStatus({
          kind: 'error',
          message: err instanceof Error ? err.message : String(err),
        }),
      );
  }, [signer]);

  const onClick = async () => {
    if (!signer || !address) return;
    setStatus({ kind: 'building' });
    try {
      // Self-transfer at the minimum viable capacity for the wallet's
      // own lock script. Different locks have different arg lengths
      // (secp256k1 = 20B, JoyID = 22B, etc.) so their min-occupied
      // capacity differs — compute from the script rather than
      // hard-coding. `occupiedSize` returns: code_hash(32) + hash_type(1)
      // + args.length. The output also needs 8 bytes for its own
      // capacity field. Add 1 CKB of headroom so the tx survives
      // any small padding changes.
      const ownerScript = (await signer.getRecommendedAddressObj()).script;
      const minCellBytes = 8 + ownerScript.occupiedSize;
      const capacity = ccc.fixedPointFrom(minCellBytes + 1);

      const tx = ccc.Transaction.from({
        outputs: [
          {
            lock: ownerScript,
            capacity,
          },
        ],
        outputsData: ['0x'],
      });

      // Attach the JoyID lock cell_dep BEFORE input collection. CCC's
      // completeFee loop can fail to re-apply the signer's prepareTransaction
      // cell_deps in change iterations — empirically we hit ScriptNotFound
      // on the JoyID lock code hash when relying on prepareTransaction alone.
      // Adding it up front survives every loop iteration because cellDeps
      // only grows, never clears.
      await tx.addCellDepsOfKnownScripts(signer.client, ccc.KnownScript.JoyId);

      await tx.completeInputsByCapacity(signer);

      // ckb-transactions.md §1: pre-pad witness[0] with a 1000-byte
      // WitnessArgs lock placeholder BEFORE completeFeeBy. The signer's
      // prepareTransaction also pads, but CCC's completeFee clone-and-
      // copy loop can lose the padding in some iterations — we've seen
      // fee under-counts of ~384 bytes on JoyID txs when relying on
      // prepareTransaction alone. Padding here guarantees the fee
      // estimator sees a conservative witness size from the first
      // measurement.
      const placeholder = ccc.WitnessArgs.from({
        lock: '0x' + '00'.repeat(1000),
      });
      if (tx.witnesses.length === 0) {
        tx.witnesses.push(ccc.hexFrom(placeholder.toBytes()));
      } else {
        tx.witnesses[0] = ccc.hexFrom(placeholder.toBytes());
      }

      await tx.completeFeeBy(signer, 1000);

      // Stage a human-readable preview for the phone-side confirmation
      // page. The signer consumes `pendingPreview` once and clears it,
      // so this has to happen right before the sign call. Fee is the
      // net (inputs - outputs) at this point, since completeFeeBy has
      // balanced the tx.
      const inputsCap = await tx.getInputsCapacity(signer.client);
      const outputsCap = tx.getOutputsCapacity();
      const feeShannons = inputsCap - outputsCap;

      const preview: TxPreview = {
        title: 'Test self-transfer',
        amount: `${capacity / 100_000_000n} CKB`,
        details: [
          { label: 'From', value: truncateAddress(address), mono: true },
          { label: 'To', value: truncateAddress(address), mono: true },
          { label: 'Network fee', value: formatFee(feeShannons) },
          { label: 'Purpose', value: 'Wallet-signing smoke test' },
        ],
        network: 'testnet',
      };

      // JoyIDRedirectSigner has a side-channel `pendingPreview` field
      // the library exposes for this. Cast is safe: the connector
      // extends ccc.Signer with the extra field, not every Signer has it.
      const joyIdSigner = signer as unknown as JoyIDRedirectSigner;
      if ('pendingPreview' in joyIdSigner) {
        joyIdSigner.pendingPreview = preview;
      }

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
          <span className="font-mono text-br-fg">62 CKB</span> back to yourself
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
