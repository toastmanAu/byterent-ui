import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { indexer } from '../api/client';

export function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const listing = useQuery({
    queryKey: ['listing', id],
    queryFn: () => indexer.getListing(id!),
    enabled: !!id,
  });

  if (!id) return <div className="p-8">No listing id.</div>;
  if (listing.isLoading) return <div className="p-8 text-byterent-muted">Loading…</div>;
  if (listing.error)
    return (
      <div className="p-8 text-red-400">Error: {(listing.error as Error).message}</div>
    );
  if (!listing.data) return null;

  const l = listing.data;
  const ckb = (shannons: number) => (shannons / 1e8).toLocaleString();

  // Item 3 of the Spotify DNA: hero-left-column detail layout. Placeholder
  // proportions — Chunk 3's ui-design pass will refine the visual hierarchy.
  return (
    <div className="p-8 max-w-6xl">
      <Link to="/" className="text-sm text-byterent-muted hover:text-white">
        ← back
      </Link>
      <div className="mt-6 grid md:grid-cols-[320px_1fr] gap-8">
        <div className="rounded-xl bg-byterent-elevated border border-byterent-border p-6">
          <div className="text-xs text-byterent-muted uppercase tracking-wide">Listing</div>
          <div className="mt-2 text-4xl font-semibold">
            {ckb(l.capacity_available_shannons)}{' '}
            <span className="text-lg text-byterent-muted">CKB</span>
          </div>
          <div className="mt-1 text-sm text-byterent-muted">
            of {ckb(l.capacity_total_shannons)} total
          </div>
          <div className="mt-6 h-2 rounded-full bg-byterent-surface overflow-hidden">
            <div
              className="h-full bg-byterent-accent"
              style={{ width: `${Math.round(l.fill_fraction * 100)}%` }}
            />
          </div>
          <div className="mt-1 text-xs text-byterent-muted">
            {Math.round(l.fill_fraction * 100)}% filled
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <KV k="Status" v={l.status} />
          <KV k="Duration" v={`${l.duration_epochs} epoch${l.duration_epochs === 1 ? '' : 's'}`} />
          <KV
            k="Rate"
            v={`${l.rate_shannons_per_byte_per_epoch} shannons / byte / epoch`}
          />
          <KV k="Min fill" v={`${ckb(l.min_fill_shannons)} CKB`} />
          <KV k="Partial fills" v={l.allow_partial_fill ? 'allowed' : 'whole-only'} />
          <KV k="Lessor" v={l.owner_lock_hash} mono />
          <KV k="Listing ID" v={l.listing_id} mono />
          <KV k="On chain" v={`block ${l.block_number}, tx_index ${l.tx_index}`} />
        </div>
      </div>
    </div>
  );
}

function KV({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-4">
      <div className="text-byterent-muted text-sm">{k}</div>
      <div
        className={`text-sm ${mono ? 'font-mono text-xs break-all' : ''}`}
        style={{ wordBreak: mono ? 'break-all' : undefined }}
      >
        {v}
      </div>
    </div>
  );
}
