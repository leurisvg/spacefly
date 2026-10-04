import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthPlatform } from '@spacefly/client/platform/auth-platform';

/** Cookie session: sign-in and sign-out are full-page navigations handled by the BFF. */
@Injectable()
export class WebAuthPlatform extends AuthPlatform {
  private readonly router = inject(Router);

  override login(returnTo: string): Promise<'redirecting'> {
    location.href = `/auth/login?returnTo=${encodeURIComponent(returnTo)}`;
    return Promise.resolve('redirecting');
  }

  override afterLogout(): void {
    location.href = '/login';
  }

  override onUnauthorized(): void {
    void this.router.navigate(['/login'], { queryParams: { returnTo: this.router.url } });
  }
}
