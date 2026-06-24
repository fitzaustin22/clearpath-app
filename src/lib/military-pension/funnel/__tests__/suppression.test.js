// Suppression wrapper: isSuppressed reflects a matching row; addSuppression upserts
// idempotently on the email primary key.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { maybeSingle, eq, select, upsert, from } = vi.hoisted(() => {
  const maybeSingle = vi.fn(async () => ({ data: null, error: null }));
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const upsert = vi.fn(async () => ({ error: null }));
  const from = vi.fn(() => ({ select, upsert }));
  return { maybeSingle, eq, select, upsert, from };
});
vi.mock('@/src/lib/supabase/server', () => ({ supabaseAdmin: { from } }));

import { isSuppressed, addSuppression } from '../suppression';

beforeEach(() => { [maybeSingle, eq, select, upsert, from].forEach((m) => m.mockClear()); });

describe('suppression', () => {
  it('isSuppressed → false when no row matches', async () => {
    maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    expect(await isSuppressed('a@b.com')).toBe(false);
    expect(from).toHaveBeenCalledWith('email_suppressions');
    expect(eq).toHaveBeenCalledWith('email', 'a@b.com');
  });

  it('isSuppressed → true when a row exists', async () => {
    maybeSingle.mockResolvedValueOnce({ data: { email: 'a@b.com' }, error: null });
    expect(await isSuppressed('a@b.com')).toBe(true);
  });

  it('addSuppression upserts idempotently on the email key', async () => {
    await addSuppression('a@b.com');
    expect(from).toHaveBeenCalledWith('email_suppressions');
    expect(upsert).toHaveBeenCalledWith(
      { email: 'a@b.com' },
      expect.objectContaining({ onConflict: 'email', ignoreDuplicates: true }),
    );
  });
});
