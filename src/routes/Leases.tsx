import { useQuery } from '@tanstack/react-query';
import { indexer } from '../api/client';
import { EmptyState } from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import { ReceiptIcon, LightningIcon } from '../components/icons';

export function Leases() {
  const leases = useQuery({
    queryKey: ['leases', { status: 'active' }],
    queryFn: () => indexer.listLeases({ status: 'active' }),
  });

  return (
    <div className="px-4 py-8 md:px-10 md:py-12">
      <header className="mb-10 max-w-prose">
        <div className="eyebrow">Leases</div>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">Active leases</h1>
        <p className="mt-2 text-sm text-br-muted">
          Every active lease across all tenants. Filter by your wallet once it's connected —
          wallet integration ships with the Plan 2 SDK.
        </p>
      </header>

      {leases.isLoading && <LeaseTableSkeleton />}

      {leases.error && (
        <EmptyState
          icon={<LightningIcon size={24} />}
          title="Couldn't load leases"
          description={(leases.error as Error).message}
          action={
            <button
              type="button"
              onClick={() => leases.refetch()}
              className="rounded border border-br-border px-4 py-2 text-sm font-medium hover:border-br-accent"
            >
              Retry
            </button>
          }
        />
      )}

      {leases.data && leases.data.leases.length === 0 && (
        <EmptyState
          icon={<ReceiptIcon size={24} />}
          title="No active leases yet"
          description="When a tenant calls FillLease on a listing, the lease will appear here. The FillLease transaction builder is still in Plan 2."
        />
      )}

      {leases.data && leases.data.leases.length > 0 && (
        <div className="overflow-x-auto rounded-lg bg-br-surface-1 shadow-sm">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.06em] text-br-dim">
                <th className="px-5 py-3 font-medium">Lease</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Capacity</th>
                <th className="px-5 py-3 font-medium text-right">End epoch</th>
                <th className="px-5 py-3 font-medium">Tenant</th>
              </tr>
            </thead>
            <tbody className="font-mono text-xs">
              {leases.data.leases.map((lease) => (
                <tr
                  key={lease.lease_id}
                  className="transition hover:bg-br-surface-2"
                >
                  <td className="truncate max-w-[220px] px-5 py-3.5 text-br-fg">
                    {lease.lease_id.slice(0, 26)}…
                  </td>
                  <td className="px-5 py-3.5">
                    <LeaseStatusPill status={lease.status} />
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-br-fg">
                    {(lease.usable_capacity_shannons / 1e8).toLocaleString()}{' '}
                    <span className="text-br-dim">CKB</span>
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-br-muted">
                    {lease.end_epoch.toLocaleString()}
                  </td>
                  <td className="truncate max-w-[220px] px-5 py-3.5 text-br-muted">
                    {lease.tenant_lock_hash.slice(0, 22)}…
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function LeaseTableSkeleton() {
  return (
    <div className="rounded-lg bg-br-surface-1 p-5">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-3">
          <Skeleton h="h-4" w="w-48" />
          <Skeleton h="h-4" w="w-16" />
          <Skeleton h="h-4" w="w-24" />
          <Skeleton h="h-4" w="w-20" />
        </div>
      ))}
    </div>
  );
}

function LeaseStatusPill({ status }: { status: string }) {
  const styles =
    status === 'Active'
      ? 'bg-br-accent-dim text-br-accent'
      : status === 'Expired'
      ? 'bg-br-surface-3 text-br-dim'
      : 'bg-br-surface-3 text-br-warning';
  return (
    <span
      className={`rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] ${styles}`}
    >
      {status}
    </span>
  );
}
