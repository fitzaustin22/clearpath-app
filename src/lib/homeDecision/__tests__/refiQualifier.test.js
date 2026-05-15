// __tests__/refiQualifier.test.js
//
// Coverage for §9.6.2 (Q-10) refi-qualifier verdict matrix + 5-case
// binding-constraint logic (post-Session-23 underwater short-circuit).
// Maps to TC-HDA-5 variants.

import { describe, it, expect } from 'vitest';
import { evaluateRefiVerdict } from '../refiQualifier';

// Defaults — caller can override per test
const POSITIVE_EQUITY = { currentFMV: 700_000, existingMortgageBalance: 400_000 };

describe('evaluateRefiVerdict — TC-HDA-5 verdict matrix', () => {
  it('case 1: FE 25/BE 32/LTV 75/excellent → green, none', () => {
    const r = evaluateRefiVerdict({
      frontEndDti: 0.25, backEndDti: 0.32, ltv: 0.75, creditBand: 'excellent',
      ...POSITIVE_EQUITY,
    });
    expect(r.verdictTier).toBe('green');
    expect(r.bindingConstraint).toBe('none');
    expect(r.narrative).toBeNull();
  });

  it('case 2: FE 25/BE 39/LTV 75/excellent → red, dti (back-end exceeds 38%)', () => {
    const r = evaluateRefiVerdict({
      frontEndDti: 0.25, backEndDti: 0.39, ltv: 0.75, creditBand: 'excellent',
      ...POSITIVE_EQUITY,
    });
    expect(r.verdictTier).toBe('red');
    expect(r.bindingConstraint).toBe('dti');
    expect(r.narrative).toContain('Back-end DTI');
    expect(r.narrative).toContain('39%');
  });

  it('case 3: FE 25/BE 32/LTV 75/fair → yellow, credit', () => {
    const r = evaluateRefiVerdict({
      frontEndDti: 0.25, backEndDti: 0.32, ltv: 0.75, creditBand: 'fair',
      ...POSITIVE_EQUITY,
    });
    expect(r.verdictTier).toBe('yellow');
    expect(r.bindingConstraint).toBe('credit');
    expect(r.narrative).toContain('fair');
  });

  it('case 4: FE 25/BE 37/LTV 84/good → yellow, multiple (back-end + LTV)', () => {
    const r = evaluateRefiVerdict({
      frontEndDti: 0.25, backEndDti: 0.37, ltv: 0.84, creditBand: 'good',
      ...POSITIVE_EQUITY,
    });
    expect(r.verdictTier).toBe('yellow');
    expect(r.bindingConstraint).toBe('multiple');
    expect(r.narrative.toLowerCase()).toContain('back-end dti');
    expect(r.narrative).toContain('LTV');
  });

  it('case 5: FE 25/BE 32/LTV 75/poor → red, credit (poor forces red)', () => {
    const r = evaluateRefiVerdict({
      frontEndDti: 0.25, backEndDti: 0.32, ltv: 0.75, creditBand: 'poor',
      ...POSITIVE_EQUITY,
    });
    expect(r.verdictTier).toBe('red');
    expect(r.bindingConstraint).toBe('credit');
    expect(r.narrative).toContain('poor');
  });

  it('case 6: FE 27/BE 32/LTV 75/excellent → yellow, margin-of-safety (FE proximity)', () => {
    const r = evaluateRefiVerdict({
      frontEndDti: 0.27, backEndDti: 0.32, ltv: 0.75, creditBand: 'excellent',
      ...POSITIVE_EQUITY,
    });
    expect(r.verdictTier).toBe('yellow');
    expect(r.bindingConstraint).toBe('margin-of-safety');
    expect(r.narrative).toContain('front-end');
    expect(r.narrative).toContain('2 percentage points');
  });
});

describe('evaluateRefiVerdict — boundary cases per Session 23', () => {
  it('FE exactly 28% / BE exactly 36% → margin-of-safety per Session 23 closed-on-upper', () => {
    const r = evaluateRefiVerdict({
      frontEndDti: 0.28, backEndDti: 0.36, ltv: 0.75, creditBand: 'excellent',
      ...POSITIVE_EQUITY,
    });
    expect(r.verdictTier).toBe('yellow');
    expect(r.bindingConstraint).toBe('margin-of-safety');
  });

  it('FE 25% / BE 33% → green (outside back-end proximity band 34-36%)', () => {
    const r = evaluateRefiVerdict({
      frontEndDti: 0.25, backEndDti: 0.33, ltv: 0.75, creditBand: 'excellent',
      ...POSITIVE_EQUITY,
    });
    expect(r.verdictTier).toBe('green');
    expect(r.bindingConstraint).toBe('none');
  });
});

describe('evaluateRefiVerdict — underwater short-circuit (Session 23 revision)', () => {
  it('underwater (FMV 300k < mortgage 400k) → red, underwater regardless of DTI/credit', () => {
    const r = evaluateRefiVerdict({
      frontEndDti: 0.25, backEndDti: 0.32, ltv: 0.95, creditBand: 'excellent',
      currentFMV: 300_000, existingMortgageBalance: 400_000,
    });
    expect(r.verdictTier).toBe('red');
    expect(r.bindingConstraint).toBe('underwater');
    expect(r.narrative).toContain('FMV');
    expect(r.narrative).toContain('$300,000');
    expect(r.narrative).toContain('$400,000');
  });

  it('underwater short-circuits even with otherwise-perfect inputs', () => {
    const r = evaluateRefiVerdict({
      frontEndDti: 0.20, backEndDti: 0.25, ltv: 0.50, creditBand: 'excellent',
      currentFMV: 300_000, existingMortgageBalance: 400_000,
    });
    expect(r.verdictTier).toBe('red');
    expect(r.bindingConstraint).toBe('underwater');
  });
});

describe('evaluateRefiVerdict — narrative copy details', () => {
  it('underwater narrative includes both FMV and mortgage with dollar formatting', () => {
    const r = evaluateRefiVerdict({
      frontEndDti: 0.25, backEndDti: 0.32, ltv: 1.05, creditBand: 'excellent',
      currentFMV: 350_000, existingMortgageBalance: 425_000,
    });
    expect(r.narrative).toContain('$350,000');
    expect(r.narrative).toContain('$425,000');
    expect(r.narrative).toContain('short-sale');
  });

  it('margin-of-safety narrative escalates phrasing when both FE and BE are in proximity', () => {
    const r = evaluateRefiVerdict({
      frontEndDti: 0.27, backEndDti: 0.35, ltv: 0.75, creditBand: 'excellent',
      ...POSITIVE_EQUITY,
    });
    expect(r.verdictTier).toBe('yellow');
    expect(r.bindingConstraint).toBe('margin-of-safety');
    expect(r.narrative).toContain('both your front-end and back-end');
  });
});
