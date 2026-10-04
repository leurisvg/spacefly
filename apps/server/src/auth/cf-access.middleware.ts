import type { MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { Config } from '../config';
import type { AppEnv } from '../app.types';

/** Where an Access service token (no user behind it) is accepted: the API, the app's code exchange and sign-out. */
const SERVICE_TOKEN_PATHS = (path: string): boolean => path.startsWith('/api/') || path === '/auth/mobile/token' || path === '/auth/logout';

/**
 * Verifies the Cloudflare Access JWT (`Cf-Access-Jwt-Assertion`) on every request:
 * signature against the team's JWKS, issuer, audience and the allowed email list.
 */
export function cfAccess(config: Config): MiddlewareHandler<AppEnv> {
  if (!config.CF_ACCESS_ENABLED) {
    return async (c, next) => {
      c.set('cfEmail', null);
      await next();
    };
  }
  const team = config.CF_ACCESS_TEAM_DOMAIN.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const issuer = `https://${team}`;
  const jwks = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
  const allowed = new Set(config.CF_ACCESS_ALLOWED_EMAILS);
  const serviceTokens = new Set(config.CF_ACCESS_SERVICE_TOKEN_IDS);

  const isServiceToken = (commonName: unknown): boolean => typeof commonName === 'string' && serviceTokens.has(commonName);

  return async (c, next) => {
    const token = c.req.header('cf-access-jwt-assertion') ?? getCookie(c, 'CF_Authorization');
    if (!token) return c.json({ error: 'cf_access_required' }, 403);
    try {
      const { payload } = await jwtVerify(token, jwks, { issuer, audience: config.CF_ACCESS_AUD });
      const email = typeof payload['email'] === 'string' ? payload['email'].toLowerCase() : '';
      if (!email && isServiceToken(payload['common_name'])) {
        // A machine identity (the mobile app's service token): it reaches the API and nothing else.
        if (!SERVICE_TOKEN_PATHS(c.req.path)) return c.json({ error: 'cf_access_forbidden' }, 403);
        c.set('cfEmail', null);
        return next();
      }
      if (allowed.size > 0 && !allowed.has(email)) return c.json({ error: 'cf_access_forbidden' }, 403);
      c.set('cfEmail', email || null);
    } catch {
      return c.json({ error: 'cf_access_invalid' }, 403);
    }
    return next();
  };
}
