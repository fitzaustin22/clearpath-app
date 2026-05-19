'use client';

/**
 * QDROAssetCard — the per-asset classifier surface (Q-C1/Q-C2). One card
 * per asset; perspective (§8.2) on top, plan-type (§8.3) below, both on
 * one screen (Q-C2, no sequential gating).
 *
 * Store contract note: m5Store.setQDROClassifiers(assetId, {userRole,
 * planType}) writes BOTH fields unconditionally — calling it with a single
 * key would null the sibling classifier. Every change handler therefore
 * reads the freshest sibling value (getState(), PVA precedent) and passes
 * it through alongside the field that changed.
 *
 * §10.7 clear-on-override: there is no PR1 setter that clears
 * _prePopSources, and stores are out of PR2 scope, so the override-clears-
 * the-badge behavior is honored at the presentation layer — the pre-pop
 * badge hides as soon as the current planType no longer matches the value
 * its _prePopSources.source implies (§8.3.4 category→default mapping).
 *
 * @param {object} props
 * @param {string} props.assetId qdroDecision.assets key
 * @param {{currentValue?: number}} [props.m2Item] matching M2 inventory
 *   item, supplied by the container for the §8.7.4 value display
 * @returns {JSX.Element | null}
 */

import { useM5Store } from '@/src/stores/m5Store';
import WizardCard from '@/src/components/wizard/WizardCard';
import WizardSection from '@/src/components/wizard/WizardSection';
import WizardRadio from '@/src/components/wizard/WizardRadio';
import { PLAN_TYPE_RADIO_CHOICES, routePlanType } from '@/src/lib/qdro';
import { T } from '@/src/lib/brand/tokens';
import QDROStillNotSureDiagnostic from './QDROStillNotSureDiagnostic.jsx';

// §8.2.2 role definitions surfaced to the user.
const ROLE_DEFINITIONS = {
  participant:
    'This plan covers your employment. You are dividing your own plan.',
  alternatePayee:
    "This plan covers your spouse's employment. You are receiving a portion of your spouse's plan.",
};

const PERSPECTIVE_OPTIONS = [
  { value: 'participant', label: 'Participant' },
  { value: 'alternatePayee', label: 'Alternate payee' },
];

// Build-phase educational copy (§8.8.1 — disclaimer copy is spec-locked,
// educational copy authored at build). `description` is the WizardRadio
// stacked choice differentiator; `tooltipContent` is the §8.3.5 per-radio
// clarifier surfacing the §8.8.1 "QDRO is colloquial" mechanic.
const PLAN_TYPE_COPY = {
  db_pension: {
    description:
      'A traditional pension: the plan promises a monthly benefit at retirement from a formula, not an account balance.',
    tooltipContent: 'Divided by a QDRO under ERISA.',
  },
  account_balance: {
    description:
      'An individual account with a balance you can look up — a 401(k), 403(b), or 457(b).',
    tooltipContent: 'Divided by a QDRO under ERISA.',
  },
  ira: {
    description:
      'An Individual Retirement Account — Traditional, Roth, SEP, or SIMPLE.',
    tooltipContent:
      "Divided by a §408(d)(6) transfer 'incident to divorce' — this is not a QDRO.",
  },
  federal_civilian: {
    description: 'Federal civilian service retirement — CSRS or FERS.',
    tooltipContent:
      'Requires a COAP processed by OPM — this is not an ERISA QDRO.',
  },
  military: {
    description:
      'Uniformed service retired pay — active duty, Reserve, or National Guard.',
    tooltipContent:
      'Divided under the USFSPA via DFAS — this is not an ERISA QDRO.',
  },
  state_municipal: {
    description: 'A state or local government employee retirement system.',
    tooltipContent:
      "Divided by a state DRO under the plan's own rules — this is not an ERISA QDRO.",
  },
};

const PLAN_TYPE_OPTIONS = PLAN_TYPE_RADIO_CHOICES.map((c) => ({
  value: c.id,
  label: c.label,
  description: PLAN_TYPE_COPY[c.id].description,
  tooltipContent: PLAN_TYPE_COPY[c.id].tooltipContent,
}));

// §8.3.4 — M2 category → pre-pop default planType. Used to detect override
// for §10.7 (current planType ≠ implied ⇒ user overrode ⇒ clear the badge).
const SOURCE_IMPLIED_PLANTYPE = {
  'm2.pensionClaim': 'private_db',
  'm2.retirementAsset': 'dc',
};

const PREPOP_BADGE_COPY = {
  'm2.pensionClaim': 'from M2 pension claim — review or override',
  'm2.retirementAsset': 'from M2 retirement asset — review or override',
};

function planTypePrePopBadge(asset) {
  const pp = asset._prePopSources?.planType;
  if (!pp || !pp.source) return null;
  const implied = SOURCE_IMPLIED_PLANTYPE[pp.source];
  // §10.7: once the user overrides to a different planType the attribution
  // no longer holds — hide the badge.
  if (implied && asset.planType !== implied) return null;
  return PREPOP_BADGE_COPY[pp.source] ?? null;
}

function radioChoiceIdForPlanType(planType) {
  const match = PLAN_TYPE_RADIO_CHOICES.find((c) => c.planType === planType);
  return match ? match.id : undefined;
}

export default function QDROAssetCard({ assetId, m2Item }) {
  const asset = useM5Store((s) => s.qdroDecision.assets[assetId]);
  const setQDROClassifiers = useM5Store((s) => s.setQDROClassifiers);

  if (!asset) return null;

  const currentAsset = () =>
    useM5Store.getState().qdroDecision.assets[assetId] ?? {};

  const handlePerspectiveChange = (_field, value) => {
    const a = currentAsset();
    setQDROClassifiers(assetId, {
      userRole: value,
      planType: a.planType ?? null,
    });
  };

  const applyPlanTypeFromChoice = (choiceId) => {
    const a = currentAsset();
    setQDROClassifiers(assetId, {
      userRole: a.userRole ?? null,
      planType: routePlanType(choiceId),
    });
  };

  const isClassified = asset.userRole != null && asset.planType != null;
  const badgeText = planTypePrePopBadge(asset);
  const planName = asset.planName || 'Untitled retirement asset';

  return (
    <div data-testid="qdro-asset-card">
      <WizardCard>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '12px',
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontFamily: T.FONT_DISPLAY,
              fontSize: '1.125rem',
              fontWeight: 600,
              color: T.NAVY,
            }}
          >
            {planName}
          </h3>
          {asset.employer ? (
            <p
              style={{
                margin: '2px 0 0',
                fontSize: '13px',
                color: T.INK_2,
                fontFamily: T.FONT_BODY,
              }}
            >
              {asset.employer}
            </p>
          ) : null}
          {m2Item && m2Item.currentValue != null ? (
            <p
              style={{
                margin: '2px 0 0',
                fontSize: '13px',
                color: T.INK_2,
                fontFamily: T.FONT_BODY,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              ${Number(m2Item.currentValue).toLocaleString('en-US')}
            </p>
          ) : null}
        </div>
        {isClassified ? (
          <span
            data-testid="qdro-asset-card-classified"
            style={{
              flexShrink: 0,
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: T.GREEN,
              border: `1px solid ${T.GREEN}`,
              borderRadius: '999px',
              padding: '2px 9px',
              fontFamily: T.FONT_BODY,
            }}
          >
            Classified
          </span>
        ) : null}
      </div>

      <WizardSection title="Your role for this asset" first>
        <WizardRadio
          field="userRole"
          legend="Whose plan is this?"
          legendHidden
          variant="segmented"
          value={asset.userRole ?? undefined}
          onChange={handlePerspectiveChange}
          options={PERSPECTIVE_OPTIONS}
          data-testid="qdro-perspective-radio"
        />
        <div
          style={{
            marginTop: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '12.5px',
              lineHeight: 1.45,
              color: T.INK_2,
              fontFamily: T.FONT_BODY,
            }}
          >
            <strong style={{ color: T.INK }}>Participant:</strong>{' '}
            {ROLE_DEFINITIONS.participant}
          </p>
          <p
            style={{
              margin: 0,
              fontSize: '12.5px',
              lineHeight: 1.45,
              color: T.INK_2,
              fontFamily: T.FONT_BODY,
            }}
          >
            <strong style={{ color: T.INK }}>Alternate payee:</strong>{' '}
            {ROLE_DEFINITIONS.alternatePayee}
          </p>
        </div>
      </WizardSection>

      <WizardSection title="What kind of retirement plan is this?">
        {badgeText ? (
          <div style={{ marginBottom: '10px' }}>
            <span
              data-testid="qdro-prepop-badge"
              title={badgeText}
              style={{
                display: 'inline-block',
                maxWidth: '260px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                verticalAlign: 'bottom',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.4px',
                color: T.PILL_TEXT,
                backgroundColor: T.PARCHMENT_DEEP,
                padding: '2px 8px',
                borderRadius: '999px',
                fontFamily: T.FONT_BODY,
              }}
            >
              {badgeText}
            </span>
          </div>
        ) : null}
        <WizardRadio
          field="planType"
          legend="Plan type"
          legendHidden
          variant="stacked"
          value={radioChoiceIdForPlanType(asset.planType)}
          onChange={(_f, choiceId) => applyPlanTypeFromChoice(choiceId)}
          options={PLAN_TYPE_OPTIONS}
          data-testid="qdro-plantype-radio"
        />
        <QDROStillNotSureDiagnostic onAccept={applyPlanTypeFromChoice} />
      </WizardSection>
      </WizardCard>
    </div>
  );
}
