/**
 * WizardProgress — the "blueprint" progress bar that sits above the card.
 *
 * Three-part row: a "YOUR BLUEPRINT" label, a 6px gold-gradient bar on a
 * T.LINE track, and a "Step N / M" count in tabular numerals. Stateless
 * props API (Q-8) — footer pagination dots are out of foundation scope.
 * The fill width is clamped to [0, 100]% so out-of-range steps stay sane,
 * and animates at 300ms ease-out (Q-7). Full progressbar ARIA per Q-6.
 * Inline T tokens per memory #23. Spec: Wizard-Design-Spec.md
 * §Blueprint progress bar.
 *
 * @param {object} props
 * @param {number} props.currentStep 1-based current step (clamped for the fill)
 * @param {number} props.totalSteps total number of steps
 * @param {string} [props.data-testid] root test id (default "wizard-progress")
 * @returns {JSX.Element}
 */

import { T } from '@/src/lib/brand/tokens';

export default function WizardProgress({
  currentStep,
  totalSteps,
  'data-testid': testId = 'wizard-progress',
}) {
  const ratio = Math.max(0, Math.min(1, currentStep / totalSteps));
  const pct = ratio * 100;

  return (
    <div
      data-testid={testId}
      style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
    >
      <span
        style={{
          fontSize: '11px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.9px',
          color: T.MUTED,
          whiteSpace: 'nowrap',
        }}
      >
        YOUR BLUEPRINT
      </span>

      <div
        role="progressbar"
        aria-valuenow={currentStep}
        aria-valuemin={1}
        aria-valuemax={totalSteps}
        aria-valuetext={`Step ${currentStep} of ${totalSteps}`}
        style={{
          flexGrow: 1,
          height: '6px',
          borderRadius: '999px',
          backgroundColor: T.LINE,
          overflow: 'hidden',
        }}
      >
        <div
          data-testid="wizard-progress-fill"
          style={{
            height: '100%',
            width: `${pct}%`,
            borderRadius: '999px',
            backgroundImage: `linear-gradient(90deg, ${T.GOLD}, ${T.GOLD_SOFT})`,
            transition: 'width 300ms ease-out',
          }}
        />
      </div>

      <span
        data-testid="wizard-progress-count"
        style={{
          fontSize: '12px',
          color: T.INK_2,
          whiteSpace: 'nowrap',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        Step {currentStep} / {totalSteps}
      </span>
    </div>
  );
}
