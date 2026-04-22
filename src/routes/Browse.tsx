import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { indexer } from '../api/client';
import type { ListingDto } from '../api/types';

export function Browse() {
  const listings = useQuery({
    queryKey: ['listings', { sort: 'cheapest', limit: 60 }],
    queryFn: () => indexer.listListings({ sort: 'cheapest', limit: 60 }),
  });

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Browse listings</h1>
        <p className="text-byterent-muted mt-1">
          Rent CKB capacity from lessors. Cheapest first.
        </p>
      </header>

      {listings.isLoading && <div className="text-byterent-muted">Loading…</div>}
      {listings.error && (
        <div className="text-red-400">Error: {(listings.error as Error).message}</div>
      )}

      {listings.data && listings.data.listings.length === 0 && (
        <div className="text-byterent-muted">
          No active listings yet. Deploy a lessor to create one.
        </div>
      )}

      {listings.data && listings.data.listings.length > 0 && (
        <>
          {listings.data.decode_failures > 0 && (
            <div className="mb-4 text-amber-400 text-sm">
              {listings.data.decode_failures} cell(s) failed to decode — skipped.
            </div>
          )}
          {/* Item 2 of the Spotify DNA: card grid. Placeholder cards for
              Chunk 3's ui-design polish. */}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
            {listings.data.listings.map((l) => (
              <ListingCard key={l.listing_id} listing={l} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ListingCard({ listing }: { listing: ListingDto }) {
  const capacityCkb = Math.round(listing.capacity_available_shannons / 1e8).toLocaleString();
  return (
    <Link
      to={`/listings/${listing.listing_id}`}
      className="block rounded-xl bg-byterent-elevated border border-byterent-border p-4 hover:border-byterent-accent transition"
    >
      <div className="text-xs text-byterent-muted font-mono truncate">
        {listing.listing_id.slice(0, 22)}…
      </div>
      <div className="mt-3 text-2xl font-semibold">
        {capacityCkb} <span className="text-sm text-byterent-muted">CKB</span>
      </div>
      <div className="mt-1 text-sm text-byterent-muted">
        {listing.duration_epochs} epoch{listing.duration_epochs === 1 ? '' : 's'} · rate{' '}
        {listing.rate_shannons_per_byte_per_epoch}
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs">
        {listing.allow_partial_fill ? (
          <span className="rounded bg-byterent-surface px-2 py-0.5 text-byterent-accent">
            partial-fill
          </span>
        ) : (
          <span className="rounded bg-byterent-surface px-2 py-0.5 text-byterent-muted">
            whole-only
          </span>
        )}
        <span className="text-byterent-muted">{listing.status}</span>
      </div>
    </Link>
  );
}
