import { Injectable } from '@angular/core';
import { SecureStorage } from '@nativescript/secure-storage';

/**
 * Keychain (iOS) / encrypted shared preferences (Android) for everything that must not sit in plain preferences:
 * the session token and the Cloudflare Access service-token credentials. Reads are cached because the HTTP
 * interceptor asks on every request.
 */
@Injectable({ providedIn: 'root' })
export class SecureCredentials {
  private readonly storage = new SecureStorage();
  private readonly cache = new Map<string, string | null>();

  get(key: string): string | null {
    if (!this.cache.has(key)) {
      let value: string | null | undefined;
      try {
        value = this.storage.getSync({ key }) as string | null | undefined;
      } catch {
        // an unreadable entry counts as missing
      }
      this.cache.set(key, value || null);
    }
    return this.cache.get(key) ?? null;
  }

  set(key: string, value: string): void {
    this.storage.setSync({ key, value });
    this.cache.set(key, value);
  }

  remove(key: string): void {
    try {
      this.storage.removeSync({ key });
    } finally {
      this.cache.set(key, null);
    }
  }
}
