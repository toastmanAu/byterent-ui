// Mint-listing tx builder.
//
// Produces a CCC transaction that creates a new ByteRent listing cell:
//   output[0] = {
//     lock: owner's wallet lock (signer's recommended address),
//     type: { code_hash: listing_type, hash_type: data2, args: <32-byte listing_id> },
//     capacity: capacityTotalShannons, — the committed CKB slice
//     data: ListingData molecule bytes,
//   }
//
// Constraints enforced by the listing-type script on validate_create:
//  - status == OPEN
//  - capacity_total_shannons == capacity_available_shannons
//  - rate > 0
//  - capacity_total_shannons >= market_config.min_listing_capacity_shannons
//  - min_fill_shannons >= market_config.min_fill_capacity_shannons
//  - duration_epochs >= market_config.min_lease_epochs
//
// Cell_deps required: listing-type code cell + market-config cell +
// owner lock code cell (added via addCellDepsOfKnownScripts in the
// caller since that path also covers JoyID / future lock types).

import { ccc } from '@ckb-ccc/core';
import { BYTERENT_TESTNET_MANIFEST } from '../light/manifest';
import { ListingData, ListingStatus } from '../light/molecule';

export interface MintListingParams {
  /** Total CKB capacity being committed, in shannons. Also becomes the
   *  listing cell's on-chain capacity value. Must be ≥ market floor. */
  capacityTotalShannons: bigint;
  /** Duration of any lease taken against this listing, in epochs. Must
   *  be ≥ market_config.min_lease_epochs. */
  durationEpochs: bigint;
  /** Rate charged per shannon-of-usable-capacity per epoch, in shannons.
   *  Price formula (checked on-chain by lease-type):
   *    price = usable_capacity_shannons × duration_epochs × rate */
  rateShannonsPerBytePerEpoch: bigint;
  /** Smallest lease fill allowed against this listing, in shannons. Must
   *  be ≥ market_config.min_fill_capacity_shannons. Only relevant when
   *  allowPartialFill = true. */
  minFillShannons: bigint;
  /** If false, leases must consume the full listing. If true, leases
   *  can take a slice (subject to minFillShannons). */
  allowPartialFill: boolean;
}

export interface MintListingResult {
  tx: ccc.Transaction;
  /** 32-byte random id baked into the listing's type script args — the
   *  dApp's stable identity for this listing. Callers hold this to
   *  display "listing 0x…" or link to a detail page post-submit. */
  listingId: ccc.Hex;
  /** Capacity the user pays (inputs - outputs), in shannons. Equal to
   *  the cell's committed capacity plus the tx fee. Surfaced for the
   *  sign-preview UI. */
  feeShannons: bigint;
}

/**
 * Build + complete a mint-listing tx, ready for `signer.signOnlyTransaction`.
 *
 * Caller is expected to have a wallet connected (desktop redirect-relay
 * or mobile same-device JoyID). Doesn't submit — returns the unsigned tx
 * plus metadata for the sign-preview.
 */
export async function buildMintListingTx(
  signer: ccc.Signer,
  params: MintListingParams,
): Promise<MintListingResult> {
  const manifest = BYTERENT_TESTNET_MANIFEST;

  // Owner lock = the wallet's recommended address script. `owner_lock_hash`
  // in ListingData is blake2b-256 of this script's serialised bytes, which
  // CCC computes via `script.hash()`.
  const addrObj = await signer.getRecommendedAddressObj();
  const ownerScript = addrObj.script;
  const ownerLockHash = ownerScript.hash();

  // Random 32-byte listing_id. The on-chain listing-type doesn't check
  // the args format — any unique blob works. We use crypto.randomUUID
  // twice-decoded into raw bytes to avoid predictable timestamps.
  const listingId = randomBytes32();

  // Build the listing type script — its args ARE the listing id.
  const listingTypeScript = ccc.Script.from({
    codeHash: manifest.scripts.listingType.codeHash,
    hashType: manifest.scripts.listingType.hashType,
    args: listingId,
  });

  // Serialise ListingData via ccc.mol table encoder. Molecule tables
  // are self-describing (4-byte total-size header at offset 0) — we
  // pass raw bytes, the on-chain script parses from offset 0.
  const listingDataBytes = ListingData.encode({
    version: 1,
    owner_lock_hash: ownerLockHash,
    capacity_total_shannons: params.capacityTotalShannons,
    capacity_available_shannons: params.capacityTotalShannons,
    duration_epochs: params.durationEpochs,
    rate_shannons_per_byte_per_epoch: params.rateShannonsPerBytePerEpoch,
    min_fill_shannons: params.minFillShannons,
    allow_partial_fill: params.allowPartialFill ? 1 : 0,
    status: ListingStatus.Open,
  });

  const outputsData: ccc.HexLike[] = [ccc.hexFrom(listingDataBytes)];

  const tx = ccc.Transaction.from({
    outputs: [
      {
        lock: ownerScript,
        type: listingTypeScript,
        capacity: params.capacityTotalShannons,
      },
    ],
    outputsData,
  });

  // Cell deps that must ride along:
  //  1. listing-type code — so the VM can load the script that validates
  //     output[0]'s type script on commit.
  //  2. market-config cell — the listing-type script's validate_create
  //     iterates cell_deps looking for a MarketConfigData-shaped blob to
  //     read the min-capacity / min-epoch floors from.
  //  3. Owner's lock code (JoyID or secp) — attached by
  //     addCellDepsOfKnownScripts in the signer's prepareTransaction.
  tx.cellDeps.push(
    ccc.CellDep.from({
      outPoint: {
        txHash: manifest.scripts.listingType.txHash,
        index: manifest.scripts.listingType.index,
      },
      depType: manifest.scripts.listingType.depType,
    }),
    ccc.CellDep.from({
      outPoint: manifest.marketConfig.outPoint,
      depType: 'code',
    }),
  );

  // Ensure the JoyID lock cell_dep is present. CCC's completeFee loop
  // can drop the signer's prepareTransaction additions during change
  // iterations; add it up-front so it survives every loop pass.
  await tx.addCellDepsOfKnownScripts(signer.client, ccc.KnownScript.JoyId);

  // Inputs: let CCC pick enough JoyID-locked change cells to cover the
  // committed capacity + eventual fee. capacityTweak=0 because the fee
  // pad happens in the completeFeeBy step below.
  await tx.completeInputsByCapacity(signer);

  // ckb-transactions.md §1: pre-pad witness[0] with a 1000-byte lock
  // placeholder BEFORE fee estimation. Signer's prepareTransaction does
  // this too, but CCC's clone-and-copy-back loop can lose the padding
  // in some iterations — producing fee under-counts.
  const placeholder = ccc.WitnessArgs.from({
    lock: '0x' + '00'.repeat(1000),
  });
  if (tx.witnesses.length === 0) {
    tx.witnesses.push(ccc.hexFrom(placeholder.toBytes()));
  } else {
    tx.witnesses[0] = ccc.hexFrom(placeholder.toBytes());
  }

  await tx.completeFeeBy(signer, 1000);

  // Net tx cost = total inputs capacity - total outputs capacity. This
  // is what the user is actually paying beyond the committed listing
  // capacity, i.e. the tx fee. Shown in the preview so the user knows
  // the full cost before signing.
  const inputsCap = await tx.getInputsCapacity(signer.client);
  const outputsCap = tx.getOutputsCapacity();
  const feeShannons = inputsCap - outputsCap;

  return { tx, listingId, feeShannons };
}

function randomBytes32(): ccc.Hex {
  // crypto.getRandomValues is universally available (browsers + node ≥ 19
  // + workers). UUID-based approach would require parsing hyphens out.
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  let hex = '0x';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex as ccc.Hex;
}
