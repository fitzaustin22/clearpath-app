'use client';

/**
 * TradeOffAnalyzer — M6 Tool 2 entry. Receives userTier (resolved server-side by
 * the route) and gates exactly like the M6 landing and the Priorities Worksheet:
 * Free / Essentials see the locked teaser; Full Access runs the three-step wizard
 * (Framing → Build Trades → Review & Save — lighter than Priorities, no ranking).
 * Stores are read directly via inline selectors inside each step (PVA/HDA idiom);
 * the wizard always starts at Framing so server and client render the same first
 * step.
 */

import { useState } from 'react';
import Link from 'next/link';
import { hasAccess } from '@/src/lib/plans';
import { T } from '@/src/lib/brand/tokens';
import WizardCard from '@/src/components/wizard/WizardCard';
import WizardProgress from '@/src/components/wizard/WizardProgress';
import LockedTeaser from './LockedTeaser';
import StepFraming from './StepFraming';
import StepBuild from './StepBuild';
import StepReview from './StepReview';

const TOTAL_STEPS = 3;

const backLinkStyle = {
  fontFamily: T.FONT_BODY,
  fontSize: 14,
  color: T.NAVY_55,
  textDecoration: 'none',
};

function TradeOffWizard() {
  const [step, setStep] = useState(0);
  const onNext = () => setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
  const onBack = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ marginBottom: 16 }}>
        <Link href="/modules/m6" style={backLinkStyle}>
          ← Back to Module 6
        </Link>
      </div>

      <div style={{ marginBottom: 20 }}>
        <WizardProgress currentStep={step + 1} totalSteps={TOTAL_STEPS} />
      </div>

      <WizardCard style={{ maxWidth: '100%' }}>
        {step === 0 && <StepFraming onNext={onNext} />}
        {step === 1 && <StepBuild onNext={onNext} onBack={onBack} />}
        {step === 2 && <StepReview onBack={onBack} />}
      </WizardCard>
    </div>
  );
}

export default function TradeOffAnalyzer({ userTier = 'essentials' }) {
  const isFullAccess = hasAccess(userTier, 'navigator');
  if (!isFullAccess) return <LockedTeaser />;
  return <TradeOffWizard />;
}
