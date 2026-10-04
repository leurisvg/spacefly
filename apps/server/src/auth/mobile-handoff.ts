import { timingSafeEqual } from 'node:crypto';
import { hashId, randomToken, sha256Base64Url } from './crypto';

const CODE_TTL_MS = 60_000;
const MAX_PENDING = 1000;

interface Pending {
  /** PKCE challenge the app sent when it started the login. */
  challenge: string;
  /** The raw session id; it becomes the app's bearer token. Only ever held here, in memory, for at most a minute. */
  sessionId: string;
  email: string;
  sessionExpiresAt: number;
  expiresAt: number;
}

export interface MobileGrant {
  token: string;
  expiresAt: number;
  email: string;
}

/**
 * One-time codes that carry a finished login from the system browser back to the app (RFC 7636 style):
 * the redirect only ever contains a short-lived code, and the code is worthless without the PKCE verifier
 * the app kept to itself. Codes live in memory for 60 s and are stored hashed. Any redemption attempt burns
 * the code (a wrong verifier can't be retried) and drops the session it was going to hand out.
 */
export class MobileHandoff {
  private readonly pending = new Map<string, Pending>();

  /** `discard` removes a session that will never be handed out. */
  constructor(private readonly discard: (sessionId: string) => void) {}

  issue(input: { challenge: string; sessionId: string; email: string; sessionExpiresAt: number }): string {
    this.purge();
    if (this.pending.size >= MAX_PENDING) {
      const [oldest] = this.pending.keys();
      if (oldest) this.drop(oldest);
    }
    const code = randomToken(32);
    this.pending.set(hashId(code), { ...input, expiresAt: Date.now() + CODE_TTL_MS });
    return code;
  }

  /** The grant for a valid, unexpired code and its PKCE verifier; `null` otherwise. Never works twice. */
  redeem(code: string, verifier: string): MobileGrant | null {
    this.purge();
    const key = hashId(code);
    const entry = this.pending.get(key);
    if (!entry) return null;
    this.pending.delete(key);
    const expected = Buffer.from(entry.challenge);
    const actual = Buffer.from(sha256Base64Url(verifier));
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      this.discard(entry.sessionId);
      return null;
    }
    return { token: entry.sessionId, expiresAt: entry.sessionExpiresAt, email: entry.email };
  }

  private drop(key: string): void {
    const entry = this.pending.get(key);
    this.pending.delete(key);
    if (entry) this.discard(entry.sessionId);
  }

  private purge(): void {
    const now = Date.now();
    for (const [key, entry] of this.pending) if (entry.expiresAt < now) this.drop(key);
  }
}
