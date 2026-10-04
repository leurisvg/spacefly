import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject, InjectionToken } from '@angular/core';
import { catchError, throwError } from 'rxjs';

/** Full page reload; a token so tests can swap it. */
export const PAGE_RELOAD = new InjectionToken<() => void>('PAGE_RELOAD', { providedIn: 'root', factory: () => () => location.reload() });

const RELOAD_KEY = 'spacefly.accessReload';
const RELOAD_COOLDOWN_MS = 30_000;

/**
 * When the Cloudflare Access session expires, Access answers `/api/*` fetches with a redirect to
 * its login page. That is cross-origin, so the browser blocks it (CSP `connect-src 'self'`) and
 * the request fails with status 0. Only a top-level navigation can renew the session, so reload
 * the page once (the cooldown avoids a loop if the server is simply down). Writes are left alone:
 * reloading would throw away the form, and they already report a network error.
 */
function renewAccessSession(reload: () => void): void {
  const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
  if (Date.now() - last < RELOAD_COOLDOWN_MS) return;
  sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  reload();
}

export const accessRenewInterceptor: HttpInterceptorFn = (req, next) => {
  const reload = inject(PAGE_RELOAD);
  const mutating = req.method !== 'GET' && req.method !== 'HEAD';
  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 0 && !mutating && req.url.startsWith('/api/')) renewAccessSession(reload);
      return throwError(() => err);
    }),
  );
};
