// Client-side CKBFS resolver. 1:1 port of
// `byterent-indexer/src/ckbfs.rs`. Given a type_id, finds the CKBFS cell
// (tries V3 code_hash then V2), decodes the CKBFS metadata from cell
// data, then pulls the file's content chunks from the publish tx's
// witnesses.

import { ccc } from '@ckb-ccc/core';
import type { Hex } from '@ckb-ccc/core';
import { getPublicRpcClient } from './rpc';

// ─── Protocol constants ────────────────────────────────────────────────────

const CKBFS_V3_CODE_HASH: Hex = '0xb5d13ffe0547c78021c01fe24dce2e959a1ed8edbca3cb93dd2e9f57fb56d695';
const CKBFS_V3_WITNESS_VERSION = 0x03;
const CKBFS_V3_WITNESS_CONTENT_OFFSET = 50; // "CKBFS"(5) + ver(1) + 32 prev_tx + 4 prev_idx + 4 prev_cksum + 4 next_idx

const CKBFS_V2_CODE_HASH: Hex = '0x31e6376287d223b8c0410d562fb422f04d1d617b2947596a14c3d2efb7218d3a';
const CKBFS_V2_WITNESS_VERSION = 0x00;
const CKBFS_V2_WITNESS_CONTENT_OFFSET = 6;

const WITNESS_MAGIC = new Uint8Array([0x43, 0x4b, 0x42, 0x46, 0x53]); // "CKBFS"

export interface CkbfsFile {
  typeId: Hex;
  filename: string;
  contentType: string;
  checksum: number;
  bytes: Uint8Array;
  protocolVersion: number;
}

export interface CkbfsMeta {
  indexes: number[];
  checksum: number;
  contentType: string;
  filename: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function hexToBytes(hex: Hex): Uint8Array {
  const s = hex.startsWith('0x') ? hex.slice(2) : hex;
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(s.substr(i * 2, 2), 16);
  }
  return out;
}

function readU32LE(b: Uint8Array, off: number): number {
  return b[off] | (b[off + 1] << 8) | (b[off + 2] << 16) | (b[off + 3] << 24);
}

function bytesEq(a: Uint8Array, b: Uint8Array, offset = 0, len = b.length): boolean {
  if (a.length - offset < len) return false;
  for (let i = 0; i < len; i++) if (a[offset + i] !== b[i]) return false;
  return true;
}

// ─── CKBFSData decoder (hand-rolled) ───────────────────────────────────────
// V2: 4 fields (indexes=Uint32, checksum=Uint32, content_type=Bytes, filename=Bytes)
// V3: 5 fields (indexes=Vec<Uint32>, checksum=Uint32, content_type=Bytes, filename=Bytes, backLinks=...)

function decodeCkbfsData(bytes: Uint8Array): CkbfsMeta {
  const bad = (r: string) => new Error(`CKBFSData decode: ${r}`);
  if (bytes.length < 8) throw bad('cell data shorter than molecule header');

  const totalSize = readU32LE(bytes, 0);
  if (totalSize !== bytes.length) {
    throw bad(`molecule total_size ${totalSize} != byte length ${bytes.length}`);
  }
  const firstOffset = readU32LE(bytes, 4);
  if (firstOffset < 8 || firstOffset % 4 !== 0) {
    throw bad(`implausible first_offset ${firstOffset}`);
  }
  const fieldCount = firstOffset / 4 - 1;
  if (fieldCount !== 4 && fieldCount !== 5) {
    throw bad(`expected 4 or 5 fields in CKBFSData, got ${fieldCount}`);
  }

  const offsets: number[] = [];
  for (let i = 0; i < fieldCount; i++) {
    offsets.push(readU32LE(bytes, 4 + i * 4));
  }
  offsets.push(totalSize);

  const readStr = (off: number, end: number): string => {
    if (off + 4 > end || end > bytes.length) throw bad('string field offsets out of range');
    const len = readU32LE(bytes, off);
    if (off + 4 + len > end) throw bad('string length overflows field extent');
    return new TextDecoder('utf-8').decode(bytes.subarray(off + 4, off + 4 + len));
  };

  let indexes: number[];
  if (fieldCount === 4) {
    if (offsets[0] + 4 > offsets[1]) throw bad('V2 indexes field truncated');
    indexes = [readU32LE(bytes, offsets[0])];
  } else {
    const start = offsets[0];
    const end = offsets[1];
    if (start + 4 > end) throw bad('V3 indexes Vec<Uint32> header truncated');
    const count = readU32LE(bytes, start);
    if (start + 4 + count * 4 > end) throw bad(`V3 indexes Vec<Uint32> body truncated (count=${count})`);
    indexes = [];
    for (let i = 0; i < count; i++) indexes.push(readU32LE(bytes, start + 4 + i * 4));
  }

  if (offsets[1] + 4 > offsets[2]) throw bad('checksum field truncated');
  const checksum = readU32LE(bytes, offsets[1]);
  const contentType = readStr(offsets[2], offsets[3]);
  const filename = readStr(offsets[3], offsets[4]);

  return { indexes, checksum, contentType, filename };
}

// ─── Witness chunk extraction ──────────────────────────────────────────────

function extractChunkFromWitness(witnessHex: Hex): Uint8Array {
  const bytes = hexToBytes(witnessHex);
  if (bytes.length < 6 || !bytesEq(bytes, WITNESS_MAGIC)) {
    throw new Error("CKBFS witness missing 'CKBFS' magic header");
  }
  const version = bytes[5];
  let offset: number;
  if (version === CKBFS_V3_WITNESS_VERSION) offset = CKBFS_V3_WITNESS_CONTENT_OFFSET;
  else if (version === CKBFS_V2_WITNESS_VERSION) offset = CKBFS_V2_WITNESS_CONTENT_OFFSET;
  else throw new Error(`Unknown CKBFS witness version 0x${version.toString(16).padStart(2, '0')}`);

  if (bytes.length < offset) {
    throw new Error(`CKBFS witness too short for version 0x${version.toString(16)} (${bytes.length} < ${offset})`);
  }
  return bytes.subarray(offset);
}

// ─── Resolver ──────────────────────────────────────────────────────────────

async function tryResolve(
  typeId: Hex,
  codeHash: Hex,
  expectedVersion: number,
): Promise<CkbfsFile | null> {
  const client = getPublicRpcClient();
  const script = ccc.Script.from({
    codeHash,
    hashType: 'data1',
    args: typeId,
  });

  const res = await client.findCellsPaged(
    {
      script,
      scriptType: 'type',
      scriptSearchMode: 'exact',
      filter: null,
      withData: true,
    },
    'asc',
    1,
  );
  if (res.cells.length === 0) return null;

  const cell = res.cells[0];
  const dataHex = cell.outputData;
  if (!dataHex) throw new Error('CKBFS cell has no output_data');
  const dataBytes = hexToBytes(dataHex as Hex);
  const meta = decodeCkbfsData(dataBytes);

  // Fetch publish tx to pull witnesses at meta.indexes.
  const txHash = cell.outPoint?.txHash;
  if (!txHash) throw new Error('CKBFS cell has no outPoint');
  const txResp = await client.getTransaction(txHash as Hex);
  if (!txResp) throw new Error(`publish tx ${txHash} not found via public RPC`);
  const witnesses = txResp.transaction.witnesses ?? [];

  const chunks: Uint8Array[] = [];
  for (const idx of meta.indexes) {
    const w = witnesses[idx];
    if (!w) throw new Error(`CKBFS witness index ${idx} out of range (tx has ${witnesses.length})`);
    chunks.push(extractChunkFromWitness(w as Hex));
  }

  const totalLen = chunks.reduce((a, c) => a + c.length, 0);
  const content = new Uint8Array(totalLen);
  let off = 0;
  for (const c of chunks) {
    content.set(c, off);
    off += c.length;
  }

  return {
    typeId,
    filename: meta.filename,
    contentType: meta.contentType,
    checksum: meta.checksum,
    bytes: content,
    protocolVersion: expectedVersion,
  };
}

/**
 * Resolve a CKBFS file by its type_id. Tries V3 first (newer), falls
 * back to V2. Throws if neither version has a matching live cell.
 */
export async function resolveCkbfs(typeId: Hex): Promise<CkbfsFile> {
  for (const { codeHash, version } of [
    { codeHash: CKBFS_V3_CODE_HASH, version: CKBFS_V3_WITNESS_VERSION },
    { codeHash: CKBFS_V2_CODE_HASH, version: CKBFS_V2_WITNESS_VERSION },
  ]) {
    const file = await tryResolve(typeId, codeHash, version);
    if (file) return file;
  }
  throw new Error(`No CKBFS cell found for type_id ${typeId}`);
}

/** File meta only, no content chunks fetched. Cheaper when UI only needs size+type. */
export async function resolveCkbfsMeta(
  typeId: Hex,
): Promise<Pick<CkbfsFile, 'typeId' | 'filename' | 'contentType' | 'checksum' | 'protocolVersion'> & { byteLength: number }> {
  const f = await resolveCkbfs(typeId);
  return {
    typeId: f.typeId,
    filename: f.filename,
    contentType: f.contentType,
    checksum: f.checksum,
    protocolVersion: f.protocolVersion,
    byteLength: f.bytes.length,
  };
}
