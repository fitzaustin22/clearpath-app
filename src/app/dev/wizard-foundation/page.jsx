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

function Section({ title, description, children }) {
  return (
    <section className="mb-12 pb-8 border-b border-gray-200">
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

      <Section
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
    </div>
  );
}
