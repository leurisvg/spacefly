import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ServerConfig } from './server-config';

const isAppPath = (url: string): boolean => url.startsWith('/api/') || url.startsWith('/auth/');

/** Cloudflare Access answers an unauthenticated API call with its HTML login page instead of JSON. */
export function isAccessLoginPage(error: unknown): boolean {
  if (!(error instanceof HttpErrorResponse)) return false;
  const body = typeof error.error === 'string' ? error.error : (error.error as { text?: unknown } | null)?.text;
  return typeof body === 'string' && /^\s*<(!doctype|html)/i.test(body);
}

/**
 * Sends the session token (`Authorization: Bearer`) and, when configured, the Cloudflare Access service-token headers to the
 * SpaceFly server — never to any other host. Runs before `baseUrlInterceptor`, so it sees `/api/…` paths (or the absolute
 * server URL the "test connection" button uses). A response that is Access' HTML login page becomes a 403, so view-models
 * treat it as the failure it is instead of choking on a JSON parse.
 */
export const bearerInterceptor: HttpInterceptorFn = (req, next) => {
  const config = inject(ServerConfig);
  const apiUrl = config.apiUrl();
  const toServer = isAppPath(req.url) || (apiUrl !== '' && req.url.startsWith(apiUrl));
  if (!toServer) return next(req);

  const headers: Record<string, string> = {};
  const token = config.token;
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (config.accessClientId && config.accessClientSecret) {
    headers['CF-Access-Client-Id'] = config.accessClientId;
    headers['CF-Access-Client-Secret'] = config.accessClientSecret;
  }
  return next(req.clone({ setHeaders: headers })).pipe(
    catchError((error: unknown) =>
      throwError(() => (isAccessLoginPage(error) ? new HttpErrorResponse({ status: 403, statusText: 'cf_access_required', url: req.url, error: { error: 'cf_access_required' } }) : error)),
    ),
  );
};
