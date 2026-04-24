// ByteRentLightClient — CCC Client subclass backed by @nervosnetwork's
// browser-embedded WASM light client. Direct port of Quantum Purse's
// QPClient adapter (graphify: quantum-purse, src/core/ccc-adapter/qp_client.ts),
// narrowed to the methods byterent actually needs.
//
// What the browser gains by using this instead of our HTTP indexer:
//   • trustless reads — data arrives with a block proof, not our word
//   • zero backend — no driveThree dependency for the read path
//   • tx submit goes directly to peers, no POST /submit relay
//
// What the browser pays:
//   • a multi-MB WASM blob
//   • 10–30s cold-start for header sync on first load (cached thereafter
//     in IndexedDB by the library's db-worker)
//   • SharedArrayBuffer means we need COOP/COEP headers (see vite.config)

import {
  LightClient,
  LightClientSetScriptsCommand,
  randomSecretKey,
  type NetworkSetting,
  type ScriptStatus,
  type GetCellsResponse,
  type GetTransactionsResponse,
  type TxWithCell,
  type TxWithCells,
  type LocalNode,
  type FetchResponse,
} from '@nervosnetwork/ckb-light-client-js';
import {
  Cell,
  Client,
  ClientCacheMemory,
  OutPoint,
  ScriptInfo,
  ClientTransactionResponse,
  KnownScript,
  type Num,
  type Hex,
  type HexLike,
  type NumLike,
  type OutPointLike,
  type ClientBlock,
  type ClientBlockHeader,
  type ClientFindCellsResponse,
  type ClientFindTransactionsGroupedResponse,
  type ClientFindTransactionsResponse,
  type ClientIndexerSearchKeyLike,
  type ClientIndexerSearchKeyTransactionLike,
  type OutputsValidator,
  type TransactionLike,
  type ScriptInfoLike,
} from '@ckb-ccc/core';
import { TESTNET_SCRIPTS } from '@ckb-ccc/core/advancedBarrel';
// CKB_TESTNET_CONFIG kept in networkConfig.ts for future pinning scenarios;
// not imported here today because the library's TestNet defaults work.
import { LightClientDB } from './db';

const CLIENT_SECRET_KEY_STORAGE = 'byterent-light-client.secret-key';

export class ByteRentLightClient extends Client {
  readonly lightClient: LightClient;
  private startPromise: Promise<void> | undefined;
  private started = false;

  constructor() {
    super({ cache: new ClientCacheMemory() });
    this.lightClient = new LightClient();
  }

  /** Light-client backed — no HTTP URL. */
  get url(): string {
    return 'light-client-testnet';
  }

  get addressPrefix(): string {
    return 'ckt';
  }

  /** ccc.KnownScript → ScriptInfoLike lookup; unchanged from CCC's TESTNET_SCRIPTS. */
  get scripts(): Record<KnownScript, ScriptInfoLike | undefined> {
    return TESTNET_SCRIPTS;
  }

  async getKnownScript(script: KnownScript): Promise<ScriptInfo> {
    const found = this.scripts[script];
    if (!found) {
      throw new Error(`No script info for ${script} on ${this.addressPrefix}`);
    }
    return ScriptInfo.from(found);
  }

  /**
   * Start (once) the light client inside its Web Worker. Safe to call
   * from multiple components — subsequent callers wait on the same
   * in-flight promise. A fresh secret key is generated on first launch
   * and persisted in IndexedDB so we keep the same peer identity
   * across reloads.
   */
  async ensureStarted(): Promise<void> {
    if (this.started) return;
    if (this.startPromise) {
      await this.startPromise;
      return;
    }

    this.startPromise = (async () => {
      let secretKey = await LightClientDB.getItem(CLIENT_SECRET_KEY_STORAGE);
      if (!secretKey) {
        secretKey = randomSecretKey();
        await LightClientDB.setItem(CLIENT_SECRET_KEY_STORAGE, secretKey);
      }

      // Use the library's built-in TestNet defaults. Passing a custom
      // TOML config here hangs the start sequence (verified via a bare
      // LightClient probe). If we ever need to pin specific bootnodes,
      // re-enable CKB_TESTNET_CONFIG and switch to networkConfigIsJSObject
      // semantics from the README.
      const network: NetworkSetting = { type: 'TestNet' };

      // Transport: wss on HTTPS deploy, ws on plain http://localhost dev.
      const transport: 'ws' | 'wss' =
        typeof window !== 'undefined' && window.location.protocol === 'https:'
          ? 'wss'
          : 'ws';

      await this.lightClient.start(network, secretKey as Hex, 'info', transport);
      this.started = true;

      // We intentionally DON'T register any scripts here. The CKB light
      // client only syncs cells matching concretely-registered scripts,
      // and we can't pre-register every possible listing/lease (args
      // are unique per cell). Enumeration is handled by the public RPC
      // (see src/api/light/rpc.ts). The light client stays ready for
      // wallet-specific concrete-script reads when the user connects.
    })();

    await this.startPromise;
  }

  isStarted(): boolean {
    return this.started;
  }

  // ─── Selective sync filter ──────────────────────────────────────────────

  async setScripts(
    scripts: ScriptStatus[],
    command?: LightClientSetScriptsCommand,
  ): Promise<void> {
    await this.lightClient.setScripts(scripts, command);
  }

  async getScripts(): Promise<ScriptStatus[]> {
    return this.lightClient.getScripts();
  }

  async localNodeInfo(): Promise<LocalNode> {
    return this.lightClient.localNodeInfo();
  }

  // ─── Client abstract methods ────────────────────────────────────────────

  async getFeeRateStatistics(_blockRange?: NumLike): Promise<{ mean: Num; median: Num }> {
    throw new Error('ByteRentLightClient: getFeeRateStatistics not supported');
  }

  async getTip(): Promise<Num> {
    const header = await this.lightClient.getTipHeader();
    return header.number;
  }

  async getTipHeader(_verbosity?: number | null): Promise<ClientBlockHeader> {
    return this.lightClient.getTipHeader();
  }

  async getBlockByNumberNoCache(): Promise<ClientBlock | undefined> {
    throw new Error('ByteRentLightClient: getBlockByNumberNoCache not supported');
  }

  async getBlockByHashNoCache(): Promise<ClientBlock | undefined> {
    throw new Error('ByteRentLightClient: getBlockByHashNoCache not supported');
  }

  async getHeaderByNumberNoCache(): Promise<ClientBlockHeader | undefined> {
    throw new Error('ByteRentLightClient: getHeaderByNumberNoCache not supported');
  }

  async getHeaderByHashNoCache(blockHash: HexLike): Promise<ClientBlockHeader | undefined> {
    return this.lightClient.getHeader(blockHash);
  }

  async estimateCycles(transaction: TransactionLike): Promise<Num> {
    // Cast: light-client-js bundles an older pinned @ckb-ccc/core than our app
    // (0.1.0-alpha.6 vs 1.x). Its TransactionLike shape is a structural subset
    // of ours; pass through as unknown to avoid a nominal-type mismatch.
    return this.lightClient.estimateCycles(transaction as unknown as Parameters<typeof this.lightClient.estimateCycles>[0]);
  }

  async sendTransactionDry(_transaction: TransactionLike, _validator?: OutputsValidator): Promise<Num> {
    throw new Error('ByteRentLightClient: sendTransactionDry not supported');
  }

  async sendTransactionNoCache(transaction: TransactionLike, _validator?: OutputsValidator): Promise<Hex> {
    return this.lightClient.sendTransaction(transaction as unknown as Parameters<typeof this.lightClient.sendTransaction>[0]);
  }

  async getTransactionNoCache(txHash: HexLike): Promise<ClientTransactionResponse | undefined> {
    const tx = await this.lightClient.getTransaction(txHash);
    if (!tx) return undefined;
    return ClientTransactionResponse.from({
      transaction: tx.transaction,
      status: tx.status,
      blockNumber: tx.blockNumber,
    });
  }

  async getCellLiveNoCache(
    outPointLike: OutPointLike,
    withData?: boolean | null,
    _includeTxPool?: boolean | null,
  ): Promise<Cell | undefined> {
    const outPoint = OutPoint.from(outPointLike);
    const tx = await this.lightClient.getTransaction(outPoint.txHash);
    if (!tx) return undefined;
    const index = Number(outPoint.index);
    if (index >= tx.transaction.outputs.length) return undefined;
    return Cell.from({
      cellOutput: tx.transaction.outputs[index],
      outputData: withData ? tx.transaction.outputsData[index] ?? '0x' : '0x',
      outPoint,
    });
  }

  async findCellsPagedNoCache(
    key: ClientIndexerSearchKeyLike,
    order?: 'asc' | 'desc',
    limit?: NumLike,
    after?: string,
  ): Promise<ClientFindCellsResponse> {
    const res = await this.lightClient.getCells(key, order ?? 'asc', limit, after as Hex);
    return {
      cells: res.cells.map((c) =>
        Cell.from({ cellOutput: c.cellOutput, outputData: c.outputData, outPoint: c.outPoint }),
      ),
      lastCursor: res.lastCursor,
    };
  }

  // Overloads mirror CCC's base signature; only the grouped variant is
  // unsupported — we don't use transaction grouping in byterent today.
  async findTransactionsPaged(
    key: Omit<ClientIndexerSearchKeyTransactionLike, 'groupByTransaction'> & {
      groupByTransaction: true;
    },
    order?: 'asc' | 'desc',
    limit?: NumLike,
    after?: string,
  ): Promise<ClientFindTransactionsGroupedResponse>;
  async findTransactionsPaged(
    key: Omit<ClientIndexerSearchKeyTransactionLike, 'groupByTransaction'> & {
      groupByTransaction?: false | null;
    },
    order?: 'asc' | 'desc',
    limit?: NumLike,
    after?: string,
  ): Promise<ClientFindTransactionsResponse>;
  async findTransactionsPaged(): Promise<
    ClientFindTransactionsResponse | ClientFindTransactionsGroupedResponse
  > {
    throw new Error('ByteRentLightClient: findTransactionsPaged not supported');
  }

  async getCellsCapacity(key: ClientIndexerSearchKeyLike): Promise<Num> {
    return this.lightClient.getCellsCapacity(key);
  }

  // Passthrough wrappers used by the query layer.

  async rawGetCells(
    key: ClientIndexerSearchKeyLike,
    order?: 'asc' | 'desc',
    limit?: NumLike,
    afterCursor?: Hex,
  ): Promise<GetCellsResponse> {
    return this.lightClient.getCells(key, order, limit, afterCursor);
  }

  async rawGetTransactions(
    key: ClientIndexerSearchKeyTransactionLike,
    order?: 'asc' | 'desc',
    limit?: NumLike,
    afterCursor?: Hex,
  ): Promise<GetTransactionsResponse<TxWithCell> | GetTransactionsResponse<TxWithCells>> {
    return this.lightClient.getTransactions(key, order, limit, afterCursor);
  }

  async fetchTransaction(
    txHash: HexLike,
  ): Promise<FetchResponse<ClientTransactionResponse>> {
    // Same structural cast as other lightClient passthroughs.
    return this.lightClient.fetchTransaction(txHash) as unknown as Promise<
      FetchResponse<ClientTransactionResponse>
    >;
  }
}

// Module-singleton — the app holds exactly one light-client instance.
// Exposed directly so any layer (query library, React provider, etc.)
// can dereference the same underlying LightClient without threading it.
let instance: ByteRentLightClient | undefined;

export function getByteRentLightClient(): ByteRentLightClient {
  if (!instance) instance = new ByteRentLightClient();
  return instance;
}
