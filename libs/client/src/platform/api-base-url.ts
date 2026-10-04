import type { HttpInterceptorFn } from '@angular/common/http';
import { inject, InjectionToken } from '@angular/core';

/**
 * Origin the `/api` and `/auth` paths are relative to: `''` on web (same origin, dev proxy), the server
 * URL chosen in the settings on mobile (a function so it can change at runtime without a restart).
 */
export const API_BASE_URL = new InjectionToken<string | (() => string)>('API_BASE_URL');

export const resolveBaseUrl = (base: string | (() => string)): string => (typeof base === 'function' ? base() : base);

/** Prefixes app-relative requests with the base URL. Keep it LAST in the interceptor chain: the others match on `/api/…`. */
export const baseUrlInterceptor: HttpInterceptorFn = (req, next) => {
  const base = resolveBaseUrl(inject(API_BASE_URL)).replace(/\/+$/, '');
  return next(base && (req.url.startsWith('/api/') || req.url.startsWith('/auth/')) ? req.clone({ url: base + req.url }) : req);
};
