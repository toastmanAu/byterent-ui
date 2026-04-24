// Client-side lease queries. 1:1 port of
// `byterent-indexer/src/leases.rs`, backed by the public CKB RPC (see
// src/api/light/rpc.ts for why enumeration can't use the WASM light
// client).

import { ccc } from '@ckb-ccc/core';
import type { Hex } from '@ckb-ccc/core';
import { BYTERENT_TESTNET_MANIFEST } from './manifest';
import { LeaseData, LeaseStatus } from './molecule';
import { getPublicRpcClient } from './rpc';

export const LEASE_SORTS = ['ending-soonest', 'newest', 'highest-value'] as const;
export type LeaseSort = (typeof LEASE_SORTS)[number];

export const LEASE_STATUS_LABELS = ['active', 'expired'] as const;
export type LeaseStatusLabel = (typeof LEASE_STATUS_LABELS)[number] | 'unknown';

export interface LeaseFilter {
  tenantLockHash?: Hex;
  lessorLockHash?: Hex;
  status?: LeaseStatusLabel;
  minEndEpoch?: bigint;
  maxEndEpoch?: bigint;
  sortBy?: LeaseSort;
  limit?: number;
  cursor?: Hex;
}

export interface LeaseView {
  /** Type script `args` (32 bytes). */
  leaseId: Hex;
  outPoint: { txHash: Hex; index: number };
  blockNumber: bigint;
  txIndex: number;
  cellCapacityShannons: bigint;
  listingId: Hex;
  ownerLockHash: Hex;
  tenantLockHash: Hex;
  totalCellCapacityShannons: bigint;
  usableCapacityShannons: bigint;
  startEpoch: bigint;
  endEpoch: bigint;
  rateShannonsPerBytePerEpoch: bigint;
  totalPricePaidShannons: bigint;
  status: number;
  statusLabel: LeaseStatusLabel;
}

export interface LeasePage {
  leases: LeaseView[];
  nextCursor: Hex;
  decodeFailures: number;
}

function leaseStatusLabel(n: number): LeaseStatusLabel {
  switch (n) {
    case LeaseStatus.Active:
      return 'active';
    case LeaseStatus.Expired:
      return 'expired';
    default:
      return 'unknown';
  }
}

function leaseTypeScript(args: Hex = '0x' as Hex) {
  return ccc.Script.from({
    codeHash: BYTERENT_TESTNET_MANIFEST.scripts.leaseType.codeHash,
    hashType: BYTERENT_TESTNET_MANIFEST.scripts.leaseType.hashType,
    args,
  });
}

function toLeaseView(cell: {
  cellOutput: { capacity: bigint; lock: { codeHash: Hex; hashType: string; args: Hex }; type?: { codeHash: Hex; hashType: string; args: Hex } | null };
  outputData: Hex;
  outPoint: { txHash: Hex; index: bigint };
  // See listings.ts for why these are optional — CCC's Cell strips them.
  blockNumber?: bigint;
  txIndex?: bigint;
}): LeaseView {
  const type = cell.cellOutput.type;
  if (!type) throw new Error('LeaseData cell missing type script');
  const leaseId = type.args;

  const raw = LeaseData.decode(cell.outputData);

  return {
    leaseId,
    outPoint: {
      txHash: cell.outPoint.txHash,
      index: Number(cell.outPoint.index),
    },
    blockNumber: cell.blockNumber ?? 0n,
    txIndex: Number(cell.txIndex ?? 0n),
    cellCapacityShannons: cell.cellOutput.capacity,
    listingId: raw.listing_id,
    ownerLockHash: raw.owner_lock_hash,
    tenantLockHash: raw.tenant_lock_hash,
    totalCellCapacityShannons: raw.total_cell_capacity_shannons,
    usableCapacityShannons: raw.usable_capacity_shannons,
    startEpoch: raw.start_epoch,
    endEpoch: raw.end_epoch,
    rateShannonsPerBytePerEpoch: raw.rate_shannons_per_byte_per_epoch,
    totalPricePaidShannons: raw.total_price_paid_shannons,
    status: raw.status,
    statusLabel: leaseStatusLabel(raw.status),
  };
}

function matchesFilter(v: LeaseView, f: LeaseFilter): boolean {
  if (f.tenantLockHash && v.tenantLockHash.toLowerCase() !== f.tenantLockHash.toLowerCase()) return false;
  if (f.lessorLockHash && v.ownerLockHash.toLowerCase() !== f.lessorLockHash.toLowerCase()) return false;
  if (f.status && v.statusLabel !== f.status) return false;
  if (f.minEndEpoch !== undefined && v.endEpoch < f.minEndEpoch) return false;
  if (f.maxEndEpoch !== undefined && v.endEpoch > f.maxEndEpoch) return false;
  return true;
}

function applySort(arr: LeaseView[], sort: LeaseSort): void {
  switch (sort) {
    case 'ending-soonest':
      arr.sort((a, b) => (a.endEpoch < b.endEpoch ? -1 : a.endEpoch > b.endEpoch ? 1 : 0));
      break;
    case 'newest':
      arr.sort((a, b) => (a.startEpoch > b.startEpoch ? -1 : a.startEpoch < b.startEpoch ? 1 : 0));
      break;
    case 'highest-value':
      arr.sort((a, b) =>
        a.totalPricePaidShannons > b.totalPricePaidShannons ? -1 : a.totalPricePaidShannons < b.totalPricePaidShannons ? 1 : 0,
      );
      break;
  }
}

export async function listLeases(filter: LeaseFilter = {}): Promise<LeasePage> {
  const client = getPublicRpcClient();
  const limit = Math.min(filter.limit ?? 100, 1000);
  const order: 'asc' | 'desc' = filter.sortBy === 'newest' ? 'desc' : 'asc';

  const res = await client.findCellsPaged(
    {
      script: leaseTypeScript('0x' as Hex),
      scriptType: 'type',
      scriptSearchMode: 'prefix',
      filter: null,
      withData: true,
    },
    order,
    limit,
    filter.cursor,
  );

  let decodeFailures = 0;
  const leases: LeaseView[] = [];
  for (const cell of res.cells) {
    try {
      leases.push(toLeaseView(cell as unknown as Parameters<typeof toLeaseView>[0]));
    } catch {
      decodeFailures++;
    }
  }

  const filtered = leases.filter((v) => matchesFilter(v, filter));
  if (filter.sortBy) applySort(filtered, filter.sortBy);
  const truncated = filter.limit ? filtered.slice(0, filter.limit) : filtered;

  return {
    leases: truncated,
    nextCursor: (res.lastCursor ?? '0x') as Hex,
    decodeFailures,
  };
}

export async function getLease(leaseId: Hex): Promise<LeaseView | null> {
  const client = getPublicRpcClient();
  const res = await client.findCellsPaged(
    {
      script: leaseTypeScript(leaseId),
      scriptType: 'type',
      scriptSearchMode: 'exact',
      filter: null,
      withData: true,
    },
    'asc',
    1,
  );
  if (res.cells.length === 0) return null;
  try {
    return toLeaseView(res.cells[0] as unknown as Parameters<typeof toLeaseView>[0]);
  } catch {
    return null;
  }
}

/**
 * Active leases whose end_epoch is within `withinEpochs` of the current
 * tip epoch. Replaces `GET /leases/expiring/:n`.
 */
export async function leasesExpiringWithin(withinEpochs: bigint): Promise<LeasePage> {
  const client = getPublicRpcClient();
  const tip = await client.getTipHeader();
  // ClientBlockHeader.epoch encodes epoch number in the lower 24 bits of
  // the bigint — for simplicity treat it as a bigint index (good enough
  // for filter purposes, not for precise epoch math).
  const currentEpoch = BigInt((tip.epoch as unknown as { number: bigint }).number ?? 0n);
  return listLeases({
    status: 'active',
    maxEndEpoch: currentEpoch + withinEpochs,
    sortBy: 'ending-soonest',
  });
}
