import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { MeResponse } from '@spacefly/shared';
import { AuthPlatform } from '../platform/auth-platform';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly platform = inject(AuthPlatform);
  readonly me = signal<MeResponse | null>(null);

  async check(): Promise<boolean> {
    if (this.me()?.authenticated) return true;
    try {
      this.me.set(await firstValueFrom(this.http.get<MeResponse>('/api/me')));
      return true;
    } catch {
      this.me.set({ authenticated: false });
      return false;
    }
  }

  /** Web: full-page redirect (the BFF runs the OAuth dance with Firefly). Mobile: the PKCE flow; resolves once signed in. */
  async login(returnTo = '/'): Promise<boolean> {
    if ((await this.platform.login(returnTo)) === 'redirecting') return false;
    this.me.set(null);
    return this.check();
  }

  async logout(): Promise<void> {
    await firstValueFrom(this.http.post('/auth/logout', {})).catch(() => undefined);
    this.me.set({ authenticated: false });
    await this.platform.afterLogout();
  }
}
