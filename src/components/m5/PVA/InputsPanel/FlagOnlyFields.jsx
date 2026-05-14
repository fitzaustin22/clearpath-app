'use client';

/**
 * FlagOnlyFields — informational panel for plan types that cannot be valued
 * via the standard PVA engine at v1 per spec §7.2 R1.
 *
 * Surfaces a short, plan-type-aware advisory and a pointer to the educational
 * callout that ResultsPanel will render. No editable fields beyond what's
 * captured in CommonFields + PlanTypeSelector.
 *
 * Full educational callout stack (§7.9.1 CP.1–CP.5) ships in PR 3.
 */

import { FieldSection } from './_fields.jsx';
import { T } from '@/src/lib/brand/tokens';

const COPY_BY_PLAN_TYPE = {
  multi_employer:
    'Multi-employer / collectively-bargained pensions value via plan-administrator actuarial methods, not the §417(e)-based PVA engine. Surface for specialist valuation.',
  gov_civilian:
    'CSRS / FERS pensions value under OPM-specific commutation rules outside the PVA engine. Surface for specialist valuation.',
  military:
    'Military retired pay values under USFSPA / DFAS-specific rules. Surface for specialist valuation.',
  state_municipal:
    'State and municipal pensions value under jurisdiction-specific commutation rules. Surface for specialist valuation.',
};

export default function FlagOnlyFields({ planType }) {
  const copy = COPY_BY_PLAN_TYPE[planType] ?? 'This plan type cannot be valued via the PVA engine at v1.';
  return (
    <FieldSection title="Flag-only — specialist valuation required">
      <p
        style={{
          fontFamily: T.FONT_BODY,
          fontSize: 14,
          color: T.NAVY,
          margin: 0,
          lineHeight: 1.5,
        }}
        data-testid="pva-flagonly-copy"
      >
        {copy}
      </p>
      <p
        style={{
          fontFamily: T.FONT_BODY,
          fontSize: 13,
          color: T.NAVY_55,
          margin: '8px 0 0 0',
          lineHeight: 1.5,
        }}
      >
        PVA will record this plan's metadata for the marital estate, but PV is not computed at v1.
        See the educational callout below the inputs for valuation context and routing recommendations.
      </p>
    </FieldSection>
  );
}
