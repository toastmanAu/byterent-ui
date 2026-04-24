// Thin adapter that maps the existing UI layer (which thinks in DTOs
// returned by the old Rust HTTP indexer) onto the new WASM light-client
// query library. Keeps the DTO shapes stable so routes/components
// don't need to change; everything under the hood is now peer-verified
// and served from the user's own browser-embedded node.
//
// This file replaces the previous HTTP IndexerClient. The HTTP server
// (`byterent-indexer/src/bin/server.rs`) is retired in Phase D.

import type {
  CkbfsFileMetaDto,
  LeaseDto,
  LeaseFilterParams,
  LeasePageDto,
  ListingDto,
  ListingFilterParams,
  ListingPageDto,
} from './types';
import { getByteRentLightClient } from './light/client';
import {
  listActiveListings,
  getListing,
  type ListingSort,
  type ListingView,
} from './light/listings';
import {
  listLeases,
  getLease,
  leasesExpiringWithin,
  type LeaseSort,
  type LeaseView,
} from './light/leases';
import { resolveCkbfs, resolveCkbfsMeta } from './light/ckbfs';
import { getSyncStatus, type SyncStatus } from './light/syncStatus';
import type { Hex } from '@ckb-ccc/core';

// Hybrid backend model since the light-client-port investigation:
//   • Enumeration (listings / leases / ckbfs) → ccc.ClientPublicTestnet
//     (public CKB RPC). Light client can't do prefix-scan sync.
//   • Wallet-specific + concrete-cell queries → ByteRentLightClient
//     (trustless, peer-verified proofs).
//   • Transaction submit → ByteRentLightClient (peer-direct).
//
// Retires driveThree (self-hosted indexer) today; wallet reads stay
// trustless once we wire them in a later slice.

// ─── DTO converters ────────────────────────────────────────────────────────

function listingViewToDto(v: ListingView): ListingDto {
  const fill =
    v.capacityTotalShannons === 0n
      ? 0
      : Number(v.capacityTotalShannons - v.capacityAvailableShannons) /
        Number(v.capacityTotalShannons);
  return {
    listing_id: v.listingId,
    out_point_tx_hash: v.outPoint.txHash,
    out_point_index: v.outPoint.index,
    block_number: Number(v.blockNumber),
    tx_index: v.txIndex,
    cell_capacity_shannons: Number(v.cellCapacityShannons),
    status: v.statusLabel,
    owner_lock_hash: v.ownerLockHash,
    capacity_total_shannons: Number(v.capacityTotalShannons),
    capacity_available_shannons: Number(v.capacityAvailableShannons),
    duration_epochs: Number(v.durationEpochs),
    rate_shannons_per_byte_per_epoch: Number(v.rateShannonsPerBytePerEpoch),
    min_fill_shannons: Number(v.minFillShannons),
    allow_partial_fill: v.allowPartialFill,
    fill_fraction: fill,
  };
}

function leaseViewToDto(v: LeaseView): LeaseDto {
  return {
    lease_id: v.leaseId,
    listing_id: v.listingId,
    out_point_tx_hash: v.outPoint.txHash,
    out_point_index: v.outPoint.index,
    block_number: Number(v.blockNumber),
    tx_index: v.txIndex,
    cell_capacity_shannons: Number(v.cellCapacityShannons),
    status: v.statusLabel === 'active' ? 'Active' : v.statusLabel === 'expired' ? 'Expired' : v.statusLabel,
    tenant_lock_hash: v.tenantLockHash,
    owner_lock_hash: v.ownerLockHash,
    total_cell_capacity_shannons: Number(v.totalCellCapacityShannons),
    usable_capacity_shannons: Number(v.usableCapacityShannons),
    start_epoch: Number(v.startEpoch),
    end_epoch: Number(v.endEpoch),
    rate_shannons_per_byte_per_epoch: Number(v.rateShannonsPerBytePerEpoch),
    total_price_paid_shannons: Number(v.totalPricePaidShannons),
  };
}

function paramsToListingFilter(p: ListingFilterParams) {
  return {
    maxRateShannonsPerBytePerEpoch: p.max_rate !== undefined ? BigInt(p.max_rate) : undefined,
    minRateShannonsPerBytePerEpoch: p.min_rate !== undefined ? BigInt(p.min_rate) : undefined,
    minDurationEpochs: p.min_duration !== undefined ? BigInt(p.min_duration) : undefined,
    maxDurationEpochs: p.max_duration !== undefined ? BigInt(p.max_duration) : undefined,
    minCapacityAvailableShannons: p.min_capacity !== undefined ? BigInt(p.min_capacity) : undefined,
    maxCapacityAvailableShannons: p.max_capacity !== undefined ? BigInt(p.max_capacity) : undefined,
    onlyPartialFillAllowed: p.only_partial_fill,
    lessorLockHash: (p.lessor as Hex | undefined) ?? undefined,
    sortBy: p.sort as ListingSort | undefined,
    limit: p.limit,
    cursor: (p.cursor as Hex | undefined) ?? undefined,
  };
}

function paramsToLeaseFilter(p: LeaseFilterParams) {
  return {
    tenantLockHash: (p.tenant as Hex | undefined) ?? undefined,
    lessorLockHash: (p.lessor as Hex | undefined) ?? undefined,
    status: p.status,
    minEndEpoch: p.min_end_epoch !== undefined ? BigInt(p.min_end_epoch) : undefined,
    maxEndEpoch: p.max_end_epoch !== undefined ? BigInt(p.max_end_epoch) : undefined,
    sortBy: p.sort as LeaseSort | undefined,
    limit: p.limit,
    cursor: (p.cursor as Hex | undefined) ?? undefined,
  };
}

// ─── Public API ────────────────────────────────────────────────────────────

export class IndexerClient {
  // The light client is held as a reference but not touched on read
  // paths today — it's kept here so wallet-slice code can call
  // `indexer.lightClient.sendTransaction(...)` without re-threading the
  // singleton everywhere.
  readonly lightClient = getByteRentLightClient();

  async health(): Promise<SyncStatus> {
    return getSyncStatus();
  }

  async listListings(params: ListingFilterParams = {}): Promise<ListingPageDto> {
    const page = await listActiveListings(paramsToListingFilter(params));
    return {
      listings: page.listings.map(listingViewToDto),
      next_cursor: page.nextCursor,
      decode_failures: page.decodeFailures,
    };
  }

  async getListing(listingId: string): Promise<ListingDto> {
    const v = await getListing(listingId as Hex);
    if (!v) throw new Error(`listing ${listingId} not found`);
    return listingViewToDto(v);
  }

  async listLeases(params: LeaseFilterParams = {}): Promise<LeasePageDto> {
    const page = await listLeases(paramsToLeaseFilter(params));
    return {
      leases: page.leases.map(leaseViewToDto),
      next_cursor: page.nextCursor,
      decode_failures: page.decodeFailures,
    };
  }

  async getLease(leaseId: string): Promise<LeaseDto> {
    const v = await getLease(leaseId as Hex);
    if (!v) throw new Error(`lease ${leaseId} not found`);
    return leaseViewToDto(v);
  }

  async leasesExpiringWithin(epochs: number): Promise<LeasePageDto> {
    const page = await leasesExpiringWithin(BigInt(epochs));
    return {
      leases: page.leases.map(leaseViewToDto),
      next_cursor: page.nextCursor,
      decode_failures: page.decodeFailures,
    };
  }

  async getCkbfsMeta(typeId: string): Promise<CkbfsFileMetaDto> {
    const m = await resolveCkbfsMeta(typeId as Hex);
    return {
      type_id: m.typeId,
      filename: m.filename,
      content_type: m.contentType,
      checksum: m.checksum,
      byte_length: m.byteLength,
      protocol_version: m.protocolVersion,
    };
  }

  ckbfsContentUrl(typeId: string): string {
    // Pre-WASM-port this was a direct HTTP URL served by the Rust
    // indexer. With the public-RPC hybrid, content has to be
    // materialised by resolveCkbfs() and surfaced as a blob URL. Callers
    // that need a <img src="..."> should use getCkbfsContent() below to
    // make a Blob, then URL.createObjectURL(blob).
    return `ckbfs-virtual:${typeId}`;
  }

  async getCkbfsContent(typeId: string): Promise<Blob> {
    const file = await resolveCkbfs(typeId as Hex);
    return new Blob([new Uint8Array(file.bytes)], { type: file.contentType || 'application/octet-stream' });
  }
}

// Shared singleton for hooks that don't want to thread it explicitly.
export const indexer = new IndexerClient();
