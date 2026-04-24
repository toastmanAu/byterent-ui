// TS Molecule decoders for byterent's cell data schemas. Source of
// truth lives in `schemas/byterent.mol` (Rust `byterent-types` crate).
// These are hand-ported 1:1 — small enough to be auditable against the
// .mol file without running a generator.
//
// Encoding refresher for `table`:
//   bytes 0..4        total size (u32 LE)
//   bytes 4..8        header size = 4 + 4*N (u32 LE)
//   bytes 8..(8+4N)   offsets to each field (u32 LE, each)
//   then              fields concatenated
//
// CCC's `ccc.mol.table({ field: codec, ... })` handles all of that —
// we just declare the layout.

import { ccc } from '@ckb-ccc/core';

const { Uint8, Uint16, Uint64, Byte32, Bytes, table } = ccc.mol;

// ─── Status constants (mirror byterent-types/constants.rs) ───────────────
// `const` objects instead of `enum` because the tsconfig enforces
// erasableSyntaxOnly (enums require emit at runtime). Values must match
// the on-chain Rust source of truth byte-for-byte — the listing-type
// and lease-type scripts reject any other value.

export const ListingStatus = {
  Open: 0,
  Closed: 1,
  Cancelled: 2,
} as const;
export type ListingStatus = (typeof ListingStatus)[keyof typeof ListingStatus];

export const LeaseStatus = {
  Active: 0,
  Expired: 1,
} as const;
export type LeaseStatus = (typeof LeaseStatus)[keyof typeof LeaseStatus];

// ─── MarketConfigData ─────────────────────────────────────────────────────

export const MarketConfigData = table({
  version: Uint8,
  listing_type_code_hash: Byte32,
  lease_type_code_hash: Byte32,
  leased_cap_lock_code_hash: Byte32,
  leased_cap_type_code_hash: Byte32,
  min_listing_capacity_shannons: Uint64,
  min_fill_capacity_shannons: Uint64,
  min_lease_epochs: Uint64,
  fee_rate_basis_points: Uint16,
  fee_recipient_lock_hash: Byte32,
});

export type MarketConfigDecoded = ReturnType<typeof MarketConfigData.decode>;

// ─── ListingData ──────────────────────────────────────────────────────────

export const ListingData = table({
  version: Uint8,
  owner_lock_hash: Byte32,
  capacity_total_shannons: Uint64,
  capacity_available_shannons: Uint64,
  duration_epochs: Uint64,
  rate_shannons_per_byte_per_epoch: Uint64,
  min_fill_shannons: Uint64,
  allow_partial_fill: Uint8,
  status: Uint8,
});

export type ListingDataDecoded = ReturnType<typeof ListingData.decode>;

// ─── LeaseData ────────────────────────────────────────────────────────────

export const LeaseData = table({
  version: Uint8,
  listing_id: Byte32,
  owner_lock_hash: Byte32,
  tenant_lock_hash: Byte32,
  total_cell_capacity_shannons: Uint64,
  usable_capacity_shannons: Uint64,
  start_epoch: Uint64,
  end_epoch: Uint64,
  rate_shannons_per_byte_per_epoch: Uint64,
  total_price_paid_shannons: Uint64,
  status: Uint8,
});

export type LeaseDataDecoded = ReturnType<typeof LeaseData.decode>;

// ─── LeasedCapacityData ───────────────────────────────────────────────────

export const LeasedCapacityData = table({
  version: Uint8,
  lease_id: Byte32,
  usable_capacity_shannons: Uint64,
  tenant_data: Bytes,
});

export type LeasedCapacityDataDecoded = ReturnType<typeof LeasedCapacityData.decode>;

// ─── ExpiredLeaseReceipt ──────────────────────────────────────────────────

export const ExpiredLeaseReceipt = table({
  version: Uint8,
  lease_id: Byte32,
  listing_id: Byte32,
  owner_lock_hash: Byte32,
  end_epoch: Uint64,
  returned_shannons: Uint64,
});

export type ExpiredLeaseReceiptDecoded = ReturnType<typeof ExpiredLeaseReceipt.decode>;
