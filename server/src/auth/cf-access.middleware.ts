import type { MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { Config } from '../config';
import type { AppEnv } from '../app.types';

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

  return async (c, next) => {
    const token = c.req.header('cf-access-jwt-assertion') ?? getCookie(c, 'CF_Authorization');
    if (!token) return c.json({ error: 'cf_access_required' }, 403);
    try {
      const { payload } = await jwtVerify(token, jwks, { issuer, audience: config.CF_ACCESS_AUD });
      const email = typeof payload['email'] === 'string' ? payload['email'].toLowerCase() : '';
      if (allowed.size > 0 && !allowed.has(email)) return c.json({ error: 'cf_access_forbidden' }, 403);
      c.set('cfEmail', email || null);
    } catch {
      return c.json({ error: 'cf_access_invalid' }, 403);
    }
    return next();
  };
}
