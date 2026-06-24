// Unsubscribe orchestration: verify the signed token, then add the email to the
// suppression list. Invalid/tampered tokens suppress nothing.
import { describe, it, expect, vi } from 'vitest';
import { handleUnsubscribe } from '../unsubscribe';
import { signEmailToken } from '../emailToken';

const SECRET = 'unsub-secret';

describe('handleUnsubscribe', () => {
  it('valid token: adds the embedded email to the suppression list', async () => {
    const addSuppression = vi.fn(async () => {});
    const token = signEmailToken('user@example.com', SECRET);
    const r = await handleUnsubscribe(token, { secret: SECRET, addSuppression });
    expect(r.ok).toBe(true);
    expect(r.email).toBe('user@example.com');
    expect(addSuppression).toHaveBeenCalledWith('user@example.com');
  });

  it('invalid/tampered token: suppresses nothing and reports failure', async () => {
    const addSuppression = vi.fn(async () => {});
    const r = await handleUnsubscribe('garbage.token', { secret: SECRET, addSuppression });
    expect(r.ok).toBe(false);
    expect(addSuppression).not.toHaveBeenCalled();
  });
});
