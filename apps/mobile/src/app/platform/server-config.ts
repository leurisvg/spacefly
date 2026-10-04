import { computed, inject, Injectable, signal } from '@angular/core';
import { ApplicationSettings } from '@nativescript/core';
import { SecureCredentials } from './secure-credentials';

const API_URL_KEY = 'spacefly.apiUrl';
const TOKEN_KEY = 'spacefly.token';
const CF_ID_KEY = 'spacefly.cf.clientId';
const CF_SECRET_KEY = 'spacefly.cf.clientSecret';

/** `https://spacefly.example.com/` → `https://spacefly.example.com`; anything that isn't an http(s) URL → `null`. */
export function normalizeServerUrl(input: string): string | null {
  const trimmed = input.trim().replace(/\/+$/, '');
  return /^https?:\/\/[^\s/?#]+(\/[^\s?#]*)?$/i.test(trimmed) ? trimmed : null;
}

/** Where the server is and how to authenticate to it: URL and Access credentials from the settings, session token after login. */
@Injectable({ providedIn: 'root' })
export class ServerConfig {
  private readonly secure = inject(SecureCredentials);

  /** The server URL: what the user typed, else the `--env.apiUrl` given at build time. */
  private readonly url = signal(ApplicationSettings.getString(API_URL_KEY) || __SPACEFLY_API_URL__ || '');
  readonly apiUrl = this.url.asReadonly();
  readonly configured = computed(() => normalizeServerUrl(this.url()) !== null);

  setApiUrl(value: string): boolean {
    const url = normalizeServerUrl(value);
    if (!url) return false;
    ApplicationSettings.setString(API_URL_KEY, url);
    this.url.set(url);
    return true;
  }

  get token(): string | null {
    return this.secure.get(TOKEN_KEY);
  }

  setToken(token: string | null): void {
    if (token) this.secure.set(TOKEN_KEY, token);
    else this.secure.remove(TOKEN_KEY);
  }

  get accessClientId(): string {
    return this.secure.get(CF_ID_KEY) ?? '';
  }

  get accessClientSecret(): string {
    return this.secure.get(CF_SECRET_KEY) ?? '';
  }

  /** Empty values remove the credential. */
  setAccessCredentials(clientId: string, clientSecret: string): void {
    for (const [key, value] of [[CF_ID_KEY, clientId.trim()], [CF_SECRET_KEY, clientSecret.trim()]] as const) {
      if (value) this.secure.set(key, value);
      else this.secure.remove(key);
    }
  }
}
