import { z } from 'zod';

const bool = z
  .enum(['true', 'false', '1', '0'])
  .transform((v) => v === 'true' || v === '1');

const list = z
  .string()
  .default('')
  .transform((v) =>
    v
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );

/** Comma-separated values kept exactly as written (redirect URIs and Access client ids are case-sensitive). */
const exactList = z
  .string()
  .default('')
  .transform((v) =>
    v
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    APP_URL: z.url().default('http://localhost:4200'),
    PORT: z.coerce.number().int().positive().default(3000),
    FIREFLY_INTERNAL_URL: z.url(),
    FIREFLY_PUBLIC_URL: z.url(),
    FIREFLY_OAUTH_CLIENT_ID: z.string().min(1),
    FIREFLY_OAUTH_CLIENT_SECRET: z.string().default(''),
    /** Development only: bypasses OAuth with a Personal Access Token. Ignored in production. */
    DEV_FIREFLY_TOKEN: z.string().optional(),
    SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
    SESSION_TTL_DAYS: z.coerce.number().positive().default(30),
    CF_ACCESS_ENABLED: bool.default(true),
    CF_ACCESS_TEAM_DOMAIN: z.string().default(''),
    CF_ACCESS_AUD: z.string().default(''),
    CF_ACCESS_ALLOWED_EMAILS: list,
    /** Client ids of Access service tokens (the mobile app sends them) allowed through on the API routes. */
    CF_ACCESS_SERVICE_TOKEN_IDS: exactList,
    /** Redirect URIs the mobile app may use after login, e.g. `spacefly://auth/callback`. Empty disables the mobile login. */
    MOBILE_REDIRECT_URIS: exactList,
    FX_FALLBACK_PROVIDER: z.enum(['open.er-api', 'none']).default('open.er-api'),
    DISPLAY_CURRENCIES: z.string().default('DOP,USD'),
    CACHE_TTL_CURRENT_MONTH: z.coerce.number().int().positive().default(300),
    CACHE_TTL_CLOSED_MONTH: z.coerce.number().int().positive().default(60 * 60 * 24 * 7),
    MIN_FIREFLY_VERSION: z.string().default('6.6.0'),
    DATA_DIR: z.string().default('./data'),
    STATIC_DIR: z.string().default('./dist/SpaceFly/browser'),
  })
  .superRefine((env, ctx) => {
    if (env.CF_ACCESS_ENABLED && (!env.CF_ACCESS_TEAM_DOMAIN || !env.CF_ACCESS_AUD)) {
      ctx.addIssue({
        code: 'custom',
        message: 'CF_ACCESS_TEAM_DOMAIN and CF_ACCESS_AUD are required when CF_ACCESS_ENABLED=true',
        path: ['CF_ACCESS_AUD'],
      });
    }
  });

export type Config = z.infer<typeof schema> & {
  displayCurrencies: string[];
  secureCookies: boolean;
  devToken: string | null;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid configuration:\n${issues}`);
  }
  const c = parsed.data;
  return {
    ...c,
    FIREFLY_INTERNAL_URL: c.FIREFLY_INTERNAL_URL.replace(/\/+$/, ''),
    FIREFLY_PUBLIC_URL: c.FIREFLY_PUBLIC_URL.replace(/\/+$/, ''),
    APP_URL: c.APP_URL.replace(/\/+$/, ''),
    displayCurrencies: c.DISPLAY_CURRENCIES.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean),
    secureCookies: c.APP_URL.startsWith('https://'),
    devToken: c.NODE_ENV !== 'production' && c.DEV_FIREFLY_TOKEN ? c.DEV_FIREFLY_TOKEN : null,
  };
}
