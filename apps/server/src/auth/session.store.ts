import type { Db } from '../db/sqlite';
import { hashId, randomToken, type Sealer } from './crypto';

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string | null;
  /** Epoch ms when the access token expires. */
  expiresAt: number;
}

export interface Session {
  id: string;
  userId: string;
  email: string;
  tokens: OAuthTokens;
  expiresAt: number;
}

interface SessionRow {
  id: string;
  user_id: string;
  email: string;
  tokens: string;
  expires_at: number;
}

/** Server-side sessions; tokens are stored AES-GCM sealed and never leave the server. */
export class SessionStore {
  constructor(
    private readonly db: Db,
    private readonly sealer: Sealer,
    private readonly ttlMs: number,
  ) {}

  create(userId: string, email: string, tokens: OAuthTokens): Session {
    const id = randomToken(32);
    const now = Date.now();
    const expiresAt = now + this.ttlMs;
    this.db
      .prepare('INSERT INTO sessions (id, user_id, email, tokens, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(hashId(id), userId, email, this.sealer.seal(JSON.stringify(tokens)), expiresAt, now);
    return { id, userId, email, tokens, expiresAt };
  }

  get(id: string): Session | null {
    const row = this.db.prepare('SELECT * FROM sessions WHERE id = ?').get(hashId(id)) as SessionRow | undefined;
    if (!row) return null;
    if (row.expires_at < Date.now()) {
      this.delete(id);
      return null;
    }
    const raw = this.sealer.open(row.tokens);
    if (!raw) {
      this.delete(id);
      return null;
    }
    return { id, userId: row.user_id, email: row.email, tokens: JSON.parse(raw) as OAuthTokens, expiresAt: row.expires_at };
  }

  updateTokens(id: string, tokens: OAuthTokens): void {
    this.db.prepare('UPDATE sessions SET tokens = ? WHERE id = ?').run(this.sealer.seal(JSON.stringify(tokens)), hashId(id));
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM sessions WHERE id = ?').run(hashId(id));
  }

  purgeExpired(): void {
    this.db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
  }
}
