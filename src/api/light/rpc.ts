// Public CKB testnet RPC client. We use this for prefix-scan queries
// (listings, leases, CKBFS enumeration) — the WASM light client can only
// sync cells matching concrete scripts, so enumeration-by-code_hash
// needs a real full-node indexer.
//
// Trust model: we trust the public node not to omit results. CKB's
// public testnet endpoint (testnet.ckbapp.dev) is community-run;
// swapping providers or deploying our own is a DNS change.
//
// Meanwhile, the WASM light client (src/api/light/client.ts) stays the
// primary client for:
//   • User-specific queries (their own listings by lock hash, balance)
//   • Concrete-cell reads (market config cell, specific CKBFS cells by type_id)
//   • Transaction submission (peer-direct via lightClient.sendTransaction)

import { ccc } from '@ckb-ccc/core';

let instance: ccc.Client | undefined;

/**
 * Singleton CCC client pointing at the public CKB testnet RPC.
 * Constructed lazily — nothing connects until the first query.
 */
export function getPublicRpcClient(): ccc.Client {
  if (!instance) {
    instance = new ccc.ClientPublicTestnet();
  }
  return instance;
}
