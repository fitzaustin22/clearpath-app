// Unsubscribe orchestration. Verifies the signed token (recovering the email
// without a raw address in the URL), then adds it to the suppression list.
import { verifyEmailToken } from './emailToken';

/**
 * @param {string} token  the signed token from the unsubscribe link
 * @param {{ secret: string, addSuppression: (email: string) => Promise<void> }} deps
 */
export async function handleUnsubscribe(token, deps) {
  const email = verifyEmailToken(token, deps.secret);
  if (!email) return { ok: false, status: 400, error: 'Invalid or expired unsubscribe link.' };
  await deps.addSuppression(email);
  return { ok: true, email };
}
