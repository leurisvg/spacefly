import { describe, expect, it } from 'vitest';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import type { AccountDetailReport, CounterpartiesReport, CounterpartyDetailReport, MonthlyReport, Report, SankeyReport, TxListResponse } from '@shared';
import { login, setup } from './harness';

describe('auth', () => {
  it('rejects API calls without a session', async () => {
    const { app } = setup();
    const res = await app.request('/api/me');
    expect(res.status).toBe(401);
  });

  it('logs in with OAuth + PKCE and never exposes the Firefly token', async () => {
    const { app, s } = setup();
    const cookie = await login(app);
    expect(cookie).not.toContain('test-token');
    const me = await app.request('/api/me', { headers: { cookie } });
    expect(await me.json()).toMatchObject({ authenticated: true, email: 'leurisvg003@gmail.com' });
    // Tokens are encrypted at rest.
    const row = s.db.prepare('SELECT tokens FROM sessions').get() as { tokens: string };
    expect(row.tokens).not.toContain('test-token');
  });

  it('rejects a callback with a wrong state', async () => {
    const { app } = setup();
    const start = await app.request('/auth/login');
    const oauthCookie = start.headers.get('set-cookie')!.split(';')[0];
    const cb = await app.request('/auth/callback?code=abc&state=wrong', { headers: { cookie: oauthCookie } });
    expect(cb.headers.get('location')).toBe('/login?error=invalid_state');
  });

  it('only accepts relative returnTo paths', async () => {
    const { app } = setup({ NODE_ENV: 'development', DEV_FIREFLY_TOKEN: 'test-token' });
    const res = await app.request('/auth/login?returnTo=//evil.com');
    expect(res.headers.get('location')).toBe('/');
  });

  it('logs out and invalidates the session', async () => {
    const { app } = setup();
    const cookie = await login(app);
    expect((await app.request('/auth/logout', { method: 'POST', headers: { cookie, 'X-SpaceFly': '1' } })).status).toBe(204);
    expect((await app.request('/api/me', { headers: { cookie } })).status).toBe(401);
  });
});

describe('Cloudflare Access', () => {
  it('returns 403 without a valid Access JWT and accepts a signed one', async () => {
    const { publicKey, privateKey } = await generateKeyPair('RS256');
    const jwk = { ...(await exportJWK(publicKey)), kid: 'k1', alg: 'RS256' };
    const certs = new Response(JSON.stringify({ keys: [jwk] }), { headers: { 'Content-Type': 'application/json' } });
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async (input: string | URL | Request) =>
      String(input).includes('/cdn-cgi/access/certs') ? certs.clone() : realFetch(input)) as typeof fetch;
    try {
      const { app } = setup({
        CF_ACCESS_ENABLED: 'true',
        CF_ACCESS_TEAM_DOMAIN: 'team.cloudflareaccess.com',
        CF_ACCESS_AUD: 'aud-123',
        CF_ACCESS_ALLOWED_EMAILS: 'leurisvg003@gmail.com',
      });
      expect((await app.request('/api/me')).status).toBe(403);
      expect((await app.request('/')).status).toBe(403);
      expect((await app.request('/healthz')).status).toBe(200);

      const sign = (email: string, aud = 'aud-123') =>
        new SignJWT({ email })
          .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
          .setIssuer('https://team.cloudflareaccess.com')
          .setAudience(aud)
          .setExpirationTime('5m')
          .sign(privateKey);

      const ok = await app.request('/api/me', { headers: { 'Cf-Access-Jwt-Assertion': await sign('leurisvg003@gmail.com') } });
      expect(ok.status).toBe(401); // passes CF Access, then needs a SpaceFly session
      const wrongEmail = await app.request('/api/me', { headers: { 'Cf-Access-Jwt-Assertion': await sign('other@example.com') } });
      expect(wrongEmail.status).toBe(403);
      const wrongAud = await app.request('/api/me', { headers: { 'Cf-Access-Jwt-Assertion': await sign('leurisvg003@gmail.com', 'x') } });
      expect(wrongAud.status).toBe(403);
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});

describe('reports API', () => {
  it('serves the monthly report; reports only issue GET requests to the Firefly API', async () => {
    const { app, log } = setup();
    const cookie = await login(app);
    const res = await app.request('/api/reports/monthly?start=2026-09-01&end=2026-09-30', { headers: { cookie } });
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    const body = (await res.json()) as Report<MonthlyReport>;
    expect(body.meta.currency).toBe('DOP');
    expect(body.data.kpis.earned).toBe(150500);
    expect(body.data.kpis.spent).toBeCloseTo(21425.39, 2);
    expect(body.data.kpis.savingsRate).toBeCloseTo(85.8, 1);
    expect(body.data.budgets.map((b) => b.name)).toEqual(['Hogar', 'Ocio']);
    expect(body.data.savings.months).toHaveLength(6);
    expect(body.data.savings.accounts.map((a) => a.name)).toEqual(['Banco Popular', 'Cuenta USD']);

    const apiCalls = log.paths.map((p, i) => [p, log.methods[i]]).filter(([p]) => p!.startsWith('/api/'));
    expect(apiCalls.length).toBeGreaterThan(0);
    expect(apiCalls.every(([, m]) => m === 'GET')).toBe(true);
  });

  it('converts to USD with the rates stored in Firefly', async () => {
    const { app } = setup();
    const cookie = await login(app);
    const res = await app.request('/api/reports/sankey?start=2026-09-01&end=2026-09-30&currency=USD', { headers: { cookie } });
    const body = (await res.json()) as Report<SankeyReport>;
    expect(body.meta.currency).toBe('USD');
    expect(body.data.totalIncome).toBeCloseTo(120000 / 61 + 500, 1);
  });

  it('returns filtered transactions for drill-downs', async () => {
    const { app } = setup();
    const cookie = await login(app);
    const res = await app.request('/api/transactions?start=2026-09-01&end=2026-09-30&category=2', { headers: { cookie } });
    const body = (await res.json()) as Report<TxListResponse>;
    expect(body.data.rows.map((r) => r.description)).toEqual(['Compra rápida', 'Compra quincenal']);
    expect(body.data.totals.expense).toBe(12700);
  });

  it('returns the transactions of several categories at once (the dashboard "others" drill-down)', async () => {
    const { app } = setup();
    const cookie = await login(app);
    const one = await app.request('/api/transactions?start=2026-09-01&end=2026-09-30&type=withdrawal&category=2', { headers: { cookie } });
    const two = await app.request('/api/transactions?start=2026-09-01&end=2026-09-30&type=withdrawal&categories=2,none', { headers: { cookie } });
    const a = ((await one.json()) as Report<TxListResponse>).data;
    const b = ((await two.json()) as Report<TxListResponse>).data;
    expect(b.rows.length).toBeGreaterThan(a.rows.length); // category 2 plus the uncategorized withdrawals
    expect(b.rows.map((r) => r.description)).toEqual(expect.arrayContaining(['Compra rápida', 'Almuerzo']));
    expect(b.totals.expense).toBeGreaterThan(a.totals.expense);
  });

  it('answers every report endpoint', async () => {
    const { app } = setup();
    const cookie = await login(app);
    const q = 'start=2026-09-01&end=2026-09-30';
    for (const path of [
      `/api/meta`,
      `/api/reports/dashboard?${q}`,
      `/api/reports/calendar?${q}`,
      `/api/reports/calendar?${q}&account=1`,
      `/api/reports/calendar/year?year=2026`,
      `/api/reports/compare?aStart=2026-09-01&aEnd=2026-09-30&bStart=2026-08-01&bEnd=2026-08-31&groupBy=counterparty`,
      `/api/reports/annual?year=2026`,
      `/api/reports/ranking?${q}&by=tag`,
      `/api/reports/budgets?${q}`,
      `/api/reports/accounts?${q}`,
      `/api/reports/net-worth?${q}`,
      `/api/reports/savings?${q}`,
      `/api/reports/bills?${q}`,
      `/api/reports/recurrences`,
      `/api/reports/projection?days=90`,
      `/api/reports/piggy-banks`,
      `/api/settings`,
      `/api/lookups`,
    ]) {
      const res = await app.request(path, { headers: { cookie } });
      expect(res.status, `${path}: ${await res.clone().text()}`).toBe(200);
    }
  });

  it('details one asset account: balance walks back from the real closing balance', async () => {
    const { app } = setup();
    const cookie = await login(app);
    const res = await app.request('/api/reports/accounts/1?start=2026-09-01&end=2026-09-30', { headers: { cookie } });
    expect(res.status).toBe(200);
    const d = ((await res.json()) as Report<AccountDetailReport>).data;
    expect(d.account.name).toBe('Banco Popular');
    expect(d.closing).toBe(240000);
    expect(d.opening).toBe(138200);
    expect(d.totals).toMatchObject({ income: 120000, expense: 13200, transferOut: 5000, transferIn: 0, count: 5 });
    expect(d.days).toHaveLength(30);
    expect(d.days[0].balance).toBe(258200);
    expect(d.days.at(-1)!.balance).toBe(240000);
    // Records are newest first, each with the balance right after it.
    expect(d.rows[0]).toMatchObject({ description: 'Almuerzo', flow: -1200, balance: 240000 });
    expect(d.rows.at(-1)).toMatchObject({ flow: 120000, balance: 258200 });
    expect(d.rows.find((r) => r.type === 'transfer')!.flow).toBe(-5000);
    expect(d.months).toHaveLength(12);
    expect(d.topCategories[0]).toMatchObject({ name: 'Comida', value: 8500 });
    expect(d.byWeekday.reduce((a, b) => a + b, 0)).toBe(13200);
  });

  it('also gives amounts and balances in the account currency for a foreign account', async () => {
    const { app } = setup();
    const cookie = await login(app);
    const res = await app.request('/api/reports/accounts/2?start=2026-09-01&end=2026-09-30', { headers: { cookie } });
    const d = ((await res.json()) as Report<AccountDetailReport>).data;
    expect(d.account.currency).toBe('USD');
    expect(d.balanceOriginal).toBe(2900);
    expect(d.openingOriginal).toBe(2450);
    // Newest first: the USD 50 dinner, then the USD 500 freelance deposit, each with its balance in USD.
    expect(d.rows.map((r) => [r.flowOriginal, r.balanceOriginal])).toEqual([[-50, 2900], [500, 2950]]);
    expect(d.rows[0].flow).toBeCloseTo(-3050, 0);
    // Daily balance, monthly trend, weekdays and rankings come in USD too, ending on the real USD balance.
    expect(d.days.at(-1)!.balanceOriginal).toBe(2900);
    expect(d.days[0].balanceOriginal).toBe(d.openingOriginal);
    expect(d.months.at(-1)).toMatchObject({ incomeOriginal: 500, expenseOriginal: 50 });
    expect(d.byWeekdayOriginal.reduce((x, y) => x + y, 0)).toBe(50);
    expect(d.topMerchants.map((m) => m.valueOriginal)).toEqual([50]);
  });

  it('lists expense and revenue accounts with period, previous period and last activity', async () => {
    const { app } = setup();
    const cookie = await login(app);
    const get = async <T>(path: string) => ((await (await app.request(path, { headers: { cookie } })).json()) as Report<T>).data;
    const exp = await get<CounterpartiesReport>('/api/reports/counterparties?kind=expense&start=2026-09-01&end=2026-09-30');
    expect(exp.total).toBeCloseTo(21425.39, 2);
    expect(exp.items[0]).toMatchObject({ name: 'Supermercado Nacional', value: 12700, previous: 9000, count: 2, avg: 6350, lastDate: '2026-09-10' });
    expect(exp.items[0].share).toBeCloseTo(12700 / 21425.39, 4);
    expect(exp.items.map((i) => i.name)).toEqual(['Supermercado Nacional', 'Restaurante', 'Edenorte', 'Netflix']);
    expect(exp.months).toHaveLength(12);
    expect(exp.monthly.at(-1)).toBeCloseTo(21425.39, 2);

    // Accounts without activity in the period are still listed, last (Netflix has no August charge).
    const aug = await get<CounterpartiesReport>('/api/reports/counterparties?kind=expense&start=2026-08-01&end=2026-08-31');
    expect(aug.items.at(-1)).toMatchObject({ name: 'Netflix', value: 0, count: 0, lastDate: null });

    const inc = await get<CounterpartiesReport>('/api/reports/counterparties?kind=income&start=2026-09-01&end=2026-09-30');
    expect(inc.total).toBe(150500);
    expect(inc.items.map((i) => [i.name, i.value])).toEqual([['Empresa SRL', 120000], ['Freelance Inc', 30500]]);
  });

  it('details one expense account: totals, share, asset accounts used and records', async () => {
    const { app } = setup();
    const cookie = await login(app);
    const res = await app.request('/api/reports/counterparties/20?kind=expense&start=2026-09-01&end=2026-09-30', { headers: { cookie } });
    expect(res.status).toBe(200);
    const d = ((await res.json()) as Report<CounterpartyDetailReport>).data;
    expect(d.account.name).toBe('Supermercado Nacional');
    expect(d.totals).toMatchObject({ value: 12700, previous: 9000, count: 2, avg: 6350 });
    expect(d.totals.share).toBeCloseTo(12700 / 21425.39, 4);
    expect(d.days).toHaveLength(30);
    expect(d.topAccounts.map((a) => [a.name, a.value])).toEqual([['Banco Popular', 8500], ['Tarjeta Visa', 4200]]);
    expect(d.topCategories[0]).toMatchObject({ name: 'Comida', value: 12700 });
    expect(d.rows.map((r) => r.description)).toEqual(['Compra rápida', 'Compra quincenal']);
    expect(d.months.at(-1)).toMatchObject({ month: '2026-09', value: 12700, count: 2 });
    expect(d.byWeekday.reduce((a, b) => a + b, 0)).toBe(12700);
  });

  it('leaves payments to loans and other non-expense accounts out of the expense accounts', async () => {
    const loanPayment = {
      type: 'transactions',
      id: 'g900',
      attributes: {
        group_title: null,
        transactions: [
          {
            transaction_journal_id: '900',
            type: 'withdrawal',
            date: '2026-09-22T12:00:00-04:00',
            description: 'Cuota préstamo',
            amount: '18500.00',
            pc_amount: '18500.00',
            currency_code: 'DOP',
            source_id: '1',
            source_name: 'Banco Popular',
            source_type: 'Asset account',
            destination_id: '90',
            destination_name: 'Préstamo vehículo',
            destination_type: 'Loan',
            tags: [],
          },
        ],
      },
    };
    const { app } = setup({}, undefined, [loanPayment]);
    const cookie = await login(app);
    const res = await app.request('/api/reports/counterparties?kind=expense&start=2026-09-01&end=2026-09-30', { headers: { cookie } });
    const d = ((await res.json()) as Report<CounterpartiesReport>).data;
    expect(d.items.map((i) => i.id)).not.toContain('90');
    expect(d.total).toBeCloseTo(21425.39, 2);
    expect((await app.request('/api/reports/counterparties/90?kind=expense&start=2026-09-01&end=2026-09-30', { headers: { cookie } })).status).toBe(404);
  });

  it('does not mix expense and revenue accounts', async () => {
    const { app } = setup();
    const cookie = await login(app);
    // 10 is a revenue account.
    expect((await app.request('/api/reports/counterparties/10?kind=expense&start=2026-09-01&end=2026-09-30', { headers: { cookie } })).status).toBe(404);
    expect((await app.request('/api/reports/counterparties/10?kind=income&start=2026-09-01&end=2026-09-30', { headers: { cookie } })).status).toBe(200);
  });

  it('does not report on accounts that are not asset accounts', async () => {
    const { app } = setup();
    const cookie = await login(app);
    expect((await app.request('/api/reports/accounts/999?start=2026-09-01&end=2026-09-30', { headers: { cookie } })).status).toBe(404);
  });

  it('lists asset accounts in the order the user arranged them', async () => {
    const { app } = setup();
    const cookie = await login(app);
    const ids = async () =>
      (((await (await app.request('/api/reports/accounts?start=2026-09-01&end=2026-09-30', { headers: { cookie } })).json()) as Report<{ accounts: { id: string }[] }>).data.accounts).map((a) => a.id);
    expect(await ids()).toEqual(['1', '2', '3']); // by balance
    const put = await app.request('/api/settings/account-order', {
      method: 'PUT',
      headers: { cookie, 'content-type': 'application/json', 'x-spacefly': '1' },
      body: JSON.stringify({ order: ['3', '1'] }),
    });
    expect(put.status).toBe(200);
    expect(await ids()).toEqual(['3', '1', '2']); // listed first, the rest by balance
    // Saving the other settings keeps the order.
    const settings = (await (await app.request('/api/settings', { headers: { cookie } })).json()) as { settings: { accountOrder: string[] } };
    expect(settings.settings.accountOrder).toEqual(['3', '1']);
    await app.request('/api/settings/account-order', { method: 'PUT', headers: { cookie, 'content-type': 'application/json', 'x-spacefly': '1' }, body: JSON.stringify({ order: [] }) });
    expect(await ids()).toEqual(['1', '2', '3']);
  });

  it('validates input', async () => {
    const { app } = setup();
    const cookie = await login(app);
    const res = await app.request('/api/reports/monthly?start=2026-13-01', { headers: { cookie } });
    expect(res.status).toBe(400);
  });

  it('persists settings locally', async () => {
    const { app } = setup();
    const cookie = await login(app);
    const put = await app.request('/api/settings', {
      method: 'PUT',
      headers: { cookie, 'Content-Type': 'application/json', 'X-SpaceFly': '1' },
      body: JSON.stringify({ excludedAccounts: ['2'], balanceMonths: 12, sankeyThreshold: 0.05 }),
    });
    expect(put.status).toBe(200);
    const res = await app.request('/api/reports/savings?start=2026-09-01&end=2026-09-30', { headers: { cookie } });
    const body = (await res.json()) as Report<{ months: string[]; accounts: { name: string }[] }>;
    expect(body.data.months).toHaveLength(12);
    expect(body.data.accounts.map((a) => a.name)).toEqual(['Banco Popular']);
  });
});
