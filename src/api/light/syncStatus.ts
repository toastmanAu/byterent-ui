// Sync / health status for the sidebar indicator. Since the hybrid
// rewire, the primary read backend is the public CKB RPC — this is
// where "tip block" comes from, so the indicator reflects the data
// users are actually seeing.
//
// The light client (src/api/light/client.ts) is kept warm for future
// wallet-specific queries (user's own lock hash, tx submit). Its peer
// count + sync progress are shown in the Settings page for diagnostics
// but don't drive the main health indicator — it'd be confusing when
// the light client shows "connecting" while the dApp is fully usable.

import { getPublicRpcClient } from './rpc';
import { getByteRentLightClient } from './client';

export interface SyncStatus {
  // Tip comes from the public RPC — that's the source of truth for what
  // the dApp renders.
  tipBlock: number;
  /** True if the public RPC gave us a tip this tick. */
  rpcReachable: boolean;

  // Light-client sub-state. All zeros when it's idle (no active queries
  // registered) — that's expected, not an error.
  lightClientStarted: boolean;
  lightClientConnections: number;
  lightClientSyncedBlock: number;
  lightClientScriptsRegistered: number;

  // Kept for API compat with the old Rust-indexer HealthDto consumers.
  // The sidebar indicator derives "synced/syncing/offline" from rpcReachable.
  connections: number;
  syncedBlock: number;
  startBlock: number;
  syncedPercent: number;
  scriptsRegistered: number;
  nodeId: string;
}

export async function getSyncStatus(): Promise<SyncStatus> {
  const rpc = getPublicRpcClient();
  const light = getByteRentLightClient();

  let tipBlock = 0;
  let rpcReachable = false;
  try {
    tipBlock = Number(await rpc.getTip());
    rpcReachable = true;
  } catch {
    rpcReachable = false;
  }

  let lcStarted = false;
  let lcConnections = 0;
  let lcSyncedBlock = 0;
  let lcScripts = 0;
  let lcNodeId = 'idle';
  if (light.isStarted()) {
    lcStarted = true;
    try {
      const [localNode, scripts] = await Promise.all([
        light.localNodeInfo(),
        light.getScripts(),
      ]);
      lcConnections = Number(localNode.connections);
      lcNodeId = localNode.nodeId;
      lcScripts = scripts.length;
      if (scripts.length > 0) {
        lcSyncedBlock = scripts.reduce(
          (acc, s) => Math.min(acc, Number(s.blockNumber)),
          Number.MAX_SAFE_INTEGER,
        );
        if (lcSyncedBlock === Number.MAX_SAFE_INTEGER) lcSyncedBlock = 0;
      }
    } catch {
      // Swallow — if the light client errors while idle it's not a user-facing issue.
    }
  }

  // "syncedPercent" here is the light-client view; since it's not driving
  // the main indicator, we compute it for the Settings page only.
  const startBlock = 0;
  const syncedPercent =
    tipBlock > startBlock && lcSyncedBlock > startBlock
      ? ((lcSyncedBlock - startBlock) / (tipBlock - startBlock)) * 100
      : 0;

  return {
    tipBlock,
    rpcReachable,
    lightClientStarted: lcStarted,
    lightClientConnections: lcConnections,
    lightClientSyncedBlock: lcSyncedBlock,
    lightClientScriptsRegistered: lcScripts,
    nodeId: lcNodeId,
    connections: lcConnections,
    syncedBlock: lcSyncedBlock,
    startBlock,
    syncedPercent: Math.max(0, Math.min(100, syncedPercent)),
    scriptsRegistered: lcScripts,
  };
}
