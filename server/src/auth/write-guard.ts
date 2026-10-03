import type { MiddlewareHandler } from 'hono';
import type { AppEnv } from '../app.types';
import type { Config } from '../config';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF protection for every state-changing request. SameSite=Lax doesn't help between sibling
 * subdomains (`firefly.` → `spacefly.` are the same site), so we also require:
 *  - the custom `X-SpaceFly: 1` header, which a cross-origin form or simple request can't set;
 *  - an `Origin` equal to `APP_URL`, when the browser sends one;
 *  - `Sec-Fetch-Site: same-origin`, when the browser sends it;
 *  - a JSON body (415 otherwise), which forces a CORS preflight for cross-origin callers.
 */
export function writeGuard(config: Config): MiddlewareHandler<AppEnv> {
  const appOrigin = new URL(config.APP_URL).origin;
  return async (c, next) => {
    if (SAFE_METHODS.has(c.req.method)) return next();

    const forbid = (reason: string) => c.json({ error: 'forbidden', reason }, 403);
    if (c.req.header('x-spacefly') !== '1') return forbid('missing_header');
    const origin = c.req.header('origin');
    if (origin && origin !== appOrigin) return forbid('bad_origin');
    const site = c.req.header('sec-fetch-site');
    if (site && site !== 'same-origin') return forbid('cross_site');

    const type = c.req.header('content-type');
    const length = c.req.header('content-length');
    const hasBody = type !== undefined || (length !== undefined && length !== '0') || c.req.header('transfer-encoding') !== undefined;
    if (hasBody && !/^application\/json\s*(;|$)/i.test(type ?? '')) return c.json({ error: 'unsupported_media_type' }, 415);
    return next();
  };
}
