import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { indexer } from '../api/client';
import { ListingCardSkeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { DatabaseIcon, LightningIcon } from '../components/icons';
import type { ListingDto } from '../api/types';

export function Browse() {
  const listings = useQuery({
    queryKey: ['listings', { sort: 'cheapest', limit: 60 }],
    queryFn: () => indexer.listListings({ sort: 'cheapest', limit: 60 }),
  });

  return (
    <div className="px-6 py-10 md:px-10 md:py-12">
      <header className="mb-10 max-w-prose">
        <div className="eyebrow">Active listings</div>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">Rent CKB capacity</h1>
        <p className="mt-2 text-sm text-br-muted">
          On-chain storage you can lease from lessors. Cheapest first; click a card for full
          terms and pricing.
        </p>
      </header>

      {listings.isLoading && <ListingGridSkeleton />}

      {listings.error && (
        <EmptyState
          icon={<LightningIcon size={24} />}
          title="Couldn't reach the indexer"
          description={(listings.error as Error).message}
          action={
            <button
              type="button"
              onClick={() => listings.refetch()}
              className="rounded border border-br-border px-4 py-2 text-sm font-medium text-br-fg hover:border-br-accent"
            >
              Retry
            </button>
          }
        />
      )}

      {listings.data && listings.data.listings.length === 0 && (
        <EmptyState
          icon={<DatabaseIcon size={24} />}
          title="No active listings on testnet"
          description="When a lessor publishes a listing, it'll appear here. Nothing to rent yet."
        />
      )}

      {listings.data && listings.data.listings.length > 0 && (
        <>
          {listings.data.decode_failures > 0 && (
            <div className="mb-6 rounded border border-br-warning/30 bg-br-warning/5 px-4 py-3 text-sm text-br-warning">
              {listings.data.decode_failures} cell(s) failed to decode — skipped.
            </div>
          )}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
            {listings.data.listings.map((l) => (
              <ListingCard key={l.listing_id} listing={l} />
            ))}
          </div>
          <div className="mt-10 text-xs text-br-dim">
            Showing {listings.data.listings.length}{' '}
            {listings.data.listings.length === 1 ? 'listing' : 'listings'}.
          </div>
        </>
      )}
    </div>
  );
}

function ListingGridSkeleton() {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <ListingCardSkeleton key={i} />
      ))}
    </div>
  );
}

function ListingCard({ listing }: { listing: ListingDto }) {
  const capacityCkb = Math.round(listing.capacity_available_shannons / 1e8).toLocaleString();
  const filled = Math.round(listing.fill_fraction * 100);

  return (
    <Link
      to={`/listings/${listing.listing_id}`}
      className="group relative flex flex-col rounded-lg bg-br-surface-1 p-5 transition hover:bg-br-surface-2 hover:shadow-md focus-visible:shadow-accent-glow"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="eyebrow">Listing</span>
        <StatusPill status={listing.status} />
      </div>

      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="text-xl font-semibold text-br-fg tabular-nums">{capacityCkb}</span>
        <span className="text-sm text-br-dim">CKB</span>
      </div>
      <div className="mt-1 text-xs text-br-muted">
        available · {filled}% filled
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <Meta label={`${listing.duration_epochs} epoch${listing.duration_epochs === 1 ? '' : 's'}`} />
        <Dot />
        <Meta label={`rate ${listing.rate_shannons_per_byte_per_epoch}`} mono />
        {listing.allow_partial_fill && (
          <>
            <Dot />
            <Meta label="partial-fill" accent />
          </>
        )}
      </div>

      <div
        aria-hidden
        className="mt-5 h-1 w-full overflow-hidden rounded-full bg-br-surface-3"
      >
        <div
          className="h-full bg-br-accent transition-all"
          style={{ width: `${filled}%` }}
        />
      </div>

      <div className="mt-4 truncate font-mono text-[11px] text-br-faint">
        {listing.listing_id.slice(0, 26)}…
      </div>
    </Link>
  );
}

function Meta({ label, mono, accent }: { label: string; mono?: boolean; accent?: boolean }) {
  return (
    <span
      className={[
        mono ? 'font-mono text-br-muted' : 'text-br-muted',
        accent ? 'text-br-accent' : '',
      ].join(' ')}
    >
      {label}
    </span>
  );
}

function Dot() {
  return <span className="text-br-faint" aria-hidden>·</span>;
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
