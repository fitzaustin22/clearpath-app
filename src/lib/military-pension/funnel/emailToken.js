// Signed unsubscribe tokens. The token is base64url(email).base64url(HMAC(email)),
// so the route can recover the (normalized) email server-side without a raw
// address in the URL and without a DB token column — and any tampering fails the
// HMAC check. Used by the report email's unsubscribe link and the unsubscribe route.
import { createHmac, timingSafeEqual } from 'node:crypto';

const b64url = (buf) =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const fromB64url = (str) => Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

const sign = (email, secret) => createHmac('sha256', secret).update(email).digest();

/** Build a tamper-proof unsubscribe token for an email (normalized lower-case). */
export function signEmailToken(email, secret) {
  const norm = String(email).trim().toLowerCase();
  return `${b64url(Buffer.from(norm, 'utf8'))}.${b64url(sign(norm, secret))}`;
}

/** Verify a token; return the embedded email if valid, else null. */
export function verifyEmailToken(token, secret) {
  if (typeof token !== 'string' || !token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  let email;
  try {
    email = fromB64url(parts[0]).toString('utf8');
  } catch {
    return null;
  }
  if (!email || !email.includes('@')) return null;
  let given;
  try {
    given = fromB64url(parts[1]);
  } catch {
    return null;
  }
  const expected = sign(email, secret);
  if (given.length !== expected.length) return null;
  return timingSafeEqual(given, expected) ? email : null;
}
