'use client';

/**
 * PrioritiesWorksheet — M6 Tool 1 entry. Receives userTier (resolved server-side
 * by the route) and gates exactly like the M6 landing: Free / Essentials see the
 * locked teaser; Full Access runs the five-step wizard. The store is read
 * directly via inline selectors inside each step (matching the PVA/HDA idiom);
 * the wizard always starts at Framing so server and client render the same first
 * step. "Review the basics" jumps back to Framing on later steps.
 */

import { useState } from 'react';
import Link from 'next/link';
import { hasAccess } from '@/src/lib/plans';
import { T } from '@/src/lib/brand/tokens';
import WizardCard from '@/src/components/wizard/WizardCard';
import WizardProgress from '@/src/components/wizard/WizardProgress';
import LockedTeaser from './LockedTeaser';
import StepFraming from './StepFraming';
import StepCapture from './StepCapture';
import StepSort from './StepSort';
import StepRank from './StepRank';
import StepReview from './StepReview';
import { PRIORITIES_COPY } from './copy';

const TOTAL_STEPS = 5;

const backLinkStyle = {
  fontFamily: T.FONT_BODY,
  fontSize: 14,
  color: T.NAVY_55,
  textDecoration: 'none',
};

const reviewBasicsStyle = {
  backgroundColor: 'transparent',
  border: 'none',
  color: T.NAVY_55,
  fontFamily: T.FONT_BODY,
  fontSize: 13,
  cursor: 'pointer',
  padding: 0,
};

function PrioritiesWizard() {
  const [step, setStep] = useState(0);
  const onNext = () => setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
  const onBack = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Link href="/modules/m6" style={backLinkStyle}>
          ← Back to Module 6
        </Link>
        {step > 0 && (
          <button type="button" onClick={() => setStep(0)} style={reviewBasicsStyle}>
            {PRIORITIES_COPY.framing.reviewBasics}
          </button>
        )}
      </div>

      <div style={{ marginBottom: 20 }}>
        <WizardProgress currentStep={step + 1} totalSteps={TOTAL_STEPS} />
      </div>

      <WizardCard style={{ maxWidth: '100%' }}>
        {step === 0 && <StepFraming onNext={onNext} />}
        {step === 1 && <StepCapture onNext={onNext} onBack={onBack} />}
        {step === 2 && <StepSort onNext={onNext} onBack={onBack} />}
        {step === 3 && <StepRank onNext={onNext} onBack={onBack} />}
        {step === 4 && <StepReview onBack={onBack} />}
      </WizardCard>
    </div>
  );
}

export default function PrioritiesWorksheet({ userTier = 'essentials' }) {
  const isFullAccess = hasAccess(userTier, 'navigator');
  if (!isFullAccess) return <LockedTeaser />;
  return <PrioritiesWizard />;
}
