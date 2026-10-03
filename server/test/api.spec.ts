import { describe, expect, it } from 'vitest';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import type { MonthlyReport, Report, SankeyReport, TxListResponse } from '@shared';
import { createApp } from '../src/app';
import type { Services } from '../src/app.types';
import { Sealer } from '../src/auth/crypto';
import { SessionStore } from '../src/auth/session.store';
import { loadConfig } from '../src/config';
import { Cache } from '../src/core/cache';
import { SettingsStore } from '../src/core/settings.store';
import { openDb } from '../src/db/sqlite';
import { fakeFirefly, type FakeFireflyLog } from './fixtures/firefly-fixture';

const baseEnv = {
  NODE_ENV: 'test',
  APP_URL: 'https://spacefly.example.com',
  FIREFLY_INTERNAL_URL: 'http://firefly:8080',
  FIREFLY_PUBLIC_URL: 'https://firefly.example.com',
  FIREFLY_OAUTH_CLIENT_ID: '7',
  FIREFLY_OAUTH_CLIENT_SECRET: 'client-secret',
  SESSION_SECRET: 's'.repeat(40),
  CF_ACCESS_ENABLED: 'false',
  FX_FALLBACK_PROVIDER: 'none',
  DATA_DIR: ':memory:',
  STATIC_DIR: '/nonexistent',
};

function setup(env: Record<string, string> = {}, fetchImpl?: typeof fetch) {
  const log: FakeFireflyLog = { methods: [], paths: [] };
  const config = loadConfig({ ...baseEnv, ...env });
  const db = openDb(':memory:');
  const sealer = new Sealer(config.SESSION_SECRET);
  const s: Services = {
    config,
    db,
    sealer,
    cache: new Cache(db),
    sessions: new SessionStore(db, sealer, 86_400_000),
    settings: new SettingsStore(db),
    fetch: fetchImpl ?? fakeFirefly(log),
  };
  return { app: createApp(s), s, log };
}

/** Full OAuth round-trip against the fake Firefly; returns the session cookie. */
async function login(app: ReturnType<typeof setup>['app'], headers: Record<string, string> = {}) {
  const start = await app.request('/auth/login?returnTo=/reports/monthly', { headers });
  expect(start.status).toBe(302);
  const authorize = new URL(start.headers.get('location')!);
  expect(authorize.origin + authorize.pathname).toBe('https://firefly.example.com/oauth/authorize');
  expect(authorize.searchParams.get('code_challenge_method')).toBe('S256');
  expect(authorize.searchParams.get('redirect_uri')).toBe('https://spacefly.example.com/auth/callback');
  const oauthCookie = start.headers.get('set-cookie')!.split(';')[0];
  const cb = await app.request(`/auth/callback?code=abc&state=${authorize.searchParams.get('state')}`, {
    headers: { ...headers, cookie: oauthCookie },
  });
  expect(cb.status).toBe(302);
  expect(cb.headers.get('location')).toBe('/reports/monthly');
  const cookies = cb.headers.getSetCookie();
  const session = cookies.find((c) => c.startsWith('sf_session='))!;
  expect(session).toMatch(/HttpOnly/i);
  expect(session).toMatch(/Secure/i);
  expect(session).toMatch(/SameSite=Lax/i);
  return session.split(';')[0];
}

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
    expect((await app.request('/auth/logout', { method: 'POST', headers: { cookie } })).status).toBe(204);
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
  it('serves the monthly report and only issues GET requests to the Firefly API', async () => {
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
      headers: { cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ excludedAccounts: ['2'], balanceMonths: 12, sankeyThreshold: 0.05 }),
    });
    expect(put.status).toBe(200);
    const res = await app.request('/api/reports/savings?start=2026-09-01&end=2026-09-30', { headers: { cookie } });
    const body = (await res.json()) as Report<{ months: string[]; accounts: { name: string }[] }>;
    expect(body.data.months).toHaveLength(12);
    expect(body.data.accounts.map((a) => a.name)).toEqual(['Banco Popular']);
  });
});
