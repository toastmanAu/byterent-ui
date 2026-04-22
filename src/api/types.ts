// TS mirrors of the Rust DTOs exposed by byterent-indexer's HTTP server.
// Keep these in lockstep with indexer/src/http.rs — changes there require
// matching changes here. No codegen yet; duplicate-and-drift is the V1 cost.

export interface HealthDto {
  rpc_url: string;
  tip_block_number: number;
  market_config_out_point: string;
  market_config_live: boolean;
  market_config_code_hash_matches: boolean;
  healthy: boolean;
}

export type ListingStatus = 'Open' | 'Closed' | 'Cancelled' | string; // string for forward-compat Unknown(n)

export interface ListingDto {
  listing_id: string;           // 0x-prefixed hex
  out_point_tx_hash: string;
  out_point_index: number;
  block_number: number;
  tx_index: number;
  cell_capacity_shannons: number;
  status: ListingStatus;
  owner_lock_hash: string;
  capacity_total_shannons: number;
  capacity_available_shannons: number;
  duration_epochs: number;
  rate_shannons_per_byte_per_epoch: number;
  min_fill_shannons: number;
  allow_partial_fill: boolean;
  fill_fraction: number;
}

export interface ListingPageDto {
  listings: ListingDto[];
  next_cursor: string;
  decode_failures: number;
}

export type LeaseStatus = 'Active' | 'Expired' | string;

export interface LeaseDto {
  lease_id: string;
  listing_id: string;
  out_point_tx_hash: string;
  out_point_index: number;
  block_number: number;
  tx_index: number;
  cell_capacity_shannons: number;
  status: LeaseStatus;
  tenant_lock_hash: string;
  owner_lock_hash: string;
  total_cell_capacity_shannons: number;
  usable_capacity_shannons: number;
  start_epoch: number;
  end_epoch: number;
  rate_shannons_per_byte_per_epoch: number;
  total_price_paid_shannons: number;
}

export interface LeasePageDto {
  leases: LeaseDto[];
  next_cursor: string;
  decode_failures: number;
}

export interface CkbfsFileMetaDto {
  type_id: string;
  filename: string;
  content_type: string;
  checksum: number;
  byte_length: number;
  protocol_version: number;
}

export interface ListingFilterParams {
  max_rate?: number;
  min_rate?: number;
  min_duration?: number;
  max_duration?: number;
  min_capacity?: number;
  max_capacity?: number;
  only_partial_fill?: boolean;
  lessor?: string;
  sort?: 'cheapest' | 'newest' | 'largest' | 'shortest';
  limit?: number;
  cursor?: string;
}

export interface LeaseFilterParams {
  tenant?: string;
  lessor?: string;
  status?: 'active' | 'expired';
  min_end_epoch?: number;
  max_end_epoch?: number;
  sort?: 'ending-soonest' | 'newest' | 'highest-value';
  limit?: number;
  cursor?: string;
}
