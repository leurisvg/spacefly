import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { MeResponse } from '@shared';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
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

  /** Full-page redirect: the BFF runs the OAuth dance with Firefly. */
  login(returnTo = '/'): void {
    location.href = `/auth/login?returnTo=${encodeURIComponent(returnTo)}`;
  }

  async logout(): Promise<void> {
    await firstValueFrom(this.http.post('/auth/logout', {})).catch(() => undefined);
    this.me.set({ authenticated: false });
    location.href = '/login';
  }
}
