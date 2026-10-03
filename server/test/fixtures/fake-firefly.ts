/**
 * A `fetch` implementation that answers like Firefly III (v1 API, GET only + /oauth/token)
 * from an in-memory dataset. Used by the tests and by the local mock server
 * (`npm run dev:mock`). Paginates like Firefly so the client's paging is exercised.
 */

type Resource = { type: string; id: string; attributes: Record<string, unknown> };

export interface FakeDataset {
  version: string;
  email: string;
  token: string;
  primary: { code: string; name: string; symbol: string };
  currencies: { code: string; name: string; symbol: string }[];
  groups: Resource[];
  rates: Record<string, unknown>[];
  accountsAt: (type: string, date: string) => Resource[];
  categories: [string, string][];
  tags: string[];
  budgets: Resource[];
  limits: (start: string, end: string) => Resource[];
  available?: (start: string, end: string) => Resource[];
  bills: (start: string, end: string) => Resource[];
  recurrences: Resource[];
  piggyBanks: Resource[];
  piggyEvents?: Record<string, Record<string, unknown>[]>;
}

export interface FakeFireflyLog {
  methods: string[];
  paths: string[];
}

function page(data: unknown[], q: URLSearchParams) {
  const limit = Math.min(Number(q.get('limit') ?? 50) || 50, 500);
  const current = Math.max(Number(q.get('page') ?? 1) || 1, 1);
  const total = data.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    data: data.slice((current - 1) * limit, current * limit),
    meta: { pagination: { total, count: Math.min(limit, total), per_page: limit, current_page: current, total_pages: totalPages } },
  };
}

export function createFakeFirefly(ds: FakeDataset, log: FakeFireflyLog = { methods: [], paths: [] }): typeof fetch {
  return (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    const method = init?.method ?? 'GET';
    log.methods.push(method);
    log.paths.push(url.pathname);
    const json = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

    if (url.pathname === '/oauth/token' && method === 'POST') {
      return json({ access_token: ds.token, refresh_token: 'refresh', expires_in: 3600 });
    }
    const auth = new Headers(init?.headers).get('authorization');
    if (url.pathname.startsWith('/api/') && auth !== `Bearer ${ds.token}`) return json({ message: 'Unauthenticated.' }, 401);
    if (method !== 'GET') return json({ message: 'read-only mock' }, 405);

    const p = url.pathname.replace(/^\/api/, '');
    const q = url.searchParams;
    const start = q.get('start') ?? '0000-01-01';
    const end = q.get('end') ?? '9999-12-31';
    const currency = (c: { code: string; name: string; symbol: string }, i: number) => ({
      type: 'currencies',
      id: String(i + 1),
      attributes: { ...c, decimal_places: 2, enabled: true, primary: c.code === ds.primary.code },
    });

    if (p === '/v1/about') return json({ data: { version: ds.version, api_version: ds.version, php_version: '8.4', os: 'Linux', driver: 'mysql' } });
    if (p === '/v1/about/user') return json({ data: { type: 'users', id: '1', attributes: { email: ds.email } } });
    if (p === '/v1/currencies/primary') return json({ data: currency(ds.primary, 0) });
    if (p === '/v1/currencies') return json(page(ds.currencies.map(currency), q));
    if (p === '/v1/exchange-rates') return json(page(ds.rates.map((r, i) => ({ type: 'currency_exchange_rates', id: String(i + 1), attributes: r })), q));
    if (p === '/v1/transactions') {
      const type = q.get('type') ?? 'all';
      const rows = ds.groups.filter((g) => {
        const t = (g.attributes['transactions'] as Record<string, unknown>[])[0];
        const d = String(t['date']).slice(0, 10);
        return d >= start && d <= end && (type === 'all' || t['type'] === type);
      });
      return json(page(rows, q));
    }
    if (p === '/v1/search/transactions') {
      const needle = (q.get('query') ?? '').toLowerCase();
      const rows = ds.groups.filter((g) =>
        (g.attributes['transactions'] as Record<string, unknown>[]).some((t) => String(t['description']).toLowerCase().includes(needle)),
      );
      return json(page(rows, q));
    }
    if (p === '/v1/accounts') return json(page(ds.accountsAt(q.get('type') ?? 'all', q.get('date') ?? end), q));
    if (p === '/v1/categories') return json(page(ds.categories.map(([id, name]) => ({ type: 'categories', id, attributes: { name } })), q));
    if (p === '/v1/tags') return json(page(ds.tags.map((tag, i) => ({ type: 'tags', id: String(i + 1), attributes: { tag } })), q));
    if (p === '/v1/budgets') return json(page(ds.budgets, q));
    if (p === '/v1/budget-limits') return json({ data: ds.limits(start, end) });
    if (p === '/v1/available-budgets') return json(page(ds.available?.(start, end) ?? [], q));
    if (p === '/v1/bills') return json(page(ds.bills(start, end), q));
    if (p === '/v1/recurrences') return json(page(ds.recurrences, q));
    if (p === '/v1/piggy-banks') return json(page(ds.piggyBanks, q));
    const ev = p.match(/^\/v1\/piggy-banks\/([^/]+)\/events$/);
    if (ev) return json(page((ds.piggyEvents?.[ev[1]] ?? []).map((a, i) => ({ type: 'piggy_bank_events', id: String(i), attributes: a })), q));
    return json({ message: `not mocked: ${p}` }, 404);
  }) as typeof fetch;
}
