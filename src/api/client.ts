import type {
  CkbfsFileMetaDto,
  HealthDto,
  LeaseDto,
  LeaseFilterParams,
  LeasePageDto,
  ListingDto,
  ListingFilterParams,
  ListingPageDto,
} from './types';

// Default indexer endpoint. Override at build time via VITE_INDEXER_URL
// (Vite exposes import.meta.env.VITE_* to the app).
const DEFAULT_BASE =
  (import.meta.env.VITE_INDEXER_URL as string | undefined) ?? 'http://localhost:8117';

export class IndexerClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string = DEFAULT_BASE) {
    this.baseUrl = baseUrl;
  }

  async health(): Promise<HealthDto> {
    return this.get('/health');
  }

  async listListings(params: ListingFilterParams = {}): Promise<ListingPageDto> {
    return this.get(`/listings${toQuery(params as Record<string, unknown>)}`);
  }

  async getListing(listingId: string): Promise<ListingDto> {
    return this.get(`/listings/${encodeURIComponent(listingId)}`);
  }

  async listLeases(params: LeaseFilterParams = {}): Promise<LeasePageDto> {
    return this.get(`/leases${toQuery(params as Record<string, unknown>)}`);
  }

  async getLease(leaseId: string): Promise<LeaseDto> {
    return this.get(`/leases/${encodeURIComponent(leaseId)}`);
  }

  async leasesExpiringWithin(epochs: number): Promise<LeasePageDto> {
    return this.get(`/leases/expiring/${epochs}`);
  }

  async getCkbfsMeta(typeId: string): Promise<CkbfsFileMetaDto> {
    return this.get(`/ckbfs/${encodeURIComponent(typeId)}`);
  }

  ckbfsContentUrl(typeId: string): string {
    return `${this.baseUrl}/ckbfs/${encodeURIComponent(typeId)}/content`;
  }

  async getCkbfsContent(typeId: string): Promise<Blob> {
    const res = await fetch(this.ckbfsContentUrl(typeId));
    if (!res.ok) throw await httpError(res);
    return res.blob();
  }

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`);
    if (!res.ok) throw await httpError(res);
    return res.json() as Promise<T>;
  }
}

function toQuery(params: Record<string, unknown>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  if (entries.length === 0) return '';
  const q = new URLSearchParams();
  for (const [k, v] of entries) q.append(k, String(v));
  return `?${q.toString()}`;
}

async function httpError(res: Response): Promise<Error> {
  const body = await res.text().catch(() => '');
  return new Error(`${res.status} ${res.statusText}${body ? ` — ${body}` : ''}`);
}

// Shared singleton for hooks that don't want to thread it explicitly.
export const indexer = new IndexerClient();
