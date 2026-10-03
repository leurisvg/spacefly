import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { accountKind, amountSide, inferTransactionType, isPositiveAmount, parseAmount, type AccountSlot } from '@shared';
import { Cache } from '../src/core/cache';
import { FireflyClient, FireflyError, type TokenProvider } from '../src/firefly/firefly.client';
import { translateFields } from '../src/routes/errors';
import { createApp } from '../src/app';
import type { Services } from '../src/app.types';
import { Sealer } from '../src/auth/crypto';
import { SessionStore } from '../src/auth/session.store';
import { loadConfig } from '../src/config';
import { SettingsStore } from '../src/core/settings.store';
import { openDb } from '../src/db/sqlite';
import { fakeFirefly } from './fixtures/firefly-fixture';

describe('inferTransactionType', () => {
  const cases: [AccountSlot, AccountSlot, string | null][] = [
    ['asset', 'asset', 'transfer'],
    ['asset', 'expense', 'withdrawal'],
    ['asset', 'cash', 'withdrawal'],
    ['asset', 'liability', 'withdrawal'],
    ['asset', 'revenue', null],
    ['revenue', 'asset', 'deposit'],
    ['revenue', 'liability', 'deposit'],
    ['revenue', 'expense', null],
    ['revenue', 'revenue', null],
    ['cash', 'asset', 'deposit'],
    ['cash', 'liability', 'deposit'],
    ['cash', 'expense', null],
    ['liability', 'asset', 'deposit'],
    ['liability', 'liability', 'transfer'],
    ['liability', 'expense', 'withdrawal'],
    ['liability', 'revenue', null],
    ['expense', 'asset', null],
    ['expense', 'expense', null],
    ['new', 'asset', 'deposit'],
    ['new', 'liability', 'deposit'],
    ['new', 'expense', null],
    ['asset', 'new', 'withdrawal'],
    ['liability', 'new', 'withdrawal'],
    ['revenue', 'new', null],
    ['new', 'new', null],
    [null, 'asset', null],
    ['asset', null, null],
  ];
  it.each(cases)('%s → %s = %s', (from, to, expected) => {
    expect(inferTransactionType(from, to)).toBe(expected);
  });

  it('accepts both spellings of account types', () => {
    expect(accountKind('Asset account')).toBe('asset');
    expect(accountKind('asset')).toBe('asset');
    expect(accountKind('Expense account')).toBe('expense');
    expect(accountKind('Revenue account')).toBe('revenue');
    expect(accountKind('Cash account')).toBe('cash');
    for (const t of ['Loan', 'Debt', 'Mortgage', 'liabilities', 'liability']) expect(accountKind(t)).toBe('liability');
    expect(accountKind('Initial balance account')).toBeNull();
    expect(accountKind(undefined)).toBeNull();
  });

  it('puts the amount on the right side', () => {
    expect(amountSide('withdrawal')).toBe('source');
    expect(amountSide('deposit')).toBe('destination');
    expect(amountSide('transfer')).toBe('source');
  });
});

describe('parseAmount', () => {
  it.each([
    ['1,234.56', '.', '1234.56'],
    ['1234,5', '.', '1234.5'],
    ['1.234,56', ',', '1234.56'],
    ['1.234,56', '.', '1234.56'],
    ['1,234', '.', '1234'],
    ['1,234', ',', '1.234'],
    ['1.234', ',', '1234'],
    ['1.234', '.', '1.234'],
    ['1.234.567', '.', '1234567'],
    ['1,234,567.8', '.', '1234567.8'],
    ['12', '.', '12'],
    ['0.5', '.', '0.5'],
    ['.5', '.', '0.5'],
    ['007.50', '.', '7.50'],
    [' 1 234,50 ', ',', '1234.50'],
    ['-12.5', '.', '-12.5'],
    ['-0', '.', '0'],
  ] as const)('%s (%s) → %s', (input, decimal, expected) => {
    expect(parseAmount(input, decimal)).toBe(expected);
  });

  it.each(['', 'abc', '1.2.3,4,5', '12,34,56', '1,23.4', '--1', '1e5', '.', ','])('rejects %j', (input) => {
    expect(parseAmount(input)).toBeNull();
  });

  it('checks positivity on canonical strings', () => {
    expect(isPositiveAmount('10.50')).toBe(true);
    expect(isPositiveAmount('0')).toBe(false);
    expect(isPositiveAmount('-1')).toBe(false);
    expect(isPositiveAmount('1,5')).toBe(false);
    expect(isPositiveAmount(null)).toBe(false);
  });
});

describe('FireflyClient', () => {
  const tokens = (over: Partial<TokenProvider> = {}): TokenProvider => ({
    accessToken: async () => 'old',
    refresh: async () => 'new',
    ...over,
  });
  const reply = (status: number, body?: unknown) =>
    new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  it('sends method, JSON body and bearer token', async () => {
    const fetchMock = vi.fn(async () => reply(200, { data: 1 }));
    const client = new FireflyClient('http://ff', tokens(), fetchMock as unknown as typeof fetch);
    await client.post('/v1/categories', { name: 'Comida' });
    await client.put('/v1/categories/1', { name: 'X' });
    await client.delete('/v1/categories/1');
    const calls = fetchMock.mock.calls as unknown as [string, RequestInit][];
    expect(calls.map(([u, i]) => [i.method, u])).toEqual([
      ['POST', 'http://ff/api/v1/categories'],
      ['PUT', 'http://ff/api/v1/categories/1'],
      ['DELETE', 'http://ff/api/v1/categories/1'],
    ]);
    expect(calls[0]![1].body).toBe('{"name":"Comida"}');
    expect((calls[0]![1].headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect((calls[0]![1].headers as Record<string, string>)['Authorization']).toBe('Bearer old');
    expect(calls[2]![1].body).toBeUndefined();
  });

  it('retries a 401 once with a refreshed token and the same body', async () => {
    const fetchMock = vi.fn(async (_u: string, init: RequestInit) =>
      (init.headers as Record<string, string>)['Authorization'] === 'Bearer new' ? reply(200, { ok: true }) : reply(401, { message: 'Unauthenticated.' }),
    );
    const client = new FireflyClient('http://ff', tokens(), fetchMock as unknown as typeof fetch);
    await expect(client.post('/v1/tags', { tag: 'a' })).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]![1].body).toBe('{"tag":"a"}');
  });

  it('gives up when the session cannot be refreshed', async () => {
    const client = new FireflyClient('http://ff', tokens({ refresh: async () => null }), (async () => reply(401, {})) as unknown as typeof fetch);
    await expect(client.get('/v1/about')).rejects.toMatchObject({ status: 401 });
  });

  it('returns undefined for 204 and empty bodies', async () => {
    const client = new FireflyClient('http://ff', tokens(), (async () => reply(204)) as unknown as typeof fetch);
    await expect(client.delete('/v1/tags/1')).resolves.toBeUndefined();
    await expect(client.put('/v1/tags/1', {})).resolves.toBeUndefined();
  });

  it('exposes the errors of a 422', async () => {
    const body = { message: 'The given data was invalid.', errors: { 'transactions.0.amount': ['bad'], name: 'oops' } };
    const client = new FireflyClient('http://ff', tokens(), (async () => reply(422, body)) as unknown as typeof fetch);
    const err = (await client.post('/v1/transactions', {}).catch((e: unknown) => e)) as FireflyError;
    expect(err).toBeInstanceOf(FireflyError);
    expect(err.status).toBe(422);
    expect(err.fireflyMessage).toBe('The given data was invalid.');
    expect(err.errors).toEqual({ 'transactions.0.amount': ['bad'], name: ['oops'] });
  });

  it('never retries a write on a server error or a network failure', async () => {
    const serverError = vi.fn(async () => reply(500, { message: 'boom' }));
    await expect(new FireflyClient('http://ff', tokens(), serverError as unknown as typeof fetch).post('/v1/transactions', {})).rejects.toMatchObject({ status: 500 });
    expect(serverError).toHaveBeenCalledTimes(1);
    const network = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    await expect(new FireflyClient('http://ff', tokens(), network as unknown as typeof fetch).post('/v1/transactions', {})).rejects.toThrow('fetch failed');
    expect(network).toHaveBeenCalledTimes(1);
  });
});

describe('error field translation', () => {
  it('maps Firefly field names to DTO fields', () => {
    expect(
      translateFields({
        'transactions.0.source_id': ['a'],
        'transactions.0.source_name': ['b'],
        'transactions.0.destination_name': ['c'],
        'transactions.0.foreign_amount': ['d'],
        'transactions.0.category_name': ['e'],
        'transactions.0.bill_id': ['f'],
        'transactions.0.tags.1': ['g'],
        amount_min: ['h'],
        'accounts.0.current_amount': ['i'],
      }),
    ).toEqual({
      source: ['a', 'b'],
      destination: ['c'],
      foreignAmount: ['d'],
      category: ['e'],
      billId: ['f'],
      tags: ['g'],
      amountMin: ['h'],
      accounts: ['i'],
    });
  });
});

describe('Cache', () => {
  const deferred = <T>() => {
    let resolve!: (v: T) => void;
    const promise = new Promise<T>((r) => (resolve = r));
    return { promise, resolve };
  };

  it('does not store a fetch that started before an invalidation', async () => {
    const cache = new Cache(null);
    const old = deferred<string>();
    const first = cache.wrap('u:1:tx:2026-09', 60, () => old.promise);
    cache.deletePrefix('u:1:');
    old.resolve('stale');
    await expect(first).resolves.toBe('stale');
    expect(cache.get('u:1:tx:2026-09')).toBeUndefined();
    // The next reader fetches fresh data instead of joining the stale in-flight promise.
    await expect(cache.wrap('u:1:tx:2026-09', 60, async () => 'fresh')).resolves.toBe('fresh');
    expect(cache.get('u:1:tx:2026-09')).toBe('fresh');
  });

  it('keeps unrelated in-flight fetches and entries', async () => {
    const cache = new Cache(null);
    cache.set('u:2:x', 1, 60);
    const slow = deferred<string>();
    const other = cache.wrap('u:2:y', 60, () => slow.promise);
    cache.deletePrefix('u:1:');
    slow.resolve('kept');
    await other;
    expect(cache.get('u:2:x')).toBe(1);
    expect(cache.get('u:2:y')).toBe('kept');
  });

  it('does not let a stale fetch clear a newer in-flight one', async () => {
    const cache = new Cache(null);
    const old = deferred<string>();
    const fresh = deferred<string>();
    const a = cache.wrap('k:1', 60, () => old.promise);
    cache.deletePrefix('k:');
    const b = cache.wrap('k:1', 60, () => fresh.promise);
    old.resolve('old');
    await a;
    const joined = cache.wrap('k:1', 60, async () => 'third');
    fresh.resolve('fresh');
    await expect(joined).resolves.toBe('fresh');
    await b;
  });
});

describe('write protection', () => {
  function build() {
    const config = loadConfig({
      NODE_ENV: 'test',
      APP_URL: 'https://spacefly.example.com',
      FIREFLY_INTERNAL_URL: 'http://firefly:8080',
      FIREFLY_PUBLIC_URL: 'https://firefly.example.com',
      FIREFLY_OAUTH_CLIENT_ID: '7',
      SESSION_SECRET: 's'.repeat(40),
      CF_ACCESS_ENABLED: 'false',
      FX_FALLBACK_PROVIDER: 'none',
      DATA_DIR: ':memory:',
      STATIC_DIR: '/nonexistent',
    });
    const db = openDb(':memory:');
    const sealer = new Sealer(config.SESSION_SECRET);
    const s: Services = {
      config,
      db,
      sealer,
      cache: new Cache(db),
      sessions: new SessionStore(db, sealer, 86_400_000),
      settings: new SettingsStore(db),
      fetch: fakeFirefly(),
    };
    return createApp(s);
  }
  const json = { 'Content-Type': 'application/json', 'X-SpaceFly': '1' };

  it('rejects writes without the X-SpaceFly header', async () => {
    const res = await build().request('/api/refresh', { method: 'POST' });
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: 'forbidden' });
    expect((await build().request('/auth/logout', { method: 'POST' })).status).toBe(403);
  });

  it('rejects a foreign Origin or a cross-site fetch', async () => {
    const app = build();
    expect((await app.request('/api/refresh', { method: 'POST', headers: { ...json, Origin: 'https://firefly.example.com' } })).status).toBe(403);
    expect((await app.request('/api/refresh', { method: 'POST', headers: { ...json, 'Sec-Fetch-Site': 'same-site' } })).status).toBe(403);
    // Same origin passes the guard (and then needs a session).
    const ok = await app.request('/api/refresh', { method: 'POST', headers: { ...json, Origin: 'https://spacefly.example.com', 'Sec-Fetch-Site': 'same-origin' } });
    expect(ok.status).toBe(401);
  });

  it('requires a JSON content type when there is a body', async () => {
    const app = build();
    const res = await app.request('/api/settings', { method: 'PUT', headers: { 'X-SpaceFly': '1', 'Content-Type': 'text/plain' }, body: '{}' });
    expect(res.status).toBe(415);
    const form = await app.request('/api/settings', { method: 'PUT', headers: { 'X-SpaceFly': '1', 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'a=1' });
    expect(form.status).toBe(415);
  });

  it('rejects bodies over 64 KB', async () => {
    const res = await build().request('/api/settings', { method: 'PUT', headers: json, body: JSON.stringify({ x: 'a'.repeat(70 * 1024) }) });
    expect(res.status).toBe(413);
  });

  it('leaves GET requests alone', async () => {
    const res = await build().request('/api/me');
    expect(res.status).toBe(401);
  });
});

describe('i18n', () => {
  const flatten = (o: unknown, prefix = ''): string[] =>
    o && typeof o === 'object'
      ? Object.entries(o).flatMap(([k, v]) => flatten(v, prefix ? `${prefix}.${k}` : k))
      : [prefix];
  const load = (lang: string) => JSON.parse(readFileSync(new URL(`../../public/i18n/${lang}.json`, import.meta.url), 'utf8')) as unknown;

  it('has the same keys in es and en', () => {
    const es = new Set(flatten(load('es')));
    const en = new Set(flatten(load('en')));
    expect([...es].filter((k) => !en.has(k))).toEqual([]);
    expect([...en].filter((k) => !es.has(k))).toEqual([]);
  });
});
