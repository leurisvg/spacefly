import { LRUCache } from 'lru-cache';
import type { Db } from '../db/sqlite';

/**
 * Two-level cache: in-memory LRU in front of SQLite so closed months survive restarts.
 * Values must be JSON-serialisable.
 */
export class Cache {
  private readonly memory = new LRUCache<string, { value: unknown; expiresAt: number }>({ max: 500 });
  private readonly inflight = new Map<string, Promise<unknown>>();
  /** Bumped on every `deletePrefix`; a fetch that started before a matching invalidation must not store its result. */
  private seq = 0;
  private readonly invalidations: { prefix: string; seq: number }[] = [];

  constructor(private readonly db: Db | null) {}

  get<T>(key: string): T | undefined {
    const now = Date.now();
    const mem = this.memory.get(key);
    if (mem) {
      if (mem.expiresAt > now) return mem.value as T;
      this.memory.delete(key);
    }
    if (!this.db) return undefined;
    const row = this.db.prepare('SELECT value, expires_at FROM cache WHERE key = ?').get(key) as
      | { value: string; expires_at: number }
      | undefined;
    if (!row) return undefined;
    if (row.expires_at <= now) {
      this.db.prepare('DELETE FROM cache WHERE key = ?').run(key);
      return undefined;
    }
    const value = JSON.parse(row.value) as T;
    this.memory.set(key, { value, expiresAt: row.expires_at });
    return value;
  }

  set(key: string, value: unknown, ttlSeconds: number, persist = true): void {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.memory.set(key, { value, expiresAt });
    if (persist && this.db) {
      this.db
        .prepare('INSERT OR REPLACE INTO cache (key, value, expires_at) VALUES (?, ?, ?)')
        .run(key, JSON.stringify(value), expiresAt);
    }
  }

  /** Get-or-compute with request coalescing, so concurrent reports share one Firefly fetch. */
  async wrap<T>(key: string, ttlSeconds: number, compute: () => Promise<T>, persist = true): Promise<T> {
    const hit = this.get<T>(key);
    if (hit !== undefined) return hit;
    const pending = this.inflight.get(key);
    if (pending) return pending as Promise<T>;
    const startedAt = this.seq;
    const p: Promise<T> = compute()
      .then((value) => {
        if (!this.invalidatedSince(key, startedAt)) this.set(key, value, ttlSeconds, persist);
        return value;
      })
      .finally(() => {
        if (this.inflight.get(key) === p) this.inflight.delete(key);
      });
    this.inflight.set(key, p);
    return p;
  }

  /** Drops every entry under `prefix`, including fetches still in flight (their result would be stale). */
  deletePrefix(prefix: string): void {
    this.invalidations.push({ prefix, seq: ++this.seq });
    if (this.invalidations.length > 256) this.invalidations.shift();
    for (const key of this.memory.keys()) if (key.startsWith(prefix)) this.memory.delete(key);
    for (const key of this.inflight.keys()) if (key.startsWith(prefix)) this.inflight.delete(key);
    this.db?.prepare('DELETE FROM cache WHERE key >= ? AND key < ?').run(prefix, prefix + '\uffff');
  }

  private invalidatedSince(key: string, seq: number): boolean {
    return this.invalidations.some((i) => i.seq > seq && key.startsWith(i.prefix));
  }

  purgeExpired(): void {
    this.db?.prepare('DELETE FROM cache WHERE expires_at < ?').run(Date.now());
  }
}
