import { describe, it, expect } from 'vitest';
import {
  prePopulateSupportEstimatorInputs,
  prePopulatePVAInputs,
  prePopulateQDROInputs,
  prePopulateHomeDecisionInputs,
} from './prePopulate.js';

describe('prePopulateSupportEstimatorInputs (§6.5.7)', () => {
  it('TC-SE-PrePop-1: m3.payStubDecoder.results populated → partyA.grossMonthly + _prePopSources entry', () => {
    const result = prePopulateSupportEstimatorInputs({
      m1Store: null,
      m2Store: null,
      m3Store: {
        payStubDecoder: { results: { grossMonthlyIncome: 7500 } },
      },
    });
    expect(result.inputs.partyA.grossMonthly).toBe(7500);
    expect(result._prePopSources['partyA.grossMonthly']).toMatchObject({
      source: 'm3.payStubDecoder',
      timestamp: expect.any(String),
    });
  });

  it('TC-SE-PrePop-2 (F-2 regression guard): m3 empty + m1 populated → partyA.grossMonthly null, source null', () => {
    const result = prePopulateSupportEstimatorInputs({
      m1Store: { budgetGap: { results: { adjustedMonthlyIncome: 6000 } } },
      m2Store: null,
      m3Store: {},
    });
    expect(result.inputs.partyA.grossMonthly).toBeNull();
    expect(result._prePopSources['partyA.grossMonthly']).toBeNull();
  });

  it('TC-SE-PrePop-3: all stores empty → both parties manual; _prePopSources entries null', () => {
    const result = prePopulateSupportEstimatorInputs({
      m1Store: null,
      m2Store: null,
      m3Store: null,
    });
    expect(result.inputs.partyA.grossMonthly).toBeNull();
    expect(result.inputs.partyB.grossMonthly).toBeNull();
    expect(result._prePopSources['partyA.grossMonthly']).toBeNull();
  });

  it('returns the full §6.5.1 inputs shape (sentinel keys present)', () => {
    const result = prePopulateSupportEstimatorInputs({ m1Store: null, m2Store: null, m3Store: null });
    expect(result.inputs).toMatchObject({
      partyA: expect.any(Object),
      partyB: expect.any(Object),
      numChildren: 0,
      state: 'OTHER',
      temporal: 'post_divorce',
      depth: 'standard',
      caseEffectiveDate: null,
      fullWorksheet: null,
    });
  });
});

describe('prePopulate stubs (PVA / QDG / HDA)', () => {
  const REP_INPUT = { m1Store: null, m2Store: null, m3Store: null };
  const STUBS = [
    ['prePopulatePVAInputs', prePopulatePVAInputs],
    ['prePopulateQDROInputs', prePopulateQDROInputs],
    ['prePopulateHomeDecisionInputs', prePopulateHomeDecisionInputs],
  ];
  for (const [name, fn] of STUBS) {
    it(`${name} is callable and returns an object without throwing`, () => {
      let result;
      expect(() => {
        result = fn(REP_INPUT);
      }).not.toThrow();
      expect(typeof result).toBe('object');
      expect(result).not.toBeNull();
    });
  }
});
