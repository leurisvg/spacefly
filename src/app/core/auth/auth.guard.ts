import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async (_route, state) => {
  const ok = await inject(AuthService).check();
  return ok || inject(Router).createUrlTree(['/login'], { queryParams: { returnTo: state.url } });
};
