import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

/**
 * Adds the CSRF header the BFF requires on every state-changing request, and sends the user back
 * to the login page on any 401 (expired/revoked session).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const mutating = req.method !== 'GET' && req.method !== 'HEAD';
  const request = mutating && (req.url.startsWith('/api/') || req.url.startsWith('/auth/')) ? req.clone({ setHeaders: { 'X-SpaceFly': '1' } }) : req;
  return next(request).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401 && req.url.startsWith('/api/') && !req.url.endsWith('/me')) {
        void router.navigate(['/login'], { queryParams: { returnTo: router.url } });
      }
      return throwError(() => err);
    }),
  );
};
