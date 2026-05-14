'use client';

import { useState } from 'react';
import { T } from '@/src/lib/brand/tokens';

/**
 * §7.9.3 — "Coverture rationale" expandable (Tier 3 only).
 *
 * Spec-pinned copy verbatim per LL-25 — including the case-law citations
 * (Bender, Mosley, Deering, Lehman) which are required by spec.
 */
export default function CovertureRationale() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      data-testid="coverture-rationale"
      style={{
        marginTop: '1rem',
        border: `1px solid ${T.NAVY_12}`,
        borderRadius: 6,
        background: T.CARD,
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        data-testid="coverture-rationale-toggle"
        style={{
          width: '100%',
          textAlign: 'left',
          padding: '0.5rem 1rem',
          background: T.PARCHMENT,
          color: T.NAVY,
          border: 'none',
          borderBottom: expanded ? `1px solid ${T.NAVY_12}` : 'none',
          fontFamily: T.FONT_BODY,
          cursor: 'pointer',
          borderRadius: 6,
        }}
      >
        {expanded ? '▼' : '▶'} Want to learn more? How coverture works
      </button>
      {expanded && (
        <div
          data-testid="coverture-rationale-body"
          style={{
            padding: '1rem',
            fontFamily: T.FONT_BODY,
            color: T.NAVY,
            fontSize: 14,
            lineHeight: 1.55,
          }}
        >
          <p style={{ marginTop: 0 }}>
            Coverture (also called the 'time rule') is the fraction of the pension that's marital property. The numerator is the period of the marriage that overlapped with employment at the plan; the denominator is the total projected employment period at the plan (from hire to expected retirement).
          </p>
          <p>Marital portion = total PV × coverture fraction.</p>
          <p>Two flavors of coverture exist in CDFA practice:</p>
          <ol style={{ paddingLeft: '1.25rem' }}>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Frozen-at-valuation-date</strong> (PVA's v1 approach): Marital portion is the coverture fraction × the accrued benefit AS OF the valuation date. Doesn't require salary projection. Simple and defensible. Most VA / MD / DC practice favors this. Authority: <em>Bender v. Bender</em>, 297 A.2d 786 (DC 1972); <em>Mosley v. Mosley</em>, 19 Va. App. 192, 450 S.E.2d 161 (1994); <em>Deering v. Deering</em>, 292 Md. 115, 437 A.2d 883 (1981).
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Projected-at-retirement</strong>: Marital portion is the coverture fraction × the projected benefit AT retirement. Captures more of the marital contribution to the projected benefit but requires a salary growth assumption. CA practice often uses this variant. Authority: <em>In re Marriage of Lehman</em>, 18 Cal. 4th 169 (1998).
            </li>
          </ol>
          <p>PVA at v1 uses the simpler frozen-at-valuation-date approach exclusively. v1.1 may add the projected-at-retirement variant.</p>
          <p>
            <strong>Why the denominator end-date is <code style={{ fontFamily: T.FONT_BODY }}>expectedRetirementAge</code>, not <code style={{ fontFamily: T.FONT_BODY }}>planNRA</code>:</strong> The 'time rule' canonically uses TOTAL PROJECTED SERVICE (hire-to-actual-retirement), not hire-to-NRA. If you expect to retire early (say age 62 vs NRA 65), the denominator is shorter and the marital fraction is HIGHER (favorable to the non-employee spouse). If you expect to retire late (age 68 vs NRA 65), the denominator is longer and the marital fraction is LOWER (favorable to the employee spouse). This matches VA/MD/DC practice. PVA defaults <code style={{ fontFamily: T.FONT_BODY }}>expectedRetirementAge = planNRA</code>; override only if you genuinely expect to retire at a different age.
          </p>
          <p>
            The marital cutoff date depends on your state. In Virginia, it's typically the date of separation; some states use the date of filing or the date of the final decree. Ask your attorney for the cutoff date your state uses — entering the wrong date can materially change the marital portion.
          </p>
          <p style={{ marginBottom: 0 }}>
            Note on marriage-before-hire cases: if your marriage predates your hire date at this plan, the coverture numerator collapses to your entire pre-cutoff employment period at this plan (the formula correctly uses <code style={{ fontFamily: T.FONT_BODY }}>max(hire, marriage)</code> for the numerator start). The pension is fully marital up to the cutoff date in this case.
          </p>
        </div>
      )}
    </div>
  );
}
