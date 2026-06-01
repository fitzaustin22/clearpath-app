/**
 * ActionPlan — tier-gate smoke test (the one piece of component logic with a
 * correctness contract). Free / Essentials see the locked teaser; navigator /
 * signature see the interactive wizard (which opens on the Framing step). The
 * rest of the wizard's visual correctness is the Cowork/architect pass (UI is
 * unverified-by-design per FIX-8 — no dev server, no full render TCs in §6.7).
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import ActionPlan from '../ActionPlan/ActionPlan.jsx';

afterEach(() => cleanup());

describe('ActionPlan — tier gate', () => {
  it('TC-M7-GATE-1: Free renders the locked teaser, not the wizard', () => {
    render(<ActionPlan userTier="free" />);
    expect(screen.getByTestId('action-plan-locked')).toBeTruthy();
    expect(screen.queryByTestId('action-plan-full')).toBeNull();
  });

  it('TC-M7-GATE-2: Essentials renders the locked teaser, not the wizard', () => {
    render(<ActionPlan userTier="essentials" />);
    expect(screen.getByTestId('action-plan-locked')).toBeTruthy();
    expect(screen.queryByTestId('action-plan-full')).toBeNull();
  });

  it('TC-M7-GATE-3: navigator renders the wizard (opening on Framing), not the teaser', () => {
    render(<ActionPlan userTier="navigator" />);
    expect(screen.getByTestId('action-plan-full')).toBeTruthy();
    expect(screen.getByTestId('action-plan-step-framing')).toBeTruthy();
    expect(screen.queryByTestId('action-plan-locked')).toBeNull();
  });

  it('TC-M7-GATE-4: legacy signature tier also unlocks the wizard (= level 2)', () => {
    render(<ActionPlan userTier="signature" />);
    expect(screen.getByTestId('action-plan-full')).toBeTruthy();
    expect(screen.queryByTestId('action-plan-locked')).toBeNull();
  });
});
