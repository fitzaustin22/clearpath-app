'use client';

/**
 * QDROBranchDB — private defined-benefit branch decision-capture UI
 * (§8.5.3 / §8.6.3). Five spec-locked questions:
 *
 *   Q1  interestStructure        (Type-A: wording flips on userRole)
 *   Q2  qpsa                     (Type-A)
 *   Q3  qjsa                     (Type-A)
 *   Q4  cola                     (Type-B: single wording)
 *   Q5  earlyRetirementSubsidy   (Type-B)
 *
 * Each question carries a "Why this matters" educational card rendered
 * ABOVE the radio group, always visible (no disclosure / collapse — those
 * are deferred). The treatment is informational/neutral, NOT alert /
 * warning / disclaimer chrome (D-distinct from QDGNotLegalOrder).
 *
 * Owns ONLY the 5 decision fields. planName/employer/userRole are owned
 * by the classifier upstream. Persistence is the shipped m5Store
 * partial-merge idiom `updateQDRODecision(assetId, { field: value })`.
 *
 * §8.6.3 entry callout renders when `asset.pvSource == null`. PR-B2 will
 * extend §8.6.2/§8.6.4/§8.6.5 (per-perspective PV display, callout
 * extension, packet embed) at the marked seam — those are explicitly out
 * of PR-B scope.
 *
 * Wizard-native per WIZARD_DESIGN_SPEC: WizardSection + WizardRadio
 * primitives carry the a11y semantics (real <fieldset role="radiogroup">,
 * <legend>, native <input type="radio"> with aria-labelledby).
 *
 * @param {object} props
 * @param {string} props.assetId qdroDecision.assets key
 * @param {'participant'|'alternatePayee'} props.userRole §8.2 perspective
 *                       (non-'participant' values fall back to alternatePayee,
 *                       mirroring the QDROBranchDC convention)
 * @returns {JSX.Element | null}
 */

import { useM5Store } from '@/src/stores/m5Store';
import WizardSection from '@/src/components/wizard/WizardSection';
import WizardRadio from '@/src/components/wizard/WizardRadio';
import { T } from '@/src/lib/brand/tokens';
import QDROBranchDBPVDisplay from './QDROBranchDBPVDisplay.jsx';

// §8.6.3 entry callout — verbatim, spec-locked.
const PVA_NOT_RUN_CALLOUT =
  "We don't have a PVA computation for this pension yet. You can capture your decisions now and run PVA later. Your decisions and the PVA result will combine in the handoff packet.";

// §8.5.3 Type-A locked question wording — flips on userRole.
const Q_WORDING = {
  interestStructure: {
    participant:
      'Are you choosing a separate-interest QDRO (alternate payee gets their own life-based annuity) or a shared-interest QDRO (alternate payee receives a portion of each payment you receive)?',
    alternatePayee:
      'Is the proposed QDRO structured as separate interest (you receive your own life-based annuity) or shared interest (you receive a portion of each payment your former spouse receives)? Is this acceptable?',
  },
  qpsa: {
    participant:
      'Will you elect to designate the alternate payee as QPSA (Qualified Pre-Retirement Survivor Annuity) beneficiary, so they receive benefits if you die before retirement?',
    alternatePayee:
      'Are you requiring QPSA designation in the negotiated order, so you receive benefits if your former spouse dies before retirement?',
  },
  qjsa: {
    participant:
      'Will the alternate payee receive QJSA (Qualified Joint and Survivor Annuity) benefits if you die after retirement begins?',
    alternatePayee:
      'Are you requiring QJSA designation, so you receive survivor benefits if your former spouse dies after retirement begins?',
  },
  // Type-B — single wording regardless of perspective.
  cola: 'Will the alternate payee share in cost-of-living adjustments to the benefit?',
  earlyRetirementSubsidy:
    'If the participant retires early with a subsidized benefit, will the alternate payee benefit proportionally?',
};

// §8.5.3 "Why this matters" educational bodies — single content per
// question (does NOT flip on perspective). Architect-authored, locked.
const WHY_THIS_MATTERS = {
  interestStructure:
    "Separate-interest and shared-interest QDROs divide a pension in fundamentally different ways. A separate interest carves the alternate payee's share into its own benefit measured on the alternate payee's life — so once payments begin, they continue for the alternate payee's lifetime regardless of when the participant retires or dies. (In most plans, the alternate payee still can't begin payments until the participant reaches the plan's earliest retirement age, even if the participant hasn't actually retired.) A shared interest splits each payment as the participant receives it, so those payments typically stop at the participant's death unless survivor protection is added separately. This choice shapes how long payments last and which survivor protections are even available.",
  qpsa:
    'A QPSA (Qualified Pre-Retirement Survivor Annuity) covers what happens if the participant dies before retirement payments begin. Without a QPSA designation in the order, a death during the pre-retirement window can leave the alternate payee with nothing, even when the divorce awarded them a share. Naming the alternate payee as QPSA beneficiary protects that share in the gap between divorce and retirement.',
  qjsa:
    "A QJSA (Qualified Joint and Survivor Annuity) covers what happens to payments if the participant dies after retirement has begun. Whether the alternate payee's stream continues past that point depends on the QDRO structure and on the survivor election made at retirement. In a shared-interest QDRO, payments are tied to the participant's life and generally end at the participant's death unless QJSA-style survivor protection is built into the order. In a separate-interest QDRO, the alternate payee's share is already measured on the alternate payee's life, so it generally continues — but survivor protection on any portion the participant retains is still worth settling in the order. Settling these survivor questions up front avoids a contested record later.",
  cola:
    "Many pensions raise payments over time through cost-of-living adjustments (COLAs). Whether the alternate payee's share rises with those adjustments — or stays fixed at the original amount — can change its real value substantially over a long retirement. Many private-sector defined benefit plans provide no COLA at all, in which case there is nothing to divide on this point.",
  earlyRetirementSubsidy:
    'Some pensions add a subsidy when a participant retires early, making the early benefit worth more than a standard actuarial reduction would suggest. Whether the alternate payee shares proportionally in that subsidy — if the participant later retires early — affects the value of their share. Not every plan offers this subsidy, so the term may not apply.',
};

// Option sets — values spec-locked (§8.5.3). Labels + descriptions are
// build-phase neutral copy (perspective-neutral; the perspective lives in
// the question legend itself).
const INTEREST_STRUCTURE_OPTIONS = [
  {
    value: 'separate',
    label: 'Separate interest',
    description:
      "The alternate payee receives their own life-based annuity, independent of the participant's payment timing.",
  },
  {
    value: 'shared',
    label: 'Shared interest',
    description:
      'The alternate payee receives a portion of each payment as the participant receives it.',
  },
  {
    value: 'not_yet_decided',
    label: 'Not yet decided',
    description: 'Decide later with your attorney or CDFA.',
  },
];

const YES_NO_NYD_OPTIONS = [
  { value: 'yes', label: 'Yes', description: 'The order will include this provision.' },
  { value: 'no', label: 'No', description: 'The order will not include this provision.' },
  {
    value: 'not_yet_decided',
    label: 'Not yet decided',
    description: 'Decide later with your attorney or CDFA.',
  },
];

const COLA_OPTIONS = [
  {
    value: 'yes',
    label: 'Yes',
    description: "The alternate payee's share rises with cost-of-living adjustments.",
  },
  {
    value: 'no',
    label: 'No',
    description: "The alternate payee's share stays fixed at the original amount.",
  },
  {
    value: 'plan_no_cola',
    label: 'Plan provides no COLA',
    description: 'The plan does not provide cost-of-living adjustments at all.',
  },
  {
    value: 'not_yet_decided',
    label: 'Not yet decided',
    description: 'Decide later with your attorney or CDFA.',
  },
];

const EARLY_RETIREMENT_SUBSIDY_OPTIONS = [
  {
    value: 'yes',
    label: 'Yes',
    description: 'The alternate payee shares proportionally in any early-retirement subsidy.',
  },
  {
    value: 'no',
    label: 'No',
    description: 'The alternate payee does not share in any early-retirement subsidy.',
  },
  {
    value: 'not_applicable',
    label: 'Not applicable',
    description: 'The plan does not offer an early-retirement subsidy.',
  },
  {
    value: 'not_yet_decided',
    label: 'Not yet decided',
    description: 'Decide later with your attorney or CDFA.',
  },
];

// Neutral informational card — re-used for "Why this matters" bodies and
// the §8.6.3 entry callout. Same parchment/line treatment QDROBranchIRA's
// §8.5.5.1 informational block uses; deliberately NOT the alert / warning
// chrome of QDGNotLegalOrder.
function InfoCard({ children, testId, accent }) {
  return (
    <div
      data-testid={testId}
      style={{
        marginBottom: '10px',
        padding: '10px 12px',
        background: T.PARCHMENT,
        border: `1px solid ${T.LINE}`,
        borderLeft: accent ? `3px solid ${T.GOLD}` : `1px solid ${T.LINE}`,
        borderRadius: 6,
        fontFamily: T.FONT_BODY,
        fontSize: '13px',
        lineHeight: 1.5,
        color: T.INK_2,
      }}
    >
      {children}
    </div>
  );
}

function WhyThisMatters({ field, body }) {
  return (
    <InfoCard testId={`qdro-db-why-${field}`}>
      <div
        style={{
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.6px',
          textTransform: 'uppercase',
          color: T.INK,
          marginBottom: '4px',
        }}
      >
        Why this matters
      </div>
      <p style={{ margin: 0 }}>{body}</p>
    </InfoCard>
  );
}

export default function QDROBranchDB({ assetId, userRole }) {
  const asset = useM5Store((s) => s.qdroDecision.assets[assetId]);
  const updateQDRODecision = useM5Store((s) => s.updateQDRODecision);

  if (!asset) return null;

  const decisions = asset.decisions ?? {};
  // §8.2 perspective fallback — mirror QDROBranchDC: anything other than
  // 'participant' is treated as alternatePayee.
  const perspective = userRole === 'participant' ? 'participant' : 'alternatePayee';

  const persist = (field, value) => {
    updateQDRODecision(assetId, { [field]: value });
  };

  return (
    <div data-testid="qdro-branch-db">
      {asset.pvSource == null ? (
        <InfoCard testId="qdro-db-pva-not-run-callout" accent>
          {PVA_NOT_RUN_CALLOUT}
        </InfoCard>
      ) : null}

      {/* PR-B2-α §8.6.2 per-perspective PV display. Renders only when
          PVA has usable same-key results; the §8.6.3 callout above owns
          the null path. State-coherence between the two gates is held by
          `reconcileQDROPvSources` (QDROClassifier container effect). */}
      <QDROBranchDBPVDisplay assetId={assetId} perspective={perspective} />

      <div data-testid="qdro-db-q1">
        <WizardSection title="Question 1 — Interest structure" first>
          <WhyThisMatters
            field="interestStructure"
            body={WHY_THIS_MATTERS.interestStructure}
          />
          <WizardRadio
            field="interestStructure"
            legend={Q_WORDING.interestStructure[perspective]}
            variant="stacked"
            value={decisions.interestStructure ?? undefined}
            onChange={(_f, v) => persist('interestStructure', v)}
            options={INTEREST_STRUCTURE_OPTIONS}
            data-testid="qdro-db-interest-structure-radio"
          />
        </WizardSection>
      </div>

      <div data-testid="qdro-db-q2">
        <WizardSection title="Question 2 — Pre-retirement survivor annuity (QPSA)">
          <WhyThisMatters field="qpsa" body={WHY_THIS_MATTERS.qpsa} />
          <WizardRadio
            field="qpsa"
            legend={Q_WORDING.qpsa[perspective]}
            variant="stacked"
            value={decisions.qpsa ?? undefined}
            onChange={(_f, v) => persist('qpsa', v)}
            options={YES_NO_NYD_OPTIONS}
            data-testid="qdro-db-qpsa-radio"
          />
        </WizardSection>
      </div>

      <div data-testid="qdro-db-q3">
        <WizardSection title="Question 3 — Joint and survivor annuity (QJSA)">
          <WhyThisMatters field="qjsa" body={WHY_THIS_MATTERS.qjsa} />
          <WizardRadio
            field="qjsa"
            legend={Q_WORDING.qjsa[perspective]}
            variant="stacked"
            value={decisions.qjsa ?? undefined}
            onChange={(_f, v) => persist('qjsa', v)}
            options={YES_NO_NYD_OPTIONS}
            data-testid="qdro-db-qjsa-radio"
          />
        </WizardSection>
      </div>

      <div data-testid="qdro-db-q4">
        <WizardSection title="Question 4 — Cost-of-living adjustments (COLA)">
          <WhyThisMatters field="cola" body={WHY_THIS_MATTERS.cola} />
          <WizardRadio
            field="cola"
            legend={Q_WORDING.cola}
            variant="stacked"
            value={decisions.cola ?? undefined}
            onChange={(_f, v) => persist('cola', v)}
            options={COLA_OPTIONS}
            data-testid="qdro-db-cola-radio"
          />
        </WizardSection>
      </div>

      <div data-testid="qdro-db-q5">
        <WizardSection title="Question 5 — Early-retirement subsidy">
          <WhyThisMatters
            field="earlyRetirementSubsidy"
            body={WHY_THIS_MATTERS.earlyRetirementSubsidy}
          />
          <WizardRadio
            field="earlyRetirementSubsidy"
            legend={Q_WORDING.earlyRetirementSubsidy}
            variant="stacked"
            value={decisions.earlyRetirementSubsidy ?? undefined}
            onChange={(_f, v) => persist('earlyRetirementSubsidy', v)}
            options={EARLY_RETIREMENT_SUBSIDY_OPTIONS}
            data-testid="qdro-db-ers-radio"
          />
        </WizardSection>
      </div>
    </div>
  );
}
