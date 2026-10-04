import { expect } from 'vitest';
import { createApp } from '../src/app';
import type { Services } from '../src/app.types';
import { Sealer } from '../src/auth/crypto';
import { SessionStore } from '../src/auth/session.store';
import { loadConfig } from '../src/config';
import { Cache } from '../src/core/cache';
import { SettingsStore } from '../src/core/settings.store';
import { openDb } from '../src/db/sqlite';
import { fakeFirefly, newLog, type FakeFireflyLog } from './fixtures/firefly-fixture';

export const baseEnv = {
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

export function setup(env: Record<string, string> = {}, fetchImpl?: typeof fetch, extraGroups: unknown[] = []) {
  const log: FakeFireflyLog = newLog();
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
    fetch: fetchImpl ?? fakeFirefly(log, extraGroups),
  };
  return { app: createApp(s), s, log };
}

/** Full OAuth round-trip against the fake Firefly; returns the session cookie. */
export async function login(app: ReturnType<typeof setup>['app'], headers: Record<string, string> = {}) {
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


/** A same-origin JSON request, the way the web app sends it. */
export function call(app: ReturnType<typeof setup>['app'], cookie: string, method: string, path: string, body?: unknown) {
  return app.request(path, {
    method,
    headers: { cookie, 'X-SpaceFly': '1', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/** Requests the fake Firefly received that changed something. */
export function writesTo(log: FakeFireflyLog, method?: string) {
  return log.methods
    .map((m, i) => ({ method: m, path: log.paths[i]!, body: log.bodies[i] as Record<string, any> | undefined }))
    .filter((r) => r.path.startsWith('/api/') && r.method !== 'GET' && (!method || r.method === method));
}
