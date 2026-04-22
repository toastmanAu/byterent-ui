import { useQuery } from '@tanstack/react-query';
import { indexer } from '../api/client';

export function Leases() {
  const leases = useQuery({
    queryKey: ['leases', { status: 'active' }],
    queryFn: () => indexer.listLeases({ status: 'active' }),
  });

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Leases</h1>
        <p className="text-byterent-muted mt-1">
          Active leases across all tenants. Wallet filter lands with Plan 2 SDK.
        </p>
      </header>

      {leases.isLoading && <div className="text-byterent-muted">Loading…</div>}
      {leases.error && (
        <div className="text-red-400">Error: {(leases.error as Error).message}</div>
      )}

      {leases.data && leases.data.leases.length === 0 && (
        <div className="text-byterent-muted">
          No active leases on testnet yet — FillLease isn't implemented.
        </div>
      )}

      {leases.data && leases.data.leases.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-byterent-border">
          <table className="min-w-full text-sm">
            <thead className="bg-byterent-elevated">
              <tr className="text-left text-byterent-muted">
                <th className="px-4 py-3 font-medium">Lease</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Capacity</th>
                <th className="px-4 py-3 font-medium">End epoch</th>
                <th className="px-4 py-3 font-medium">Tenant</th>
              </tr>
            </thead>
            <tbody>
              {leases.data.leases.map((lease) => (
                <tr key={lease.lease_id} className="border-t border-byterent-border">
                  <td className="px-4 py-3 font-mono text-xs truncate max-w-[180px]">
                    {lease.lease_id.slice(0, 20)}…
                  </td>
                  <td className="px-4 py-3">{lease.status}</td>
                  <td className="px-4 py-3">
                    {(lease.usable_capacity_shannons / 1e8).toLocaleString()} CKB
                  </td>
                  <td className="px-4 py-3">{lease.end_epoch}</td>
                  <td className="px-4 py-3 font-mono text-xs truncate max-w-[180px]">
                    {lease.tenant_lock_hash.slice(0, 20)}…
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
