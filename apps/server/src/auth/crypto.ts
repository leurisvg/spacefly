import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes } from 'node:crypto';

/** AES-256-GCM sealing of small payloads (tokens, OAuth state) with a key derived from SESSION_SECRET. */
export class Sealer {
  private readonly key: Buffer;

  constructor(secret: string, purpose = 'spacefly/session') {
    this.key = Buffer.from(hkdfSync('sha256', secret, 'spacefly', purpose, 32));
  }

  seal(plain: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, data]).toString('base64url');
  }

  /** Returns null when the payload was tampered with or sealed with another key. */
  open(sealed: string): string | null {
    try {
      const buf = Buffer.from(sealed, 'base64url');
      const iv = buf.subarray(0, 12);
      const tag = buf.subarray(12, 28);
      const data = buf.subarray(28);
      const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
    } catch {
      return null;
    }
  }
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function sha256Base64Url(input: string): string {
  return createHash('sha256').update(input).digest('base64url');
}

/** Stable, non-reversible id for storing session rows (the cookie holds the raw id). */
export function hashId(id: string): string {
  return createHash('sha256').update(id).digest('hex');
}
