/**
 * Synchronous string key/value persistence (preferences, language, privacy flag).
 * Web: localStorage. Mobile: ApplicationSettings. No default provider: a platform that
 * forgets to provide it fails at bootstrap instead of silently losing data.
 */
export abstract class KeyValueStorage {
  abstract get(key: string): string | null;
  abstract set(key: string, value: string): void;
  abstract remove(key: string): void;
}
