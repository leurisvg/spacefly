import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async (_route, state) => {
  // inject() only works synchronously: resolve every dependency before the first await.
  const auth = inject(AuthService);
  const router = inject(Router);
  const ok = await auth.check();
  return ok || router.createUrlTree(['/login'], { queryParams: { returnTo: state.url } });
};
