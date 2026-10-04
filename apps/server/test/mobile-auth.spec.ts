import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setup } from './harness';

const REDIRECT = 'spacefly://auth/callback';
const env = { MOBILE_REDIRECT_URIS: REDIRECT };

const b64url = (buf: Buffer) => buf.toString('base64url');
const verifier = 'v'.repeat(64);
const challengeOf = (v: string) => b64url(createHash('sha256').update(v).digest());

type App = ReturnType<typeof setup>['app'];

const startUrl = (over: Record<string, string> = {}) => {
  const q = new URLSearchParams({ redirect_uri: REDIRECT, code_challenge: challengeOf(verifier), state: 'app-state', ...over });
  return `/auth/mobile/login?${q}`;
};

/** The app side: browser to /auth/mobile/login, Firefly consent, back to /auth/callback. Returns the redirect the app receives. */
async function browserLogin(app: App, over: Record<string, string> = {}, callbackQuery?: (state: string) => string) {
  const start = await app.request(startUrl(over));
  expect(start.status).toBe(302);
  const authorize = new URL(start.headers.get('location')!);
  expect(authorize.origin + authorize.pathname).toBe('https://firefly.example.com/oauth/authorize');
  // Firefly keeps talking to the same redirect URI as the web app, so its OAuth client doesn't change.
  expect(authorize.searchParams.get('redirect_uri')).toBe('https://spacefly.example.com/auth/callback');
  const oauthCookie = start.headers.get('set-cookie')!.split(';')[0];
  const cb = await app.request(`/auth/callback?${callbackQuery ? callbackQuery(authorize.searchParams.get('state')!) : `code=abc&state=${authorize.searchParams.get('state')}`}`, { headers: { cookie: oauthCookie } });
  expect(cb.status).toBe(302);
  return { cb, location: new URL(cb.headers.get('location')!) };
}

const exchange = (app: App, body: unknown, headers: Record<string, string> = { 'X-SpaceFly': '1' }) =>
  app.request('/auth/mobile/token', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

afterEach(() => vi.useRealTimers());

describe('mobile login', () => {
  it('runs the whole flow: login → code in the app redirect → token → API with a bearer', async () => {
    const { app, s } = setup(env);
    const { cb, location } = await browserLogin(app);
    expect(location.href.split('?')[0]).toBe(REDIRECT);
    expect(location.searchParams.get('state')).toBe('app-state');
    const code = location.searchParams.get('code')!;
    expect(code.length).toBeGreaterThan(20);
    // The app login never sets a cookie: the token is the only credential.
    expect(cb.headers.getSetCookie().some((c) => c.startsWith('sf_session='))).toBe(false);

    const res = await exchange(app, { code, code_verifier: verifier });
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    const grant = (await res.json()) as { token: string; expiresAt: number; email: string };
    expect(grant.email).toBe('leurisvg003@gmail.com');
    expect(grant.expiresAt).toBeGreaterThan(Date.now());

    const me = await app.request('/api/me', { headers: bearer(grant.token) });
    expect(await me.json()).toMatchObject({ authenticated: true, email: 'leurisvg003@gmail.com' });
    const report = await app.request('/api/reports/monthly?start=2026-09-01&end=2026-09-30&currency=DOP', { headers: bearer(grant.token) });
    expect(report.status).toBe(200);
    // Same encryption at rest as a browser session.
    const row = s.db.prepare('SELECT tokens FROM sessions').get() as { tokens: string };
    expect(row.tokens).not.toContain('test-token');
  });

  it('rejects a wrong verifier, and burns the code so it cannot be retried with the right one', async () => {
    const { app, s } = setup(env);
    const code = (await browserLogin(app)).location.searchParams.get('code')!;
    expect((await exchange(app, { code, code_verifier: 'x'.repeat(64) })).status).toBe(400);
    const retry = await exchange(app, { code, code_verifier: verifier });
    expect(retry.status).toBe(400);
    expect(await retry.json()).toEqual({ error: 'invalid_grant' });
    expect((s.db.prepare('SELECT COUNT(*) AS n FROM sessions').get() as { n: number }).n).toBe(0); // the unused session is gone
  });

  it('accepts a code once', async () => {
    const { app } = setup(env);
    const code = (await browserLogin(app)).location.searchParams.get('code')!;
    expect((await exchange(app, { code, code_verifier: verifier })).status).toBe(200);
    expect((await exchange(app, { code, code_verifier: verifier })).status).toBe(400);
  });

  it('expires a code after 60 seconds', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-09-15T12:00:00Z') });
    const { app } = setup(env);
    const code = (await browserLogin(app)).location.searchParams.get('code')!;
    vi.setSystemTime(new Date('2026-09-15T12:01:01Z'));
    expect((await exchange(app, { code, code_verifier: verifier })).status).toBe(400);
  });

  it('hands the code over straight away with a development token', async () => {
    const { app } = setup({ ...env, NODE_ENV: 'development', DEV_FIREFLY_TOKEN: 'test-token' });
    const start = await app.request(startUrl());
    expect(start.status).toBe(302);
    const location = new URL(start.headers.get('location')!);
    expect(location.protocol).toBe('spacefly:');
    expect(location.searchParams.get('state')).toBe('app-state');
    const res = await exchange(app, { code: location.searchParams.get('code'), code_verifier: verifier });
    expect(res.status).toBe(200);
  });

  it('only redirects to an allowed URI, compared exactly (no lowercasing)', async () => {
    const { app } = setup({ MOBILE_REDIRECT_URIS: 'spacefly://Auth/Callback, spacefly://other' });
    expect((await app.request(startUrl({ redirect_uri: 'spacefly://Auth/Callback' }))).status).toBe(302);
    for (const bad of ['spacefly://auth/callback', 'https://evil.example.com/cb', 'spacefly://Auth/Callback/extra', '']) {
      const res = await app.request(startUrl({ redirect_uri: bad }));
      expect(res.status, bad).toBe(400);
      expect(await res.json()).toEqual({ error: 'invalid_redirect_uri' });
    }
  });

  it('validates the PKCE challenge and the state', async () => {
    const { app } = setup(env);
    for (const bad of <Record<string, string>[]>[{ code_challenge: '' }, { code_challenge: 'short' }, { code_challenge: 'a b'.repeat(20) }, { state: '' }, { state: 's'.repeat(513) }]) {
      expect((await app.request(startUrl(bad))).status, JSON.stringify(bad)).toBe(400);
    }
  });

  it('is off (404) unless a redirect URI is configured', async () => {
    const { app } = setup();
    expect((await app.request(startUrl())).status).toBe(404);
    expect((await exchange(app, { code: 'x', code_verifier: verifier })).status).toBe(404);
  });

  it('sends Firefly and state errors back into the app, keeping its state', async () => {
    const { app } = setup(env);
    const denied = await browserLogin(app, {}, (state) => `error=access_denied&state=${state}`);
    expect(denied.location.protocol).toBe('spacefly:');
    expect(denied.location.searchParams.get('error')).toBe('access_denied');
    expect(denied.location.searchParams.get('state')).toBe('app-state');

    const forged = await browserLogin(app, {}, () => 'code=abc&state=forged');
    expect(forged.location.searchParams.get('error')).toBe('invalid_state');
    expect(forged.location.searchParams.get('code')).toBeNull();
  });

  it('reports a failed token exchange to the app', async () => {
    const failing = (async (input: string | URL | Request) => {
      if (String(input).includes('/oauth/token')) return new Response('nope', { status: 400 });
      throw new Error('unexpected request');
    }) as typeof fetch;
    const { app } = setup(env, failing);
    const { location } = await browserLogin(app);
    expect(location.searchParams.get('error')).toBe('token_exchange');
  });

  it('still sends web login errors to the login page', async () => {
    const { app } = setup(env);
    const start = await app.request('/auth/login');
    const cb = await app.request('/auth/callback?error=access_denied', { headers: { cookie: start.headers.get('set-cookie')!.split(';')[0] } });
    expect(cb.headers.get('location')).toBe('/login?error=access_denied');
  });
});

describe('POST /auth/mobile/token', () => {
  it('goes through the write guard like every state-changing request', async () => {
    const { app } = setup(env);
    expect((await exchange(app, { code: 'x', code_verifier: verifier }, {})).status).toBe(403); // no X-SpaceFly
    const notJson = await app.request('/auth/mobile/token', { method: 'POST', headers: { 'X-SpaceFly': '1', 'Content-Type': 'text/plain' }, body: 'code=x' });
    expect(notJson.status).toBe(415);
    const foreignOrigin = await exchange(app, { code: 'x', code_verifier: verifier }, { 'X-SpaceFly': '1', Origin: 'https://evil.example.com' });
    expect(foreignOrigin.status).toBe(403);
    // A native client sends no Origin at all, which is fine.
    expect((await exchange(app, { code: 'x', code_verifier: verifier })).status).toBe(400);
  });

  it('rejects malformed bodies', async () => {
    const { app } = setup(env);
    for (const body of [{}, { code: 'x' }, { code: 'x', code_verifier: 'short' }, { code: 1, code_verifier: verifier }, null]) {
      expect((await exchange(app, body)).status, JSON.stringify(body)).toBe(400);
    }
  });
});

describe('bearer sessions', () => {
  async function bearerToken(app: App) {
    const code = (await browserLogin(app)).location.searchParams.get('code')!;
    return ((await (await exchange(app, { code, code_verifier: verifier })).json()) as { token: string }).token;
  }

  it('rejects an unknown bearer, without falling back to the cookie', async () => {
    const { app } = setup(env);
    const { login } = await import('./harness');
    const cookie = await login(app);
    expect((await app.request('/api/me', { headers: { cookie } })).status).toBe(200);
    expect((await app.request('/api/me', { headers: { cookie, ...bearer('not-a-session') } })).status).toBe(401);
  });

  it('prefers the bearer over the cookie when both are valid', async () => {
    const { app, s } = setup(env);
    const { login } = await import('./harness');
    const cookie = await login(app);
    const token = await bearerToken(app);
    // Remove the cookie's session: only the bearer is still good, and it must win.
    s.sessions.delete(cookie.split('=')[1]);
    expect((await app.request('/api/me', { headers: { cookie, ...bearer(token) } })).status).toBe(200);
    expect((await app.request('/api/me', { headers: { cookie } })).status).toBe(401);
  });

  it('logs out through the bearer and the token stops working', async () => {
    const { app } = setup(env);
    const token = await bearerToken(app);
    const out = await app.request('/auth/logout', { method: 'POST', headers: { 'X-SpaceFly': '1', ...bearer(token) } });
    expect(out.status).toBe(204);
    expect((await app.request('/api/me', { headers: bearer(token) })).status).toBe(401);
  });

  it('writes through the API with a bearer, with the usual CSRF header', async () => {
    const { app } = setup(env);
    const token = await bearerToken(app);
    const body = JSON.stringify({ order: ['2', '1'] });
    const headers = { ...bearer(token), 'Content-Type': 'application/json' };
    expect((await app.request('/api/settings/account-order', { method: 'PUT', headers, body })).status).toBe(403);
    expect((await app.request('/api/settings/account-order', { method: 'PUT', headers: { ...headers, 'X-SpaceFly': '1' }, body })).status).toBe(200);
  });
});
