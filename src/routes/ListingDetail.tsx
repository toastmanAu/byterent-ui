import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { indexer } from '../api/client';
import { ArrowLeftIcon, LightningIcon } from '../components/icons';
import { EmptyState } from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';

export function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const listing = useQuery({
    queryKey: ['listing', id],
    queryFn: () => indexer.getListing(id!),
    enabled: !!id,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-10 md:py-12">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-br-muted hover:text-br-fg transition"
      >
        <ArrowLeftIcon />
        back to browse
      </Link>

      {listing.isLoading && <ListingDetailSkeleton />}

      {listing.error && (
        <div className="mt-10">
          <EmptyState
            icon={<LightningIcon size={24} />}
            title="Listing not found"
            description={(listing.error as Error).message}
          />
        </div>
      )}

      {listing.data && (
        <>
          <header className="mt-8">
            <div className="eyebrow">Listing</div>
            <h1 className="mt-2 text-xl font-semibold tracking-tight">Storage capacity offer</h1>
          </header>

          <div className="mt-8 grid gap-8 md:grid-cols-[var(--hero-w)_1fr]" style={{ '--hero-w': '360px' } as React.CSSProperties}>
            <HeroCard
              capacityTotal={listing.data.capacity_total_shannons}
              capacityAvailable={listing.data.capacity_available_shannons}
              fillFraction={listing.data.fill_fraction}
              status={listing.data.status}
            />

            <div className="flex flex-col gap-6">
              <section>
                <h2 className="eyebrow">Terms</h2>
                <div className="mt-4 kv-grid text-sm">
                  <Term
                    k="Duration"
                    v={`${listing.data.duration_epochs} epoch${
                      listing.data.duration_epochs === 1 ? '' : 's'
                    }`}
                  />
                  <Term
                    k="Rate"
                    v={`${listing.data.rate_shannons_per_byte_per_epoch} shannons/byte/epoch`}
                    mono
                  />
                  <Term
                    k="Min fill"
                    v={`${(listing.data.min_fill_shannons / 1e8).toLocaleString()} CKB`}
                  />
                  <Term
                    k="Partial fills"
                    v={listing.data.allow_partial_fill ? 'allowed' : 'whole-only'}
                    accent={listing.data.allow_partial_fill}
                  />
                </div>
              </section>

              <section>
                <h2 className="eyebrow">Identity</h2>
                <div className="mt-4 kv-grid text-sm">
                  <Term k="Listing ID" v={listing.data.listing_id} mono wrap />
                  <Term k="Lessor" v={listing.data.owner_lock_hash} mono wrap />
                  <Term
                    k="On chain"
                    v={`block ${listing.data.block_number.toLocaleString()} · tx_index ${
                      listing.data.tx_index
                    }`}
                  />
                  <Term k="Publish tx" v={listing.data.out_point_tx_hash} mono wrap />
                </div>
              </section>

              <button
                type="button"
                disabled
                className="mt-2 self-start rounded bg-br-accent px-5 py-2.5 text-sm font-medium text-br-accent-ink shadow-accent-glow disabled:opacity-40 disabled:cursor-not-allowed"
                title="FillLease transaction builder ships with Plan 2 SDK"
              >
                Rent this capacity
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function HeroCard({
  capacityTotal,
  capacityAvailable,
  fillFraction,
  status,
}: {
  capacityTotal: number;
  capacityAvailable: number;
  fillFraction: number;
  status: string;
}) {
  const availableCkb = Math.round(capacityAvailable / 1e8).toLocaleString();
  const totalCkb = Math.round(capacityTotal / 1e8).toLocaleString();
  const filled = Math.round(fillFraction * 100);

  return (
    <div className="rounded-xl bg-br-surface-1 p-7 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <span className="eyebrow">Available</span>
        <StatusPill status={status} />
      </div>

      <div className="mt-5 flex items-baseline gap-2">
        <span className="text-xl font-semibold tabular-nums text-br-fg">{availableCkb}</span>
        <span className="text-base text-br-muted">CKB</span>
      </div>
      <div className="mt-1 text-sm text-br-muted">of {totalCkb} total</div>

      <div className="mt-7">
        <div
          aria-hidden
          className="h-1.5 w-full overflow-hidden rounded-full bg-br-surface-3"
        >
          <div
            className="h-full bg-br-accent transition-all"
            style={{ width: `${filled}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-br-dim">{filled}% filled</span>
          <span className="text-br-muted">
            {(capacityAvailable / 1e8).toLocaleString()} CKB available
          </span>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles =
    status === 'Open'
      ? 'bg-br-accent-dim text-br-accent'
      : status === 'Closed'
      ? 'bg-br-surface-3 text-br-muted'
      : 'bg-br-surface-3 text-br-warning';
  return (
    <span
      className={`rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] ${styles}`}
    >
      {status}
    </span>
  );
}

function Term({
  k,
  v,
  mono,
  accent,
  wrap,
}: {
  k: string;
  v: string;
  mono?: boolean;
  accent?: boolean;
  wrap?: boolean;
}) {
  return (
    <>
      <dt className="text-xs uppercase tracking-[0.06em] text-br-dim">{k}</dt>
      <dd
        className={[
          mono ? 'font-mono text-xs leading-relaxed' : 'text-sm',
          accent ? 'text-br-accent' : 'text-br-fg',
          wrap ? 'break-all' : '',
        ].join(' ')}
      >
        {v}
      </dd>
    </>
  );
}

function ListingDetailSkeleton() {
  return (
    <div className="mt-8">
      <Skeleton h="h-3" w="w-20" />
      <Skeleton className="mt-2" h="h-6" w="w-64" />
      <div className="mt-8 grid gap-8 md:grid-cols-[360px_1fr]">
        <div className="rounded-xl bg-br-surface-1 p-7">
          <Skeleton h="h-3" w="w-20" />
          <Skeleton className="mt-5" h="h-8" w="w-32" />
          <Skeleton className="mt-3" h="h-3" w="w-24" />
          <Skeleton className="mt-7" h="h-1.5" w="w-full" />
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton h="h-4" w="w-40" />
          <Skeleton h="h-4" w="w-56" />
          <Skeleton h="h-4" w="w-48" />
          <Skeleton h="h-4" w="w-60" />
        </div>
      </div>
    </div>
  );
}
