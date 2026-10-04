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
    /** Field → messages from a Firefly 422 (`{ message, errors }`). */
    readonly errors: Record<string, string[]> = {},
    /** Firefly's own `message`, when the body had one. */
    readonly fireflyMessage: string | null = null,
  ) {
    super(message);
  }
}

export type Query = Record<string, string | number | boolean | undefined | null | string[]>;

export interface FireflyReader {
  get<T>(path: string, query?: Query): Promise<T>;
  /** Fetches every page of a list endpoint. */
  list<T>(path: string, query?: Query): Promise<FfResource<T>[]>;
  /** A single page, used by search where the UI drives pagination. */
  page<T>(path: string, query: Query, page: number, limit: number): Promise<FfList<T>>;
}

export interface FireflyWriter {
  post<T = unknown>(path: string, body: unknown): Promise<T>;
  put<T = unknown>(path: string, body: unknown): Promise<T>;
  /** Resolves with nothing: Firefly answers 204. */
  delete(path: string): Promise<void>;
}

const PAGE_SIZE = 500;
const PAGE_CONCURRENCY = 4;

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

/**
 * Firefly III API client. Reads and writes share one `request()` so authentication, the 401 retry
 * and error parsing live in a single place. Only a 401 is ever retried (the request was rejected
 * before doing anything): a timeout or network error on a write might have been applied, so it
 * surfaces instead of risking a duplicate.
 */
export class FireflyClient implements FireflyReader, FireflyWriter {
  constructor(
    private readonly baseUrl: string,
    private readonly tokens: TokenProvider,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  get<T>(path: string, query: Query = {}): Promise<T> {
    return this.request<T>('GET', path, { query });
  }

  post<T = unknown>(path: string, body: unknown): Promise<T> {
    return this.request<T>('POST', path, { body });
  }

  put<T = unknown>(path: string, body: unknown): Promise<T> {
    return this.request<T>('PUT', path, { body });
  }

  async delete(path: string): Promise<void> {
    await this.request<undefined>('DELETE', path);
  }

  async request<T>(method: Method, path: string, opts: { query?: Query; body?: unknown } = {}): Promise<T> {
    const url = this.buildUrl(path, opts.query ?? {});
    const body = opts.body === undefined ? undefined : JSON.stringify(opts.body);
    let token = await this.tokens.accessToken();
    let res = await this.send(method, url, token, body);
    if (res.status === 401) {
      const refreshed = await this.tokens.refresh();
      if (!refreshed) throw new FireflyError(401, path, 'Firefly session expired');
      token = refreshed;
      res = await this.send(method, url, token, body);
    }
    const text = await res.text().catch(() => '');
    if (!res.ok) throw toError(res.status, method, path, text);
    if (res.status === 204 || !text.trim()) return undefined as T;
    return JSON.parse(text) as T;
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

  async page<T>(path: string, query: Query, page: number, limit: number): Promise<FfList<T>> {
    return this.get<FfList<T>>(path, { ...query, page, limit });
  }

  private send(method: Method, url: string, token: string, body: string | undefined): Promise<Response> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.api+json, application/json',
    };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    return this.fetchImpl(url, { method, headers, body, signal: AbortSignal.timeout(30_000) });
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

function toError(status: number, method: Method, path: string, text: string): FireflyError {
  let errors: Record<string, string[]> = {};
  let message: string | null = null;
  try {
    const json = JSON.parse(text) as { message?: unknown; errors?: unknown };
    if (typeof json.message === 'string') message = json.message;
    if (json.errors && typeof json.errors === 'object') {
      errors = Object.fromEntries(
        Object.entries(json.errors as Record<string, unknown>).map(([k, v]) => [k, (Array.isArray(v) ? v : [v]).map(String)]),
      );
    }
  } catch {
    /* not JSON */
  }
  return new FireflyError(status, path, `Firefly ${status} on ${method} ${path}: ${text.slice(0, 300)}`, errors, message);
}
