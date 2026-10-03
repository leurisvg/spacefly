import type { Config } from './config';
import type { Db } from './db/sqlite';
import type { Cache } from './core/cache';
import type { FireflyData } from './core/firefly-data';
import type { SettingsStore } from './core/settings.store';
import type { Sealer } from './auth/crypto';
import type { Session, SessionStore } from './auth/session.store';

export interface Services {
  config: Config;
  db: Db;
  cache: Cache;
  sessions: SessionStore;
  sealer: Sealer;
  settings: SettingsStore;
  fetch: typeof fetch;
}

export type AppEnv = {
  Variables: {
    session: Session;
    data: FireflyData;
    cfEmail: string | null;
  };
};

export const SESSION_COOKIE = 'sf_session';
export const OAUTH_COOKIE = 'sf_oauth';
