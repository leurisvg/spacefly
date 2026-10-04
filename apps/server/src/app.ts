import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Hono, type MiddlewareHandler } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import { bodyLimit } from 'hono/body-limit';
import { secureHeaders } from 'hono/secure-headers';
import type { AppEnv, Services } from './app.types';
import { cfAccess } from './auth/cf-access.middleware';
import { oauthRoutes, requireSession } from './auth/oauth.routes';
import { writeGuard } from './auth/write-guard';
import { apiRoutes } from './routes/api.routes';
import { writeRoutes } from './routes/write.routes';

/** Fixed-window rate limit keyed by client IP (Cloudflare first). */
export function rateLimit(limit: number, windowMs: number): MiddlewareHandler<AppEnv> {
  const hits = new Map<string, { count: number; reset: number }>();
  return async (c, next) => {
    const ip =
      c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
    const now = Date.now();
    const entry = hits.get(ip);
    if (!entry || entry.reset < now) {
      hits.set(ip, { count: 1, reset: now + windowMs });
      if (hits.size > 10_000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
    } else if (++entry.count > limit) {
      c.header('Retry-After', String(Math.ceil((entry.reset - now) / 1000)));
      return c.json({ error: 'rate_limited' }, 429);
    }
    return next();
  };
}

export function createApp(s: Services) {
  const app = new Hono<AppEnv>();

  app.get('/healthz', (c) => c.json({ ok: true }));

  app.use(
    '*',
    secureHeaders({
      contentSecurityPolicy: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        fontSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'", s.config.FIREFLY_PUBLIC_URL],
        objectSrc: ["'none'"],
      },
      referrerPolicy: 'same-origin',
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use('*', cfAccess(s.config));

  // State-changing requests: CSRF guard first, then size and rate limits.
  const guard = writeGuard(s.config);
  const maxBody = bodyLimit({ maxSize: 64 * 1024, onError: (c) => c.json({ error: 'payload_too_large' }, 413) });
  const writeRate = rateLimit(120, 60_000);
  const onlyWrites =
    (mw: MiddlewareHandler<AppEnv>): MiddlewareHandler<AppEnv> =>
    (c, next) =>
      c.req.method === 'GET' || c.req.method === 'HEAD' ? next() : mw(c, next);

  app.use('/auth/logout', guard);
  app.use('/auth/*', rateLimit(30, 60_000));
  app.route('/auth', oauthRoutes(s));

  app.use('/api/*', async (c, next) => {
    await next();
    c.header('Cache-Control', 'no-store');
  });
  app.use('/api/*', guard);
  app.use('/api/*', onlyWrites(maxBody));
  app.use('/api/*', onlyWrites(writeRate));
  app.use('/api/*', requireSession(s));
  app.route('/api', apiRoutes(s));
  app.route('/api', writeRoutes(s));
  app.all('/api/*', (c) => c.json({ error: 'not_found' }, 404));

  // Angular SPA: hashed assets are immutable; everything else falls back to index.html.
  const root = s.config.STATIC_DIR;
  app.use(
    '/*',
    serveStatic({
      root,
      onFound: (path, c) => {
        if (/\.[0-9a-z]{8,}\.(js|css|woff2?)$/i.test(path) || path.includes('/media/')) {
          c.header('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    }),
  );
  let indexHtml: string | null = null;
  app.get('*', async (c) => {
    indexHtml ??= await readFile(join(root, 'index.html'), 'utf8').catch(() => null);
    if (!indexHtml) return c.text('SpaceFly web build not found. Run `npm run build`.', 404);
    c.header('Cache-Control', 'no-cache');
    return c.html(indexHtml);
  });

  return app;
}
