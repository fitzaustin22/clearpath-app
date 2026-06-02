'use client';

/**
 * /dev/wizard-foundation — manual visual inspection target for the M5
 * wizard foundation (WizardCard / WizardSection / WizardField /
 * WizardProgress). Sibling of /dev/m5-components per Phase 0 §4.4;
 * hand-authored prop examples, no auto-discovery. Spec:
 * Roadmap/Architecture/Wizard-Design-Spec.md.
 */

import { useState } from 'react';
import WizardCard from '@/src/components/wizard/WizardCard';
import WizardSection from '@/src/components/wizard/WizardSection';
import WizardField from '@/src/components/wizard/WizardField';
import WizardProgress from '@/src/components/wizard/WizardProgress';
import WizardRadio from '@/src/components/wizard/WizardRadio';
import WizardDate from '@/src/components/wizard/WizardDate';
import WizardSelector from '@/src/components/wizard/WizardSelector';
import WizardCheckbox from '@/src/components/wizard/WizardCheckbox';

function Section({ id, title, description, children }) {
  return (
    <section
      id={id}
      className="mb-12 pb-8 border-b border-gray-200 scroll-mt-6"
    >
      <h2
        className="text-[#1B2A4A] mb-1"
        style={{
          fontFamily: '"Playfair Display", Georgia, serif',
          fontSize: '28px',
          fontWeight: 700,
        }}
      >
        {title}
      </h2>
      {description ? (
        <p className="text-gray-600 mb-4 text-sm">{description}</p>
      ) : null}
      <div>{children}</div>
    </section>
  );
}

function FieldDemo(props) {
  const [val, setVal] = useState(props.initialValue ?? '');
  return (
    <WizardField
      {...props}
      value={val}
      onChange={(_field, next) => setVal(next)}
    />
  );
}

function RadioDemo({ initialValue = '', ...props }) {
  const [val, setVal] = useState(initialValue);
  return (
    <WizardRadio {...props} value={val} onChange={(_field, next) => setVal(next)} />
  );
}

function DateDemo({ initialValue = '', ...props }) {
  const [val, setVal] = useState(initialValue);
  return (
    <WizardDate {...props} value={val} onChange={(_field, next) => setVal(next)} />
  );
}

function SelectorDemo({ initialValue = '', ...props }) {
  const [val, setVal] = useState(initialValue);
  return (
    <WizardSelector
      {...props}
      value={val}
      onChange={(_field, next) => setVal(next)}
    />
  );
}

function CheckboxDemo({ initialValue = false, ...props }) {
  const [val, setVal] = useState(initialValue);
  return (
    <WizardCheckbox
      {...props}
      value={val}
      onChange={(_field, next) => setVal(next)}
    />
  );
}

// IRS filing-status canonical option set — used by the WizardSelector demos.
const FILING_OPTIONS = [
  { value: 'single', label: 'Single' },
  { value: 'mfj', label: 'Married filing jointly' },
  { value: 'mfs', label: 'Married filing separately' },
  { value: 'hoh', label: 'Head of household' },
  { value: 'qw', label: 'Qualifying surviving spouse' },
];

// QDRO §8.3.2 6-way plan-type classifier — the canonical stacked example.
const PLAN_TYPES = [
  {
    value: 'private_db',
    label: 'Defined Benefit (DB)',
    description:
      'Employer pension where the benefit is formula-driven (years of service × accrual rate).',
    tooltipContent:
      'Common in public-sector and legacy private employers. Divided by a QDRO using a coverture fraction.',
  },
  {
    value: 'private_dc',
    label: 'Defined Contribution (DC)',
    description:
      'Account-balance plan such as a 401(k), 403(b), or Thrift Savings Plan.',
  },
  {
    value: 'ira',
    label: 'IRA (traditional or Roth)',
    description:
      'Held outside an employer; divided by a transfer incident to divorce, not a QDRO.',
  },
  {
    value: 'government',
    label: 'State / local government pension',
    description:
      'A public system such as VRS — divided by a plan-specific DRO, not a private-plan QDRO.',
  },
  {
    value: 'federal',
    label: 'Federal (FERS / CSRS)',
    description:
      'Federal civil-service retirement, divided by a Court Order Acceptable for Processing.',
    tooltipContent:
      'OPM administers FERS/CSRS division under its own COAP rules — distinct from ERISA QDROs.',
  },
  {
    value: 'military',
    label: 'Military retired pay',
    description:
      'Uniformed-services pension governed by the USFSPA; the 10/10 rule affects direct payment.',
    tooltipContent:
      'Direct payment from DFAS needs 10 years of marriage overlapping 10 years of service.',
  },
];

export default function WizardFoundationDevPage() {
  return (
    <div className="max-w-5xl mx-auto p-6" style={{ backgroundColor: '#FAF8F2' }}>
      <h1
        className="text-[#1B2A4A] mb-2"
        style={{
          fontFamily: '"Playfair Display", Georgia, serif',
          fontSize: '36px',
          fontWeight: 700,
        }}
      >
        Wizard Foundation — Dev Preview
      </h1>
      <p className="text-gray-600 mb-8">
        Manual visual inspection target for the M5 wizard foundation. QDRO
        will be born native to these primitives; SE/PVA/HDA migrate later
        in the wizard polish PR.
      </p>

      <nav
        className="mb-8 flex flex-wrap gap-x-4 gap-y-1 text-sm"
        style={{ color: '#4A5876' }}
      >
        {[
          ['progress', 'Progress'],
          ['card', 'Card'],
          ['section', 'Section'],
          ['field', 'Field'],
          ['radio-stacked', 'Radio · stacked'],
          ['radio-segmented', 'Radio · segmented'],
          ['date', 'Date'],
          ['selector', 'Selector'],
          ['checkbox', 'Checkbox · checkbox'],
          ['checkbox-toggle', 'Checkbox · toggle'],
        ].map(([href, label]) => (
          <a key={href} href={`#${href}`} className="underline">
            {label}
          </a>
        ))}
      </nav>

      <Section
        id="progress"
        title="WizardProgress"
        description="Three-part bar above the card. Edge cases clamp the fill to 0–100%."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <WizardProgress currentStep={1} totalSteps={12} />
          <WizardProgress currentStep={6} totalSteps={12} />
          <WizardProgress currentStep={12} totalSteps={12} />
          <WizardProgress currentStep={0} totalSteps={12} />
          <WizardProgress currentStep={15} totalSteps={12} />
        </div>
      </Section>

      <Section
        id="card"
        title="WizardCard"
        description="Empty, single-section, and three-section compositions."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <WizardCard>
            <p style={{ color: '#8A93A8', fontSize: '13px' }}>
              Empty card (children only)
            </p>
          </WizardCard>

          <WizardCard>
            <WizardSection title="One section" first>
              <FieldDemo label="Home value" field="homeValue" numeric prefix="$" />
            </WizardSection>
          </WizardCard>

          <WizardCard>
            <WizardSection title="The home" first>
              <FieldDemo
                label="Appraised value"
                field="appraised"
                numeric
                prefix="$"
                prefilledFrom="M2"
              />
            </WizardSection>
            <WizardSection title="Mortgage">
              <FieldDemo
                label="Balance remaining"
                field="balance"
                numeric
                prefix="$"
              />
            </WizardSection>
            <WizardSection title="Assumptions">
              <FieldDemo
                label="Expected appreciation"
                field="appreciation"
                numeric
                suffix="%"
                tooltip="Annual home-price growth used to project equity."
              />
            </WizardSection>
          </WizardCard>
        </div>
      </Section>

      <Section
        id="section"
        title="WizardSection"
        description="first (no top border) vs. not-first (top divider); single field and a 2-col grid."
      >
        <WizardCard>
          <WizardSection title="First — no top border" first>
            <FieldDemo label="Single field" field="single" />
          </WizardSection>
          <WizardSection title="Not first — top divider">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
              }}
            >
              <FieldDemo label="Left column" field="left" numeric prefix="$" />
              <FieldDemo label="Right column" field="right" numeric suffix="mo" />
            </div>
          </WizardSection>
        </WizardCard>
      </Section>

      <Section
        id="field"
        title="WizardField"
        description="All documented states. The focused state needs interaction — click or Tab into any field to see the gold focus ring."
      >
        <WizardCard>
          <WizardSection title="Field states" first>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <FieldDemo label="Default" field="default" />
              <FieldDemo
                label="With tooltip"
                field="withTooltip"
                tooltip="Hover (desktop) or tap (mobile) the info icon. Tap outside or press Escape to dismiss."
              />
              <FieldDemo
                label="With prefilled badge"
                field="withBadge"
                numeric
                prefix="$"
                prefilledFrom="M2"
              />
              <FieldDemo
                label="Long provenance (truncates)"
                field="longBadge"
                prefilledFrom="Pre-filled estimate from earlier module"
              />
              <FieldDemo
                label="Numeric with prefix"
                field="numPrefix"
                numeric
                prefix="$"
                initialValue="425000"
              />
              <FieldDemo
                label="Numeric with suffix"
                field="numSuffix"
                numeric
                suffix="%"
                initialValue="3.5"
              />
              <WizardField
                label="Disabled"
                field="disabled"
                value="Locked value"
                onChange={() => {}}
                disabled
              />
              <WizardField
                label="Error"
                field="error"
                value=""
                onChange={() => {}}
                error="This field is required."
              />
              {/* Focused state: not statically renderable — click/Tab into
                  any field above to verify the T.GOLD border + 3px
                  T.GOLD_FOCUS_RING (Q-5/Q-7). */}
            </div>
          </WizardSection>
        </WizardCard>
      </Section>

      <Section
        id="radio-stacked"
        title="WizardRadio — stacked"
        description="Vertical list with a mandatory per-option description and an optional info tooltip. Click a row or use arrow keys; hover an unselected row for the T.GOLD_TINT_SUBTLE wash."
      >
        <WizardCard>
          <WizardSection title="6-way plan-type classifier (QDRO §8.3.2)" first>
            <RadioDemo
              field="planType"
              legend="What kind of retirement plan is this?"
              options={PLAN_TYPES}
            />
          </WizardSection>
          <WizardSection title="Error state (group-level, W11)">
            <RadioDemo
              field="acctHolder"
              legend="How is the account held?"
              error="Please choose how the account is held."
              options={[
                {
                  value: 'joint',
                  label: 'Jointly titled',
                  description: 'Both spouses are named on the account.',
                },
                {
                  value: 'sole',
                  label: 'Sole title',
                  description:
                    'Titled to one spouse only (may still be marital property).',
                },
              ]}
            />
          </WizardSection>
          <WizardSection title="Disabled state (Q-2 — no opacity)">
            <WizardRadio
              field="planTypeLocked"
              value="private_dc"
              onChange={() => {}}
              disabled
              legend="Plan type (locked while reviewing)"
              options={PLAN_TYPES.slice(0, 3)}
            />
          </WizardSection>
        </WizardCard>
      </Section>

      <Section
        id="radio-segmented"
        title="WizardRadio — segmented"
        description="Pill container with a filled selected cell; no per-option description or tooltip. For binary or short-list toggles."
      >
        <WizardCard>
          <WizardSection title="Binary perspective toggle" first>
            <RadioDemo
              field="perspective"
              variant="segmented"
              legend="Whose retirement are we dividing?"
              initialValue="participant"
              options={[
                { value: 'participant', label: 'Participant' },
                { value: 'alternate', label: 'Alternate payee' },
              ]}
            />
          </WizardSection>
          <WizardSection title="Three-option short-list">
            <RadioDemo
              field="divisionMethod"
              variant="segmented"
              legend="Division method"
              options={[
                { value: 'shared', label: 'Shared interest' },
                { value: 'separate', label: 'Separate interest' },
                { value: 'unsure', label: 'Not sure yet' },
              ]}
            />
          </WizardSection>
        </WizardCard>
      </Section>

      <Section
        id="date"
        title="WizardDate"
        description="Native date input, chrome-matched to WizardField. ISO 8601 storage; gold-accented native picker. Empty, pre-filled, and error states."
      >
        <WizardCard>
          <WizardSection title="Empty / pre-filled / error" first>
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              <DateDemo label="Valuation date" field="valuationDate" />
              <DateDemo
                label="Date of separation"
                field="separationDate"
                initialValue="2025-09-01"
              />
              <WizardDate
                label="Decree date"
                field="decreeDate"
                value=""
                onChange={() => {}}
                error="Required to compute the marital coverture fraction."
              />
            </div>
          </WizardSection>
        </WizardCard>
      </Section>

      <Section
        id="selector"
        title="WizardSelector"
        description="Styled native <select> chrome-matched to WizardField. Placeholder option (disabled, empty value) is opt-in. The native picker is the dropdown — no custom JS listbox."
      >
        <WizardCard>
          <WizardSection title="With and without placeholder" first>
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              <SelectorDemo
                label="Filing status (with placeholder)"
                field="filingStatusWithPlaceholder"
                placeholder="Choose a filing status..."
                options={FILING_OPTIONS}
              />
              <SelectorDemo
                label="Filing status (no placeholder, default-selected)"
                field="filingStatusNoPlaceholder"
                initialValue="single"
                options={FILING_OPTIONS}
              />
            </div>
          </WizardSection>
          <WizardSection title="With provenance badge">
            <SelectorDemo
              label="Filing status"
              field="filingStatusFromM4"
              initialValue="mfj"
              prefilledFrom="M4"
              options={FILING_OPTIONS}
            />
          </WizardSection>
          <WizardSection title="With tooltip">
            <SelectorDemo
              label="Filing status"
              field="filingStatusWithTooltip"
              placeholder="Choose..."
              tooltip="Filing status as of December 31 of the tax year. See IRS Publication 501."
              options={FILING_OPTIONS}
            />
          </WizardSection>
          <WizardSection title="Error state">
            <WizardSelector
              label="Filing status"
              field="filingStatusError"
              value=""
              onChange={() => {}}
              placeholder="Choose..."
              error="Required for the post-divorce tax projection."
              options={FILING_OPTIONS}
            />
          </WizardSection>
          <WizardSection title="Disabled state">
            <WizardSelector
              label="Filing status (locked)"
              field="filingStatusDisabled"
              value="hoh"
              onChange={() => {}}
              disabled
              options={FILING_OPTIONS}
            />
          </WizardSection>
        </WizardCard>
      </Section>

      <Section
        id="checkbox"
        title="WizardCheckbox — checkbox variant"
        description="Default variant. Square 18px marker, navy border + gold checkmark when checked. Label renders to the right of the control (documented anatomy deviation)."
      >
        <WizardCard>
          <WizardSection title="Checked / unchecked" first>
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              <CheckboxDemo
                label="I have a QDRO already drafted"
                field="hasDraftUnchecked"
                initialValue={false}
              />
              <CheckboxDemo
                label="I have a QDRO already drafted"
                field="hasDraftChecked"
                initialValue={true}
              />
            </div>
          </WizardSection>
          <WizardSection title="With tooltip">
            <CheckboxDemo
              label="The plan is administered by a third party"
              field="thirdPartyAdmin"
              tooltip="Many private DC plans use a TPA (e.g. Fidelity, Empower) — they typically pre-approve QDRO model orders."
            />
          </WizardSection>
          <WizardSection title="With provenance badge">
            <CheckboxDemo
              label="Plan covers married-couple beneficiary by default"
              field="defaultBeneficiary"
              initialValue={true}
              prefilledFrom="M5"
            />
          </WizardSection>
          <WizardSection title="Disabled state">
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              <WizardCheckbox
                label="Locked & unchecked"
                field="disabledUnchecked"
                value={false}
                onChange={() => {}}
                disabled
              />
              <WizardCheckbox
                label="Locked & checked"
                field="disabledChecked"
                value={true}
                onChange={() => {}}
                disabled
              />
            </div>
          </WizardSection>
          <WizardSection title="Error state">
            <WizardCheckbox
              label="I acknowledge the QDRO drafting fee"
              field="ackFee"
              value={false}
              onChange={() => {}}
              error="Required to continue."
            />
          </WizardSection>
        </WizardCard>
      </Section>

      <Section
        id="checkbox-toggle"
        title="WizardCheckbox — toggle variant"
        description="Switch-style boolean. Track is T.GOLD when checked, T.LINE_STRONG when unchecked; thumb is white. Same controlled API as the checkbox variant — pass variant='toggle'."
      >
        <WizardCard>
          <WizardSection title="Checked / unchecked" first>
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              <CheckboxDemo
                label="Auto-update from M2 when value changes"
                field="autoUpdateOff"
                variant="toggle"
                initialValue={false}
              />
              <CheckboxDemo
                label="Auto-update from M2 when value changes"
                field="autoUpdateOn"
                variant="toggle"
                initialValue={true}
              />
            </div>
          </WizardSection>
          <WizardSection title="With tooltip">
            <CheckboxDemo
              label="Show advanced QDRO assumptions"
              field="showAdvanced"
              variant="toggle"
              tooltip="Reveals optional fields: coverture fraction, gain/loss adjustments, and survivor-benefit election."
            />
          </WizardSection>
          <WizardSection title="Disabled / error states">
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              <WizardCheckbox
                label="Locked toggle (disabled)"
                field="toggleDisabled"
                value={true}
                onChange={() => {}}
                variant="toggle"
                disabled
              />
              <WizardCheckbox
                label="Toggle in error state"
                field="toggleError"
                value={false}
                onChange={() => {}}
                variant="toggle"
                error="You must opt in to continue."
              />
            </div>
          </WizardSection>
        </WizardCard>
      </Section>
    </div>
  );
}
