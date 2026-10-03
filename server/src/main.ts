import { serve } from '@hono/node-server';
import { createApp } from './app';
import { Sealer } from './auth/crypto';
import { SessionStore } from './auth/session.store';
import { loadConfig } from './config';
import { Cache } from './core/cache';
import { SettingsStore } from './core/settings.store';
import { openDb } from './db/sqlite';

const config = loadConfig();
const db = openDb(config.DATA_DIR);
const sealer = new Sealer(config.SESSION_SECRET);
const cache = new Cache(db);
const sessions = new SessionStore(db, sealer, config.SESSION_TTL_DAYS * 86_400_000);

const app = createApp({
  config,
  db,
  cache,
  sealer,
  sessions,
  settings: new SettingsStore(db),
  fetch: globalThis.fetch,
});

const housekeeping = setInterval(() => {
  sessions.purgeExpired();
  cache.purgeExpired();
}, 60 * 60 * 1000);
housekeeping.unref();

const server = serve({ fetch: app.fetch, port: config.PORT }, (info) => {
  console.log(`🚀 SpaceFly listening on http://localhost:${info.port} → Firefly ${config.FIREFLY_INTERNAL_URL}`);
  if (!config.CF_ACCESS_ENABLED) console.warn('⚠️  Cloudflare Access validation is DISABLED (CF_ACCESS_ENABLED=false)');
  if (config.devToken) console.warn('⚠️  DEV_FIREFLY_TOKEN in use: OAuth is bypassed (development only)');
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close();
    db.close();
    process.exit(0);
  });
}
