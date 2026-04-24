// Create-listing form. Lessors use this to commit a slice of their
// idle CKB as a lease pool.
//
// The on-chain listing-type script enforces floors from Market Config
// (min_listing_capacity, min_fill_capacity, min_lease_epochs). We
// fetch MC before signing so we can validate client-side and produce
// actionable errors instead of an opaque pool rejection.

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ccc } from '@ckb-ccc/connector-react';
import type { JoyIDRedirectSigner, TxPreview } from '@byterent/joyid-connect';
import { consumeSameDeviceSignResult } from '@byterent/joyid-connect';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeftIcon } from '../components/icons';
import { useWallet } from '../wallet/useWallet';
import { isMobileDevice } from '../wallet/isMobileDevice';
import { MobileSignConfirm } from '../wallet/MobileSignConfirm';
import { toast } from '../components/Toast';
import { buildMintListingTx } from '../api/tx/mintListing';
import { getPublicRpcClient } from '../api/light/rpc';
import { BYTERENT_TESTNET_MANIFEST } from '../api/light/manifest';
import { MarketConfigData } from '../api/light/molecule';

const TESTNET_TX_EXPLORER = 'https://testnet.explorer.nervos.org/transaction';
const SHANNONS_PER_CKB = 100_000_000n;

export function NewListing() {
  const navigate = useNavigate();
  const { isConnected, signer } = useWallet();

  // Market Config floors drive form validation. Fetched once per
  // page visit via public RPC — cheap enough to re-fetch each mount.
  const marketConfig = useQuery({
    queryKey: ['market-config'],
    queryFn: fetchMarketConfig,
    staleTime: 5 * 60_000,
  });

  // Form state — strings so user can type freely before numeric parse.
  const [capacityCkb, setCapacityCkb] = useState('10000');
  const [durationEpochs, setDurationEpochs] = useState('6');
  const [rate, setRate] = useState('2000');
  const [minFillCkb, setMinFillCkb] = useState('100');
  const [allowPartialFill, setAllowPartialFill] = useState(true);

  type Status =
    | { kind: 'idle' }
    | { kind: 'building' }
    | { kind: 'waiting' }
    | { kind: 'submitting' }
    | { kind: 'done'; txHash: string; listingId: string }
    | { kind: 'error'; message: string };
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  // Held while the mobile confirmation modal is up.
  const [pendingMobileSign, setPendingMobileSign] = useState<
    | { tx: ccc.Transaction; preview: TxPreview; listingId: string }
    | null
  >(null);

  // Mobile post-return resume — see Settings.tsx TestSignSection for
  // the parallel pattern.
  const resumed = useRef(false);
  useEffect(() => {
    if (!signer) return;
    if (resumed.current) return;
    const result = consumeSameDeviceSignResult();
    if (!result) return;
    resumed.current = true;
    // We don't know the listing id here — we stored it in the preview
    // metadata. Extract from preview details if present, else fall
    // back to "check recent listings".
    const listingId =
      result.preview?.details.find((r) => r.label === 'Listing id')?.value ?? '(unknown)';
    setStatus({ kind: 'submitting' });
    signer.client
      .sendTransaction(result.signedTx)
      .then((txHash) => {
        setStatus({ kind: 'done', txHash, listingId });
        toast.success('Listing created', {
          href: `${TESTNET_TX_EXPLORER}/${txHash}`,
          hrefLabel: `${txHash.slice(0, 10)}…${txHash.slice(-8)}`,
        });
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        setStatus({ kind: 'error', message });
        toast.error(`Submit failed: ${message}`);
      });
  }, [signer]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signer) return;

    setStatus({ kind: 'building' });

    try {
      const capacityShannons = parseBigintCkb(capacityCkb);
      const minFillShannons = parseBigintCkb(minFillCkb);
      const duration = BigInt(durationEpochs);
      const rateBig = BigInt(rate);

      if (marketConfig.data) {
        if (capacityShannons < marketConfig.data.min_listing_capacity_shannons) {
          throw new Error(
            `Capacity ${capacityCkb} CKB is below the market floor of ${formatCkb(marketConfig.data.min_listing_capacity_shannons)} CKB.`,
          );
        }
        if (minFillShannons < marketConfig.data.min_fill_capacity_shannons) {
          throw new Error(
            `Min fill ${minFillCkb} CKB is below the market floor of ${formatCkb(marketConfig.data.min_fill_capacity_shannons)} CKB.`,
          );
        }
        if (duration < marketConfig.data.min_lease_epochs) {
          throw new Error(
            `Duration ${duration} epochs is below the market floor of ${marketConfig.data.min_lease_epochs} epochs.`,
          );
        }
      }

      if (rateBig <= 0n) {
        throw new Error('Rate must be greater than zero.');
      }

      const { tx, listingId, feeShannons } = await buildMintListingTx(signer, {
        capacityTotalShannons: capacityShannons,
        durationEpochs: duration,
        rateShannonsPerBytePerEpoch: rateBig,
        minFillShannons,
        allowPartialFill,
      });

      const preview: TxPreview = {
        title: 'Create listing',
        amount: `${formatCkb(capacityShannons)} CKB`,
        details: [
          { label: 'Duration', value: `${duration} epochs` },
          { label: 'Rate', value: `${rateBig.toString()} shannons/byte/epoch` },
          { label: 'Min fill', value: `${formatCkb(minFillShannons)} CKB` },
          { label: 'Partial fill', value: allowPartialFill ? 'allowed' : 'not allowed' },
          { label: 'Tx fee', value: formatFee(feeShannons) },
          { label: 'Listing id', value: `${listingId.slice(0, 12)}…`, mono: true },
        ],
        network: 'testnet',
      };

      const joyIdSigner = signer as unknown as JoyIDRedirectSigner;
      if ('pendingPreview' in joyIdSigner) {
        joyIdSigner.pendingPreview = preview;
      }

      if (isMobileDevice()) {
        setPendingMobileSign({ tx, preview, listingId });
        return;
      }

      setStatus({ kind: 'waiting' });
      const signed = await signer.signOnlyTransaction(tx);
      setStatus({ kind: 'submitting' });
      const txHash = await signer.client.sendTransaction(signed);
      setStatus({ kind: 'done', txHash, listingId });
      toast.success('Listing created', {
        href: `${TESTNET_TX_EXPLORER}/${txHash}`,
        hrefLabel: `${txHash.slice(0, 10)}…${txHash.slice(-8)}`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setStatus({ kind: 'error', message });
      toast.error(`Listing failed: ${message}`);
    }
  };

  const onMobileConfirm = () => {
    if (!pendingMobileSign || !signer) return;
    setPendingMobileSign(null);
    setStatus({ kind: 'waiting' });
    void signer.signOnlyTransaction(pendingMobileSign.tx).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      setStatus({ kind: 'error', message });
      toast.error(`Sign failed: ${message}`);
    });
  };

  const onMobileCancel = () => {
    setPendingMobileSign(null);
    setStatus({ kind: 'idle' });
  };

  const busy =
    status.kind === 'building' || status.kind === 'waiting' || status.kind === 'submitting';

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-8 md:py-10">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-2 text-sm text-br-muted hover:text-br-fg transition"
      >
        <ArrowLeftIcon size={16} /> Back
      </button>

      <h1 className="text-xl font-semibold tracking-tight">Create a listing</h1>
      <p className="mt-1 text-sm text-br-dim">
        Commit a slice of your CKB capacity to the lease pool. Other users can rent against
        it for the duration you set, at the rate you choose.
      </p>

      {!isConnected && (
        <p className="mt-4 text-xs text-br-warning">
          Connect a wallet first — the submit button stays disabled until a JoyID session is active.
        </p>
      )}

      {marketConfig.data && (
        <dl className="mt-5 grid gap-2 rounded-xl bg-br-surface-1 p-4 text-xs">
          <Row label="Min listing capacity" value={`${formatCkb(marketConfig.data.min_listing_capacity_shannons)} CKB`} />
          <Row label="Min fill capacity" value={`${formatCkb(marketConfig.data.min_fill_capacity_shannons)} CKB`} />
          <Row label="Min lease duration" value={`${marketConfig.data.min_lease_epochs} epochs`} />
        </dl>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <Field
          label="Total capacity (CKB)"
          hint="The CKB you're committing. This becomes the listing cell's capacity."
          value={capacityCkb}
          onChange={setCapacityCkb}
          type="number"
          min="0"
        />
        <Field
          label="Duration (epochs)"
          hint="How long a lease against this listing lasts. 1 epoch ≈ 4 hours."
          value={durationEpochs}
          onChange={setDurationEpochs}
          type="number"
          min="1"
        />
        <Field
          label="Rate (shannons/byte/epoch)"
          hint="Price formula: usable_capacity_shannons × duration × rate. Higher = more rent per lease."
          value={rate}
          onChange={setRate}
          type="number"
          min="1"
        />
        <Field
          label="Min fill (CKB)"
          hint="Smallest lease allowed against this listing. Only matters if partial fill is on."
          value={minFillCkb}
          onChange={setMinFillCkb}
          type="number"
          min="0"
        />

        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={allowPartialFill}
            onChange={(e) => setAllowPartialFill(e.target.checked)}
            className="mt-1 h-4 w-4 accent-br-accent"
          />
          <div>
            <div className="text-sm text-br-fg">Allow partial fill</div>
            <div className="text-xs text-br-dim">
              If unchecked, a lease must consume the full listing in one go.
            </div>
          </div>
        </label>

        <button
          type="submit"
          disabled={!isConnected || busy}
          className="mt-4 w-full rounded bg-br-accent px-4 py-3 text-sm font-semibold text-br-accent-ink transition hover:bg-br-accent-hover disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {status.kind === 'building' && 'Building tx…'}
          {status.kind === 'waiting' && 'Waiting for signature…'}
          {status.kind === 'submitting' && 'Submitting…'}
          {(status.kind === 'idle' || status.kind === 'done' || status.kind === 'error') &&
            'Create listing'}
        </button>

        {status.kind === 'done' && (
          <div className="mt-4 rounded bg-br-surface-2 p-3 text-xs">
            <div className="text-br-success">Listing created ✓</div>
            <div className="mt-2 text-br-dim">
              listing_id:{' '}
              <span className="font-mono text-br-fg break-all">{status.listingId}</span>
            </div>
            <a
              href={`${TESTNET_TX_EXPLORER}/${status.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 block font-mono text-[11px] text-br-accent hover:underline break-all"
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
      </form>

      {pendingMobileSign && (
        <MobileSignConfirm
          preview={pendingMobileSign.preview}
          onConfirm={onMobileConfirm}
          onCancel={onMobileCancel}
        />
      )}
    </div>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
  type = 'text',
  min,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  min?: string;
}) {
  return (
    <label className="block">
      <div className="text-sm text-br-fg">{label}</div>
      {hint && <div className="text-xs text-br-dim mt-0.5">{hint}</div>}
      <input
        className="
          mt-2 w-full rounded bg-br-surface-2 border border-br-border
          px-3 py-2 text-sm text-br-fg
          focus:border-br-accent focus:outline-none
        "
        type={type}
        min={min}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-br-dim">{label}</dt>
      <dd className="font-mono text-br-fg">{value}</dd>
    </div>
  );
}

function parseBigintCkb(ckbText: string): bigint {
  const trimmed = ckbText.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error(`"${ckbText}" is not a valid CKB amount.`);
  }
  if (!trimmed.includes('.')) {
    return BigInt(trimmed) * SHANNONS_PER_CKB;
  }
  const [whole, frac] = trimmed.split('.');
  const fracPadded = (frac + '00000000').slice(0, 8);
  return BigInt(whole) * SHANNONS_PER_CKB + BigInt(fracPadded);
}

function formatCkb(shannons: bigint): string {
  const whole = shannons / SHANNONS_PER_CKB;
  const frac = shannons % SHANNONS_PER_CKB;
  if (frac === 0n) return whole.toLocaleString();
  const fracStr = frac.toString().padStart(8, '0').replace(/0+$/, '');
  return `${whole.toLocaleString()}.${fracStr}`;
}

function formatFee(shannons: bigint): string {
  if (shannons < 100_000_000n) return `${shannons.toString()} shannons`;
  return `${formatCkb(shannons)} CKB`;
}

interface ParsedMarketConfig {
  version: number;
  listing_type_code_hash: string;
  lease_type_code_hash: string;
  leased_cap_lock_code_hash: string;
  leased_cap_type_code_hash: string;
  min_listing_capacity_shannons: bigint;
  min_fill_capacity_shannons: bigint;
  min_lease_epochs: bigint;
  fee_rate_basis_points: number;
  fee_recipient_lock_hash: string;
}

async function fetchMarketConfig(): Promise<ParsedMarketConfig> {
  const client = getPublicRpcClient();
  const cell = await client.getCell(BYTERENT_TESTNET_MANIFEST.marketConfig.outPoint);
  if (!cell) throw new Error('Market Config cell not found on-chain.');
  const decoded = MarketConfigData.decode(cell.outputData);
  return {
    version: Number(decoded.version),
    listing_type_code_hash: decoded.listing_type_code_hash,
    lease_type_code_hash: decoded.lease_type_code_hash,
    leased_cap_lock_code_hash: decoded.leased_cap_lock_code_hash,
    leased_cap_type_code_hash: decoded.leased_cap_type_code_hash,
    min_listing_capacity_shannons: BigInt(decoded.min_listing_capacity_shannons),
    min_fill_capacity_shannons: BigInt(decoded.min_fill_capacity_shannons),
    min_lease_epochs: BigInt(decoded.min_lease_epochs),
    fee_rate_basis_points: Number(decoded.fee_rate_basis_points),
    fee_recipient_lock_hash: decoded.fee_recipient_lock_hash,
  };
}
