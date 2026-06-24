// Lead-write wrapper: persists email + this magnet, and on the composite-unique
// (email, magnet_id) conflict does nothing else (ignoreDuplicates).
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { upsert, from } = vi.hoisted(() => {
  const upsert = vi.fn(async () => ({ error: null }));
  const from = vi.fn(() => ({ upsert }));
  return { upsert, from };
});
vi.mock('@/src/lib/supabase/server', () => ({ supabaseAdmin: { from } }));

import { upsertLead, MAGNET_ID } from '../leadStore';

beforeEach(() => { upsert.mockClear(); from.mockClear(); upsert.mockResolvedValue({ error: null }); });

describe('upsertLead', () => {
  it("writes to leads with magnet 'military-pension-tool' and the on-conflict do-nothing target", async () => {
    await upsertLead('user@example.com');
    expect(MAGNET_ID).toBe('military-pension-tool');
    expect(from).toHaveBeenCalledWith('leads');
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'user@example.com', magnet_id: 'military-pension-tool', source: 'military-pension-value-tool' }),
      expect.objectContaining({ onConflict: 'email,magnet_id', ignoreDuplicates: true }),
    );
  });

  it('throws when Supabase returns an error (so the caller can swallow it best-effort)', async () => {
    upsert.mockResolvedValueOnce({ error: new Error('db down') });
    await expect(upsertLead('user@example.com')).rejects.toThrow('db down');
  });
});
