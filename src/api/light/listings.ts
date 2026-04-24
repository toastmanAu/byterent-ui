// Client-side listings queries. 1:1 port of
// `byterent-indexer/src/listings.rs`, but backed by the public CKB RPC
// (via ccc.ClientPublicTestnet) rather than our own HTTP server.
//
// Why not the WASM light client? The light client only knows about
// cells matching concretely-registered scripts — it can't do
// prefix-scan enumeration across an unbounded set of listing_ids. See
// src/api/light/rpc.ts for the trade-off.
//
// Molecule decode + filter + sort still run entirely in the browser.

import { ccc } from '@ckb-ccc/core';
import type { Hex } from '@ckb-ccc/core';
import { BYTERENT_TESTNET_MANIFEST } from './manifest';
import { ListingData, ListingStatus } from './molecule';
import { getPublicRpcClient } from './rpc';

export const LISTING_SORTS = [
  'cheapest',
  'newest',
  'largest',
  'shortest',
] as const;
export type ListingSort = (typeof LISTING_SORTS)[number];

export interface ListingFilter {
  maxRateShannonsPerBytePerEpoch?: bigint;
  minRateShannonsPerBytePerEpoch?: bigint;
  minDurationEpochs?: bigint;
  maxDurationEpochs?: bigint;
  minCapacityAvailableShannons?: bigint;
  maxCapacityAvailableShannons?: bigint;
  onlyPartialFillAllowed?: boolean;
  lessorLockHash?: Hex;
  sortBy?: ListingSort;
  /**
   * Upper bound on returned results. Also acts as the light-client's page
   * size — actual results may be fewer after post-query filtering. Default 100.
   */
  limit?: number;
  cursor?: Hex;
}

export interface ListingView {
  /** Type script `args` (32 bytes) — the listing's stable identity. */
  listingId: Hex;
  outPoint: { txHash: Hex; index: number };
  blockNumber: bigint;
  txIndex: number;
  cellCapacityShannons: bigint;
  ownerLockHash: Hex;
  capacityTotalShannons: bigint;
  capacityAvailableShannons: bigint;
  durationEpochs: bigint;
  rateShannonsPerBytePerEpoch: bigint;
  minFillShannons: bigint;
  allowPartialFill: boolean;
  status: number;
  statusLabel: 'Open' | 'Closed' | 'Cancelled' | 'Unknown';
}

export interface ListingPage {
  listings: ListingView[];
  nextCursor: Hex;
  decodeFailures: number;
}

function listingStatusLabel(n: number): ListingView['statusLabel'] {
  switch (n) {
    case ListingStatus.Open:
      return 'Open';
    case ListingStatus.Closed:
      return 'Closed';
    case ListingStatus.Cancelled:
      return 'Cancelled';
    default:
      return 'Unknown';
  }
}

function listingTypeScript(args: Hex = '0x' as Hex) {
  return ccc.Script.from({
    codeHash: BYTERENT_TESTNET_MANIFEST.scripts.listingType.codeHash,
    hashType: BYTERENT_TESTNET_MANIFEST.scripts.listingType.hashType,
    args,
  });
}

function toListingView(cell: {
  cellOutput: { capacity: bigint; lock: { codeHash: Hex; hashType: string; args: Hex }; type?: { codeHash: Hex; hashType: string; args: Hex } | null };
  outputData: Hex;
  outPoint: { txHash: Hex; index: bigint };
  // CCC's Cell class strips block_number/tx_index from the raw indexer
  // response. We accept them as optional and default to 0n/0 — they're
  // debug info, not used for filtering/sorting critical paths (the
  // public RPC's `order` parameter already sorts by block+txIndex server-side).
  blockNumber?: bigint;
  txIndex?: bigint;
}): ListingView {
  const type = cell.cellOutput.type;
  if (!type) {
    throw new Error('ListingData cell missing type script');
  }
  // listing_id == type_script.args (32 bytes)
  const listingId = type.args;

  // Decode ListingData from output data.
  const raw = ListingData.decode(cell.outputData);

  return {
    listingId,
    outPoint: {
      txHash: cell.outPoint.txHash,
      index: Number(cell.outPoint.index),
    },
    blockNumber: cell.blockNumber ?? 0n,
    txIndex: Number(cell.txIndex ?? 0n),
    cellCapacityShannons: cell.cellOutput.capacity,
    ownerLockHash: raw.owner_lock_hash,
    capacityTotalShannons: raw.capacity_total_shannons,
    capacityAvailableShannons: raw.capacity_available_shannons,
    durationEpochs: raw.duration_epochs,
    rateShannonsPerBytePerEpoch: raw.rate_shannons_per_byte_per_epoch,
    minFillShannons: raw.min_fill_shannons,
    allowPartialFill: raw.allow_partial_fill !== 0,
    status: raw.status,
    statusLabel: listingStatusLabel(raw.status),
  };
}

function matchesFilter(v: ListingView, f: ListingFilter): boolean {
  if (v.statusLabel !== 'Open') return false;
  if (f.maxRateShannonsPerBytePerEpoch !== undefined && v.rateShannonsPerBytePerEpoch > f.maxRateShannonsPerBytePerEpoch) return false;
  if (f.minRateShannonsPerBytePerEpoch !== undefined && v.rateShannonsPerBytePerEpoch < f.minRateShannonsPerBytePerEpoch) return false;
  if (f.minDurationEpochs !== undefined && v.durationEpochs < f.minDurationEpochs) return false;
  if (f.maxDurationEpochs !== undefined && v.durationEpochs > f.maxDurationEpochs) return false;
  if (f.minCapacityAvailableShannons !== undefined && v.capacityAvailableShannons < f.minCapacityAvailableShannons) return false;
  if (f.maxCapacityAvailableShannons !== undefined && v.capacityAvailableShannons > f.maxCapacityAvailableShannons) return false;
  if (f.onlyPartialFillAllowed && !v.allowPartialFill) return false;
  if (f.lessorLockHash && v.ownerLockHash.toLowerCase() !== f.lessorLockHash.toLowerCase()) return false;
  return true;
}

function applySort(arr: ListingView[], sort: ListingSort): void {
  switch (sort) {
    case 'cheapest':
      arr.sort((a, b) =>
        a.rateShannonsPerBytePerEpoch < b.rateShannonsPerBytePerEpoch ? -1 : a.rateShannonsPerBytePerEpoch > b.rateShannonsPerBytePerEpoch ? 1 : 0,
      );
      break;
    case 'newest':
      arr.sort((a, b) => {
        if (a.blockNumber !== b.blockNumber) return a.blockNumber > b.blockNumber ? -1 : 1;
        return b.txIndex - a.txIndex;
      });
      break;
    case 'largest':
      arr.sort((a, b) =>
        a.capacityAvailableShannons > b.capacityAvailableShannons ? -1 : a.capacityAvailableShannons < b.capacityAvailableShannons ? 1 : 0,
      );
      break;
    case 'shortest':
      arr.sort((a, b) => (a.durationEpochs < b.durationEpochs ? -1 : a.durationEpochs > b.durationEpochs ? 1 : 0));
      break;
  }
}

/**
 * Paginated query for active (status=Open) listings. Mirrors the Rust
 * indexer's `list_active_listings`. Filters/sorts run client-side after
 * the public-RPC indexer returns the page of matching-type-script cells.
 */
export async function listActiveListings(
  filter: ListingFilter = {},
): Promise<ListingPage> {
  const client = getPublicRpcClient();
  const limit = Math.min(filter.limit ?? 100, 1000);
  const order: 'asc' | 'desc' = filter.sortBy === 'newest' ? 'desc' : 'asc';

  const res = await client.findCellsPaged(
    {
      script: listingTypeScript('0x' as Hex),
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
  const listings: ListingView[] = [];
  for (const cell of res.cells) {
    try {
      listings.push(toListingView(cell as unknown as Parameters<typeof toListingView>[0]));
    } catch {
      decodeFailures++;
    }
  }

  const filtered = listings.filter((v) => matchesFilter(v, filter));
  if (filter.sortBy) applySort(filtered, filter.sortBy);
  const truncated = filter.limit ? filtered.slice(0, filter.limit) : filtered;

  return {
    listings: truncated,
    nextCursor: (res.lastCursor ?? '0x') as Hex,
    decodeFailures,
  };
}

/** Fetch a single listing by its listing_id (type_script args). */
export async function getListing(listingId: Hex): Promise<ListingView | null> {
  const client = getPublicRpcClient();
  const res = await client.findCellsPaged(
    {
      script: listingTypeScript(listingId),
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
    return toListingView(res.cells[0] as unknown as Parameters<typeof toListingView>[0]);
  } catch {
    return null;
  }
}
