import type { FfList, FfResource } from './firefly.types';

export interface TokenProvider {
  accessToken(): Promise<string>;
  /** Forces a refresh after a 401. Returns null when the session can no longer be refreshed. */
  refresh(): Promise<string | null>;
}

export class FireflyError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
    message: string,
  ) {
    super(message);
  }
}

export type Query = Record<string, string | number | boolean | undefined | null | string[]>;

const PAGE_SIZE = 500;
const PAGE_CONCURRENCY = 4;

/**
 * Read-only Firefly III API client. It intentionally exposes GET only, which is what
 * guarantees SpaceFly can never modify data in Firefly.
 */
export class FireflyClient {
  constructor(
    private readonly baseUrl: string,
    private readonly tokens: TokenProvider,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async get<T>(path: string, query: Query = {}): Promise<T> {
    const url = this.buildUrl(path, query);
    let token = await this.tokens.accessToken();
    let res = await this.send(url, token);
    if (res.status === 401) {
      const refreshed = await this.tokens.refresh();
      if (!refreshed) throw new FireflyError(401, path, 'Firefly session expired');
      token = refreshed;
      res = await this.send(url, token);
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new FireflyError(res.status, path, `Firefly ${res.status} on GET ${path}: ${body.slice(0, 300)}`);
    }
    return (await res.json()) as T;
  }

  /** Fetches every page of a list endpoint (first page sequentially, the rest in parallel). */
  async list<T>(path: string, query: Query = {}): Promise<FfResource<T>[]> {
    const first = await this.get<FfList<T>>(path, { ...query, limit: PAGE_SIZE, page: 1 });
    const totalPages = first.meta?.pagination?.total_pages ?? 1;
    const out = [...first.data];
    const pages: number[] = [];
    for (let p = 2; p <= totalPages; p++) pages.push(p);
    for (let i = 0; i < pages.length; i += PAGE_CONCURRENCY) {
      const batch = await Promise.all(
        pages.slice(i, i + PAGE_CONCURRENCY).map((page) => this.get<FfList<T>>(path, { ...query, limit: PAGE_SIZE, page })),
      );
      for (const r of batch) out.push(...r.data);
    }
    return out;
  }

  /** A single page, used by search where the UI drives pagination. */
  async page<T>(path: string, query: Query, page: number, limit: number): Promise<FfList<T>> {
    return this.get<FfList<T>>(path, { ...query, page, limit });
  }

  private send(url: string, token: string): Promise<Response> {
    return this.fetchImpl(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.api+json, application/json',
      },
      signal: AbortSignal.timeout(30_000),
    });
  }

  private buildUrl(path: string, query: Query): string {
    const url = new URL(`${this.baseUrl}/api${path.startsWith('/') ? path : `/${path}`}`);
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === '') continue;
      if (Array.isArray(v)) for (const item of v) url.searchParams.append(`${k}[]`, item);
      else url.searchParams.set(k, String(v));
    }
    return url.toString();
  }
}
