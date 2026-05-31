'use client';

/**
 * DeferredCompAnalyzer — M6 Tool 4 entry (§9). Receives userTier (resolved
 * server-side by the route) and gates like the sibling M6 tools: Free /
 * Essentials see the locked teaser; Full Access runs the five-step wizard
 * (Select grant → Dates & state → Vesting tranches → Review → Save). Stores are
 * read directly via inline selectors inside each step; the wizard always starts
 * at Select so server and client render the same first step.
 *
 * Compliance: the tool ESTIMATES the marital PORTION (share counts + intrinsic
 * value) and shows BOTH the Hug and Nelson formulas — it never asserts the split
 * (D1), never picks a formula (D2), and never parses the stub's vestingSchedule.
 */

import { useState } from 'react';
import Link from 'next/link';
import { hasAccess } from '@/src/lib/plans';
import { T } from '@/src/lib/brand/tokens';
import WizardCard from '@/src/components/wizard/WizardCard';
import WizardProgress from '@/src/components/wizard/WizardProgress';
import LockedTeaser from './LockedTeaser';
import StepSelect from './StepSelect';
import StepDates from './StepDates';
import StepTranches from './StepTranches';
import StepReview from './StepReview';
import StepSave from './StepSave';

const TOTAL_STEPS = 5;

function DeferredCompWizard() {
  const [step, setStep] = useState(0);
  const onNext = () => setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
  const onBack = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ marginBottom: 16 }}>
        <Link
          href="/modules/m6"
          style={{ fontFamily: T.FONT_BODY, fontSize: 14, color: T.NAVY_55, textDecoration: 'none' }}
        >
          ← Back to Module 6
        </Link>
      </div>

      <div style={{ marginBottom: 20 }}>
        <WizardProgress currentStep={step + 1} totalSteps={TOTAL_STEPS} />
      </div>

      <WizardCard style={{ maxWidth: '100%' }}>
        {step === 0 && <StepSelect onNext={onNext} />}
        {step === 1 && <StepDates onNext={onNext} onBack={onBack} />}
        {step === 2 && <StepTranches onNext={onNext} onBack={onBack} />}
        {step === 3 && <StepReview onNext={onNext} onBack={onBack} />}
        {step === 4 && <StepSave onBack={onBack} />}
      </WizardCard>
    </div>
  );
}

export default function DeferredCompAnalyzer({ userTier = 'essentials' }) {
  const isFullAccess = hasAccess(userTier, 'navigator');
  if (!isFullAccess) return <LockedTeaser />;
  return <DeferredCompWizard />;
}
