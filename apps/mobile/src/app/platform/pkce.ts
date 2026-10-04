import { isAndroid, isIOS } from '@nativescript/core';
import { sha256 } from '@noble/hashes/sha2.js';

declare const java: any;
declare const interop: any;
declare const NSMutableData: any;
declare const SecRandomCopyBytes: any;
declare const kSecRandomDefault: any;

/** Cryptographically secure random bytes from the operating system (the JS runtimes here have no `crypto.getRandomValues`). */
export function secureRandomBytes(length: number): Uint8Array {
  const out = new Uint8Array(length);
  if (isAndroid) {
    const bytes = Array.create('byte', length);
    new java.security.SecureRandom().nextBytes(bytes);
    for (let i = 0; i < length; i++) out[i] = bytes[i] & 0xff;
    return out;
  }
  if (isIOS) {
    const data = NSMutableData.dataWithLength(length);
    if (SecRandomCopyBytes(kSecRandomDefault, length, data.mutableBytes) !== 0) throw new Error('SecRandomCopyBytes failed');
    out.set(new Uint8Array(interop.bufferFromData(data)));
    return out;
  }
  throw new Error('No secure random source on this platform');
}

export function base64Url(bytes: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    out += alphabet[(n >> 18) & 63] + alphabet[(n >> 12) & 63];
    if (i + 1 < bytes.length) out += alphabet[(n >> 6) & 63];
    if (i + 2 < bytes.length) out += alphabet[n & 63];
  }
  return out;
}

export interface Pkce {
  verifier: string;
  challenge: string;
}

/** A PKCE (RFC 7636) pair: a 64-character verifier and its S256 challenge. `random` is injectable for tests. */
export function createPkce(random: (length: number) => Uint8Array = secureRandomBytes): Pkce {
  const verifier = base64Url(random(48)); // 48 bytes → 64 base64url characters
  return { verifier, challenge: base64Url(sha256(new TextEncoder().encode(verifier))) };
}

export const randomState = (random: (length: number) => Uint8Array = secureRandomBytes): string => base64Url(random(16));
