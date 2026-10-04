import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthPlatform } from '../platform/auth-platform';

/**
 * Adds the CSRF header the BFF requires on every state-changing request, and sends the user back
 * to the login screen on any 401 (expired/revoked session).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const platform = inject(AuthPlatform);
  const mutating = req.method !== 'GET' && req.method !== 'HEAD';
  const request = mutating && (req.url.startsWith('/api/') || req.url.startsWith('/auth/')) ? req.clone({ setHeaders: { 'X-SpaceFly': '1' } }) : req;
  return next(request).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401 && req.url.startsWith('/api/') && !req.url.endsWith('/me')) {
        platform.onUnauthorized();
      }
      return throwError(() => err);
    }),
  );
};

/** Interceptors every app needs, in order. Apps add theirs after these and `baseUrlInterceptor` last. */
export const CLIENT_INTERCEPTORS = [authInterceptor];
