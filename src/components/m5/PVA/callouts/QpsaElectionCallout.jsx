'use client';

import { T } from '@/src/lib/brand/tokens';

/**
 * §7.9.2 — qpsa_election_callout. Runtime: {}.
 */
export default function QpsaElectionCallout() {
  return (
    <div
      data-testid="callout-qpsa_election_callout"
      style={{
        background: T.PARCHMENT,
        color: T.NAVY,
        border: `1px solid ${T.NAVY_12}`,
        borderRadius: 6,
        padding: '12px 16px',
        marginBottom: 12,
        fontFamily: T.FONT_BODY,
        fontSize: 14,
        lineHeight: 1.5,
      }}
    >
      <p style={{ margin: 0 }}>
        <strong>Qualified Pre-Retirement Survivor Annuity (QPSA).</strong> If a QDRO elects QPSA for the alternate payee, the alternate payee receives benefits if the participant dies before retirement. ERISA-governed plans must offer QPSA. Electing QPSA typically reduces the participant's accrued benefit by 1–3%. PVA at v1 does not model this reduction — the QPSA decision is a QDRO mechanic captured in QDRO Decision Guide §8.5. (Reduction modeling is on the v1.1 roadmap.)
      </p>
    </div>
  );
}
