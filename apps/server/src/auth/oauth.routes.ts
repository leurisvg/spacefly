import { Hono, type Context, type MiddlewareHandler } from 'hono';
import { z } from 'zod';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import type { AppEnv, Services } from '../app.types';
import { OAUTH_COOKIE, SESSION_COOKIE } from '../app.types';
import { FireflyData } from '../core/firefly-data';
import { FireflyClient, type TokenProvider } from '../firefly/firefly.client';
import type { FfSingle, FfUser } from '../firefly/firefly.types';
import { randomToken, sha256Base64Url } from './crypto';
import { MobileHandoff } from './mobile-handoff';
import type { OAuthTokens, Session } from './session.store';

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}

/** Set when the login was started by the mobile app: where to send the app back, and what it asked for. */
interface MobileLogin {
  redirectUri: string;
  /** PKCE challenge of the app's own code verifier. */
  challenge: string;
  /** Opaque value the app wants echoed back. */
  state: string;
}

interface OAuthState {
  state: string;
  verifier: string;
  returnTo: string;
  t: number;
  mobile?: MobileLogin;
}

/** Who Firefly says just signed in, with the tokens to act for them. */
interface Identity {
  userId: string;
  email: string;
  tokens: OAuthTokens;
}

const PKCE_CHALLENGE = /^[A-Za-z0-9_-]{43,128}$/;
const mobileTokenBody = z.object({ code: z.string().min(1).max(256), code_verifier: z.string().min(43).max(128) });

/** The id of the session a request carries: `Authorization: Bearer` (mobile app) wins over the cookie (browser). */
export function sessionIdFrom(c: Context): string | undefined {
  const auth = c.req.header('authorization');
  const bearer = auth && /^Bearer\s+(\S+)$/i.exec(auth)?.[1];
  return bearer || getCookie(c, SESSION_COOKIE);
}

function appRedirect(mobile: MobileLogin, params: Record<string, string>): string {
  const url = new URL(mobile.redirectUri);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set('state', mobile.state);
  return url.toString();
}

const DEV_TOKEN_TTL = 365 * 24 * 60 * 60 * 1000;

/** Only same-origin relative paths are accepted as post-login destinations. */
function safeReturnTo(value: string | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return '/';
  return value;
}

export function oauthRoutes(s: Services) {
  const { config } = s;
  const app = new Hono<AppEnv>();
  const redirectUri = `${config.APP_URL}/auth/callback`;

  const handoff = new MobileHandoff((id) => s.sessions.delete(id));
  const mobileEnabled = config.MOBILE_REDIRECT_URIS.length > 0;

  const cookieOpts = { httpOnly: true, secure: config.secureCookies, sameSite: 'Lax' as const, path: '/' };

  async function identify(c: Context<AppEnv>, tokens: OAuthTokens): Promise<Identity> {
    const client = new FireflyClient(config.FIREFLY_INTERNAL_URL, staticTokens(tokens.accessToken), s.fetch);
    const user = await client.get<FfSingle<FfUser>>('/v1/about/user');
    const cfEmail = c.get('cfEmail');
    const email = user.data.attributes.email.toLowerCase();
    if (cfEmail && cfEmail !== email) {
      console.warn(`[auth] Cloudflare identity ${cfEmail} differs from Firefly user ${email}`);
    }
    return { userId: user.data.id, email, tokens };
  }

  /** Browser login: a session cookie, then on to the page the user wanted. */
  function cookieLogin(c: Context<AppEnv>, who: Identity, returnTo: string) {
    const session = s.sessions.create(who.userId, who.email, who.tokens);
    setCookie(c, SESSION_COOKIE, session.id, { ...cookieOpts, maxAge: config.SESSION_TTL_DAYS * 86400 });
    return c.redirect(returnTo);
  }

  /** App login: no cookie; the app gets a one-time code and trades it (with its PKCE verifier) for the session id. */
  function mobileHandoff(c: Context<AppEnv>, who: Identity, mobile: MobileLogin) {
    const session = s.sessions.create(who.userId, who.email, who.tokens);
    const code = handoff.issue({ challenge: mobile.challenge, sessionId: session.id, email: who.email, sessionExpiresAt: session.expiresAt });
    return c.redirect(appRedirect(mobile, { code }));
  }

  app.get('/login', async (c) => {
    const returnTo = safeReturnTo(c.req.query('returnTo'));
    if (config.devToken) return cookieLogin(c, await identify(c, devTokens(config.devToken)), returnTo);
    return startOAuth(c, { returnTo });
  });

  /** Sends the browser to Firefly to authorize, remembering (sealed in a cookie) what to do when it comes back. */
  function startOAuth(c: Context<AppEnv>, opts: { returnTo: string; mobile?: MobileLogin }) {
    const state = randomToken(24);
    const verifier = randomToken(48);
    const payload: OAuthState = { state, verifier, returnTo: opts.returnTo, t: Date.now(), mobile: opts.mobile };
    setCookie(c, OAUTH_COOKIE, s.sealer.seal(JSON.stringify(payload)), { ...cookieOpts, path: '/auth', maxAge: 600 });
    const url = new URL(`${config.FIREFLY_PUBLIC_URL}/oauth/authorize`);
    url.searchParams.set('client_id', config.FIREFLY_OAUTH_CLIENT_ID);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', '');
    url.searchParams.set('state', state);
    url.searchParams.set('code_challenge', sha256Base64Url(verifier));
    url.searchParams.set('code_challenge_method', 'S256');
    return c.redirect(url.toString());
  }

  /**
   * Start of the app's login, opened in the system browser (ASWebAuthenticationSession / Custom Tabs). It reuses
   * the web flow: Firefly still redirects to `${APP_URL}/auth/callback`, so the Firefly OAuth client doesn't change.
   */
  app.get('/mobile/login', async (c) => {
    if (!mobileEnabled) return c.json({ error: 'not_found' }, 404);
    const redirect = c.req.query('redirect_uri') ?? '';
    const challenge = c.req.query('code_challenge') ?? '';
    const state = c.req.query('state') ?? '';
    if (!config.MOBILE_REDIRECT_URIS.includes(redirect)) return c.json({ error: 'invalid_redirect_uri' }, 400);
    if (!PKCE_CHALLENGE.test(challenge) || !state || state.length > 512) return c.json({ error: 'invalid_request' }, 400);
    const mobile: MobileLogin = { redirectUri: redirect, challenge, state };
    if (config.devToken) return mobileHandoff(c, await identify(c, devTokens(config.devToken)), mobile);
    return startOAuth(c, { returnTo: '/', mobile });
  });

  app.get('/callback', async (c) => {
    const raw = getCookie(c, OAUTH_COOKIE);
    deleteCookie(c, OAUTH_COOKIE, { path: '/auth' });
    const opened = raw ? s.sealer.open(raw) : null;
    const saved = opened ? (JSON.parse(opened) as OAuthState) : null;
    const code = c.req.query('code');
    /** Errors go to wherever the login started: the login page, or back into the app. */
    const fail = (error: string) => c.redirect(saved?.mobile ? appRedirect(saved.mobile, { error }) : `/login?error=${encodeURIComponent(error)}`);
    if (c.req.query('error')) return fail(c.req.query('error')!);
    if (!saved || !code || saved.state !== c.req.query('state') || Date.now() - saved.t > 600_000) return fail('invalid_state');
    try {
      const tokens = await exchange(s, {
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        code_verifier: saved.verifier,
      });
      const who = await identify(c, tokens);
      return saved.mobile ? mobileHandoff(c, who, saved.mobile) : cookieLogin(c, who, saved.returnTo);
    } catch (err) {
      // undici reports network failures as a bare "fetch failed"; the useful part (ENOTFOUND, ECONNREFUSED, TLS…) is in `cause`.
      const cause = (err as { cause?: { code?: string; message?: string } }).cause;
      console.error('[auth] token exchange failed:', (err as Error).message, cause ? `(${cause.code ?? cause.message})` : '');
      return fail('token_exchange');
    }
  });

  /** The app trades its one-time code and PKCE verifier for the session id it will send as a bearer token. */
  app.post('/mobile/token', async (c) => {
    if (!mobileEnabled) return c.json({ error: 'not_found' }, 404);
    const body = mobileTokenBody.safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: 'invalid_request' }, 400);
    const grant = handoff.redeem(body.data.code, body.data.code_verifier);
    if (!grant) return c.json({ error: 'invalid_grant' }, 400);
    c.header('Cache-Control', 'no-store');
    return c.json(grant);
  });

  app.post('/logout', (c) => {
    const id = sessionIdFrom(c);
    if (id) s.sessions.delete(id);
    deleteCookie(c, SESSION_COOKIE, { path: '/' });
    return c.body(null, 204);
  });

  return app;
}

async function exchange(s: Services, params: Record<string, string>): Promise<OAuthTokens> {
  const body = new URLSearchParams({ client_id: s.config.FIREFLY_OAUTH_CLIENT_ID, ...params });
  if (s.config.FIREFLY_OAUTH_CLIENT_SECRET) body.set('client_secret', s.config.FIREFLY_OAUTH_CLIENT_SECRET);
  const res = await s.fetch(`${s.config.FIREFLY_INTERNAL_URL}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body,
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`oauth/token ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as TokenResponse;
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? params['refresh_token'] ?? null,
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
  };
}

const devTokens = (accessToken: string): OAuthTokens => ({ accessToken, refreshToken: null, expiresAt: Date.now() + DEV_TOKEN_TTL });

function staticTokens(token: string): TokenProvider {
  return { accessToken: async () => token, refresh: async () => null };
}

const refreshing = new Map<string, Promise<OAuthTokens | null>>();

/** Token provider bound to a session: refreshes proactively (60 s before expiry) and on 401. */
function sessionTokens(s: Services, session: Session): TokenProvider {
  const refresh = async (): Promise<string | null> => {
    const current = s.sessions.get(session.id);
    if (!current?.tokens.refreshToken) return null;
    let pending = refreshing.get(session.id);
    if (!pending) {
      pending = exchange(s, { grant_type: 'refresh_token', refresh_token: current.tokens.refreshToken, scope: '' })
        .then((t) => {
          s.sessions.updateTokens(session.id, t);
          session.tokens = t;
          return t;
        })
        .catch((err) => {
          console.warn('[auth] refresh failed:', (err as Error).message);
          s.sessions.delete(session.id);
          return null;
        })
        .finally(() => refreshing.delete(session.id));
      refreshing.set(session.id, pending);
    }
    return (await pending)?.accessToken ?? null;
  };
  return {
    accessToken: async () => {
      if (session.tokens.expiresAt - 60_000 < Date.now() && session.tokens.refreshToken) {
        const t = await refresh();
        if (t) return t;
      }
      return session.tokens.accessToken;
    },
    refresh,
  };
}

/** Requires a valid session and exposes a per-user `FireflyData` on the context. */
export function requireSession(s: Services): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const id = sessionIdFrom(c);
    const session = id ? s.sessions.get(id) : null;
    if (!session) return c.json({ error: 'unauthenticated' }, 401);
    const client = new FireflyClient(s.config.FIREFLY_INTERNAL_URL, sessionTokens(s, session), s.fetch);
    c.set('session', session);
    c.set('writer', client);
    c.set('data', new FireflyData(client, s.cache, session.userId, s.config, s.db));
    return next();
  };
}
