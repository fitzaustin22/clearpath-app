// Unsubscribe-token helper: a signed token that recovers the email server-side
// WITHOUT putting a raw email in the URL, and is tamper-proof (HMAC). No DB
// token column needed — the token IS base64url(email).HMAC(email, secret).
import { describe, it, expect } from 'vitest';
import { signEmailToken, verifyEmailToken } from '../emailToken';

const SECRET = 'test-secret-123';

describe('emailToken — HMAC unsubscribe tokens', () => {
  it('round-trips: a signed token verifies back to the same email', () => {
    const t = signEmailToken('User@Example.com', SECRET);
    expect(verifyEmailToken(t, SECRET)).toBe('user@example.com'); // normalized lower-case
  });

  it('does not expose the raw email in the token (no "@", no plaintext address)', () => {
    const t = signEmailToken('user@example.com', SECRET);
    expect(t).not.toContain('user@example.com');
    expect(t).not.toContain('@');
  });

  it('rejects a tampered token (returns null)', () => {
    const t = signEmailToken('user@example.com', SECRET);
    const tampered = t.slice(0, -2) + (t.endsWith('aa') ? 'bb' : 'aa');
    expect(verifyEmailToken(tampered, SECRET)).toBeNull();
  });

  it('rejects a token signed with a different secret', () => {
    const t = signEmailToken('user@example.com', SECRET);
    expect(verifyEmailToken(t, 'other-secret')).toBeNull();
  });

  it('rejects malformed tokens', () => {
    expect(verifyEmailToken('', SECRET)).toBeNull();
    expect(verifyEmailToken('nodot', SECRET)).toBeNull();
    expect(verifyEmailToken('a.b.c', SECRET)).toBeNull();
    expect(verifyEmailToken(null, SECRET)).toBeNull();
  });
});
