/**
 * Badge derivation — turn a store status enum (+ ACTIVE overlay) into the
 * design's 4-badge presentation contract:
 *
 *   stored `complete`  →  FILLED       (pill class: 'filled')
 *   stored `partial`   →  IN PROGRESS  (pill class: 'progress')
 *   stored `empty`     →  PENDING      (pill class: 'pending')
 *   derived ACTIVE     →  ACTIVE       (pill class: 'active')   ← overlay
 *
 * The ACTIVE overlay is exclusive: when `isActive === true`, badge is ACTIVE
 * regardless of the underlying stored status. (The store status is preserved on
 * the card's underlying state, but the badge label / pill color reflects the
 * ACTIVE designation.)
 *
 * Unknown stored statuses fall through to PENDING — defensive default for the
 * design surface, never a thrown error.
 */

export const BADGE = Object.freeze({
  FILLED:     { label: 'FILLED',      pillClass: 'filled' },
  PROGRESS:   { label: 'IN PROGRESS', pillClass: 'progress' },
  PENDING:    { label: 'PENDING',     pillClass: 'pending' },
  ACTIVE:     { label: 'ACTIVE',      pillClass: 'active' },
});

export function deriveBadge(status, isActive) {
  if (isActive) return BADGE.ACTIVE;
  switch (status) {
    case 'complete': return BADGE.FILLED;
    case 'partial':  return BADGE.PROGRESS;
    default:         return BADGE.PENDING;
  }
}
