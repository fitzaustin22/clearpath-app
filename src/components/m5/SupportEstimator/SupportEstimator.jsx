'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { T } from '@/src/lib/brand/tokens';
import WizardProgress from '@/src/components/wizard/WizardProgress';
import WizardCard from '@/src/components/wizard/WizardCard';
import { useM5Store } from '@/src/stores/m5Store';
import { useM3Store } from '@/src/stores/m3Store';
import { useM4Store } from '@/src/stores/m4Store';
import useBlueprintStore from '@/src/stores/blueprintStore';
import { deriveSupportEstimate } from '@/src/lib/supportRange/computeSupportRange';
import { buildSupportRangePayload } from '@/src/lib/supportRange/buildSupportRangePayload';
import { prePopulateSupportRange, isSupportRangeFreshDefault } from '@/src/lib/supportRange/prefill';
import { Eyebrow, StepHeading, FooterCTA } from './wizard/ui';
import { EYEBROW, HEADINGS, SUBS, FOOTER_TITLES, FOOTER_SUBS, nextLabel } from './wizard/copy';
import StepIncome from './wizard/StepIncome';
import StepChildren from './wizard/StepChildren';
import StepMarriage from './wizard/StepMarriage';
import StepResults from './wizard/StepResults';

/**
 * Module 5 Support Estimator — four-step wizard (Income -> Children & custody ->
 * Marriage details -> Results). Uniform-AAML rule-of-thumb math (src/lib/supportRange),
 * region display-only. Live recompute on every input change; "Save to my Blueprint"
 * writes §8 (the saved/count state is DERIVED from blueprintStore completion, not a
 * local flag). Tier gating is handled at the landing/route layer (unchanged behavior).
 */
export function SupportEstimator({ userTier, disablePrePop = false }) {
  void userTier; // accepted for route compatibility; gating handled upstream
  const [step, setStep] = useState(1);

  const inputs = useM5Store((s) => s.supportRange.inputs);
  const sources = useM5Store((s) => s.supportRange._prePopSources);
  const setInputs = useM5Store((s) => s.setSupportRangeInputs);
  const replaceInputs = useM5Store((s) => s.replaceSupportRangeInputs);
  const setSources = useM5Store((s) => s.setSupportRangePrePopSources);

  // Select the primitive slice directly for a stable reference (a new object
  // literal from the selector would loop Zustand's snapshot comparison).
  const payStubDecoder = useM3Store((s) => s.payStubDecoder);
  const filingStatusOptimizer = useM4Store((s) => s.filingStatusOptimizer);

  // Saved state is the TRUE Blueprint completion, not a local flag.
  const s8status = useBlueprintStore((s) => s.sections.s8.status);
  const saved = s8status === 'complete';

  // One-time mount prefill, gated to fresh-default inputs (so we never clobber
  // a returning user's edits). incomeYou <- M3 gross monthly; incomeSpouse <- M4
  // spouse gross annual / 12. Assumes M3/M4 are hydrated before mount (synchronous
  // Zustand today); a later async rehydration would simply no-op (fresh-default
  // gate stays true, no source found), never corrupting user input.
  const didPrePop = useRef(false);
  useEffect(() => {
    if (disablePrePop || didPrePop.current) return;
    didPrePop.current = true;
    if (!isSupportRangeFreshDefault(inputs)) return;
    const pre = prePopulateSupportRange({ m3: { payStubDecoder }, m4: { filingStatusOptimizer } });
    if (pre.sources.incomeYou || pre.sources.incomeSpouse) {
      replaceInputs(pre.inputs);
      setSources(pre.sources);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disablePrePop]);

  const estimate = useMemo(() => deriveSupportEstimate(inputs), [inputs]);

  // Write a field and clear its "from M3/M4" badge once the user overrides it.
  const set = (field, value) => {
    setInputs({ [field]: value });
    // Read live sources at call time (not the render-closure snapshot) so a rapid
    // second field write can't resurrect a badge the first write just cleared.
    const live = useM5Store.getState().supportRange._prePopSources;
    if (live && live[field]) setSources({ ...live, [field]: null });
  };

  const goStep = (s) => {
    setStep(s);
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch { /* jsdom: scrollTo is a no-op */ }
    }
  };

  const onSave = () => {
    useBlueprintStore.getState().updateSupportAnalysis(buildSupportRangePayload(estimate, inputs));
  };

  return (
    <div style={{ maxWidth: 840, margin: '0 auto', padding: '30px 24px 88px' }}>
      <div style={{ marginBottom: 12 }}>
        <Link href="/modules/m5" style={{ fontFamily: T.FONT_BODY, fontSize: 14, color: T.INK_2, textDecoration: 'none' }}>← Back to Module 5</Link>
      </div>
      <Eyebrow>{EYEBROW}</Eyebrow>
      <StepHeading heading={HEADINGS[step]} sub={SUBS[step]} />
      <div style={{ margin: '0 0 16px' }}>
        <WizardProgress currentStep={step} totalSteps={4} />
      </div>
      <WizardCard style={{ maxWidth: '100%' }}>
        {step === 1 && <StepIncome inputs={inputs} set={set} sources={sources} />}
        {step === 2 && <StepChildren inputs={inputs} set={set} />}
        {step === 3 && <StepMarriage inputs={inputs} set={set} />}
        {step === 4 && <StepResults estimate={estimate} saved={saved} onSave={onSave} onEdit={() => goStep(1)} />}
      </WizardCard>
      {step < 4 && (
        <FooterCTA title={FOOTER_TITLES[step]} sub={FOOTER_SUBS[step]} showBack={step > 1}
          onBack={() => goStep(step - 1)} onNext={() => goStep(step + 1)} nextLabel={nextLabel(step)} />
      )}
    </div>
  );
}
