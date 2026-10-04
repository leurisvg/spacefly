import { HttpClient } from '@angular/common/http';
import { inject, Injectable, Injector } from '@angular/core';
import { RouterExtensions } from '@nativescript/angular';
import { AuthPlatform } from '@spacefly/client/platform/auth-platform';
import { firstValueFrom } from 'rxjs';
import { AuthBrowserCancelled, openAuthBrowser } from './auth-browser';
import { createPkce, randomState } from './pkce';
import { ServerConfig } from './server-config';

/** The deep link the system browser ends on; registered in AndroidManifest.xml and Info.plist, allowed by MOBILE_REDIRECT_URIS. */
export const REDIRECT_URI = 'spacefly://auth/callback';
export const CALLBACK_SCHEME = 'spacefly';

/** A sign-in that failed; `code` is a `login.errors.*` key (`access_denied`, `invalid_state`, `token_exchange`, `generic`). */
export class SignInError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

export function parseCallback(url: string): { code: string | null; state: string | null; error: string | null } {
  const query = url.includes('?') ? url.slice(url.indexOf('?') + 1).split('#')[0] : '';
  const params = new URLSearchParams(query);
  return { code: params.get('code'), state: params.get('state'), error: params.get('error') };
}

/**
 * Bearer-token sign-in: PKCE in the system browser against `/auth/mobile/login`, then the one-time code is traded for the
 * session token at `/auth/mobile/token`. The token lives in the secure storage; there is no cookie.
 */
@Injectable()
export class MobileAuthPlatform extends AuthPlatform {
  private readonly config = inject(ServerConfig);
  private readonly router = inject(RouterExtensions);
  private readonly injector = inject(Injector);

  override async login(): Promise<'done'> {
    const { verifier, challenge } = createPkce();
    const state = randomState();
    const start = new URL(`${this.config.apiUrl()}/auth/mobile/login`);
    start.searchParams.set('redirect_uri', REDIRECT_URI);
    start.searchParams.set('code_challenge', challenge);
    start.searchParams.set('state', state);

    let callback: string;
    try {
      callback = await openAuthBrowser(start.toString(), CALLBACK_SCHEME);
    } catch (error) {
      throw new SignInError(error instanceof AuthBrowserCancelled ? 'access_denied' : 'generic');
    }
    const result = parseCallback(callback);
    if (result.error) throw new SignInError(result.error);
    if (!result.code || result.state !== state) throw new SignInError('invalid_state');

    try {
      const http = this.injector.get(HttpClient);
      const grant = await firstValueFrom(http.post<{ token: string }>('/auth/mobile/token', { code: result.code, code_verifier: verifier }));
      this.config.setToken(grant.token);
    } catch {
      throw new SignInError('token_exchange');
    }
    return 'done';
  }

  override async afterLogout(): Promise<void> {
    this.config.setToken(null);
    await this.goToLogin();
  }

  override onUnauthorized(): void {
    if (!this.config.token) return; // nothing to expire: the login screen is (or is about to be) showing
    this.config.setToken(null);
    void this.goToLogin();
  }

  private goToLogin(): Promise<boolean> {
    return this.router.navigate(['/login'], { clearHistory: true });
  }
}
