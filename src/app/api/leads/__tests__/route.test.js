// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const upsert = vi.fn();
const from = vi.fn(() => ({ upsert }));
vi.mock('@/src/lib/supabase/server', () => ({ supabaseAdmin: { from: (...args) => from(...args) } }));

import { POST } from '@/src/app/api/leads/route';

const VALID = {
  email: ' Reader@Example.com ',
  magnetId: 'financial-clarity-checklist',
  source: 'homepage-checklist',
  website: '',
};

function post(body) {
  return POST(
    new Request('http://localhost/api/leads', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  );
}

describe('POST /api/leads', () => {
  beforeEach(() => {
    upsert.mockReset();
    upsert.mockResolvedValue({ error: null });
    from.mockClear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('stores a valid lead with a normalized email and returns ok', async () => {
    const res = await post(VALID);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(from).toHaveBeenCalledWith('leads');
    expect(upsert).toHaveBeenCalledTimes(1);
    const [row, options] = upsert.mock.calls[0];
    expect(row).toMatchObject({
      email: 'reader@example.com',
      magnet_id: 'financial-clarity-checklist',
      source: 'homepage-checklist',
    });
    expect(Number.isNaN(Date.parse(row.consent_at))).toBe(false);
    expect(options).toEqual({ onConflict: 'email,magnet_id', ignoreDuplicates: true });
  });

  it('silently drops honeypot submissions without writing', async () => {
    const res = await post({ ...VALID, website: 'https://spam.example' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(upsert).not.toHaveBeenCalled();
  });

  it.each([
    ['a missing email', { ...VALID, email: undefined }],
    ['a malformed email', { ...VALID, email: 'not-an-email' }],
    ['an over-long email', { ...VALID, email: `${'a'.repeat(250)}@example.com` }],
    ['an unknown magnet', { ...VALID, magnetId: 'something-else' }],
  ])('rejects %s with 400 and writes nothing', async (_label, body) => {
    const res = await post(body);
    expect(res.status).toBe(400);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('rejects invalid JSON with 400', async () => {
    const res = await post('{not json');
    expect(res.status).toBe(400);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('rejects an oversized body even when no content-length is declared', async () => {
    const res = await post({ ...VALID, source: 'x'.repeat(10_001) });
    expect(res.status).toBe(413);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('measures bytes, not characters', async () => {
    // 3,000 four-byte characters: 6,000 UTF-16 units but 12,000 bytes.
    const res = await post({ ...VALID, source: '😀'.repeat(3_000) });
    expect(res.status).toBe(413);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('caps the stored source at 100 characters', async () => {
    await post({ ...VALID, source: 's'.repeat(500) });
    expect(upsert.mock.calls[0][0].source).toHaveLength(100);
  });

  it('returns a generic 500 when the database write fails', async () => {
    upsert.mockResolvedValue({ error: { message: 'relation "leads" does not exist' } });
    const res = await post(VALID);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Internal server error' });
  });
});
