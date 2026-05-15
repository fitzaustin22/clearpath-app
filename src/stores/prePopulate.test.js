import { describe, it, expect } from 'vitest';
import {
  prePopulateSupportEstimatorInputs,
  prePopulateQDROInputs,
  prePopulateHomeDecisionInputs,
  isInputsFreshDefault,
  clearPrePopSource,
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

describe('prePopulate stubs (QDG)', () => {
  // PVA dropped from STUBS array in PVA PR 1 — prePopulatePVAInputs is now
  // fully implemented per §7.10.3 with a null-return contract for missing
  // claims (see src/lib/pensionValuation/__tests__/prePopulate.test.js).
  // HDA dropped from STUBS array in HDA PR 2 — prePopulateHomeDecisionInputs
  // is now fully implemented per §10.7 (see describe block below).
  const REP_INPUT = { m1Store: null, m2Store: null, m3Store: null };
  const STUBS = [
    ['prePopulateQDROInputs', prePopulateQDROInputs],
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

// ─── HDA pre-pop fixture helpers ──────────────────────────────────────────────

const makeM1 = (adjustedMonthlyIncome) => ({
  budgetGap: { results: { adjustedMonthlyIncome } },
});

const makeM2 = (items) => ({
  maritalEstateInventory: { items },
});

const makeM3 = ({ projectedHome = {}, currentHome = {}, projectedInsurance = {}, currentInsurance = {} } = {}) => ({
  budgetModeler: {
    projected: {
      home: { propertyTaxes: 0, hoaFees: 0, ...projectedHome },
      insurance: { home: 0, ...projectedInsurance },
    },
    current: {
      home: { propertyTaxes: 0, hoaFees: 0, ...currentHome },
      insurance: { home: 0, ...currentInsurance },
    },
  },
});

const makeBlueprint = (costBasisFilingStatus) => ({ costBasisFilingStatus });

describe('prePopulateHomeDecisionInputs (§10.7)', () => {
  it('TC-HDA-PrePop-1: all sources populated → every mapped field present with correct values + sources', () => {
    const result = prePopulateHomeDecisionInputs({
      m1Store: makeM1(5500),
      m2Store: makeM2([
        { id: 'r1', category: 'realEstate', currentValue: 400000, outstandingBalance: 220000 },
        { id: 'w1', category: 'workingCapital', currentValue: 35000, outstandingBalance: 0 },
      ]),
      m3Store: makeM3({
        projectedHome: { propertyTaxes: 350, hoaFees: 75 },
        projectedInsurance: { home: 120 },
      }),
      blueprintStore: makeBlueprint('single'),
    });

    expect(result.inputs.userPostDivorceGrossMonthlyIncome).toBe(5500);
    expect(result.inputs.existingMortgageBalance).toBe(220000);
    expect(result.inputs.startingLiquidCash).toBe(35000);
    expect(result.inputs.monthlyPropertyTax).toBe(350);
    expect(result.inputs.monthlyHOA).toBe(75);
    expect(result.inputs.monthlyInsurance).toBe(120);
    expect(result.inputs.expectedFilingStatusAtSellNow).toBe('single');
    expect(result.inputs.userState).toBeUndefined();

    expect(result._prePopSources.userPostDivorceGrossMonthlyIncome).toMatchObject({ source: 'm1.budgetGap', timestamp: expect.any(String) });
    expect(result._prePopSources.existingMortgageBalance).toMatchObject({ source: 'm2.maritalEstateInventory', timestamp: expect.any(String) });
    expect(result._prePopSources.startingLiquidCash).toMatchObject({ source: 'm2.maritalEstateInventory', timestamp: expect.any(String) });
    expect(result._prePopSources.monthlyPropertyTax).toMatchObject({ source: 'm3.budgetModeler.projected', timestamp: expect.any(String) });
    expect(result._prePopSources.monthlyHOA).toMatchObject({ source: 'm3.budgetModeler.projected', timestamp: expect.any(String) });
    expect(result._prePopSources.monthlyInsurance).toMatchObject({ source: 'm3.budgetModeler.projected', timestamp: expect.any(String) });
    expect(result._prePopSources.expectedFilingStatusAtSellNow).toMatchObject({ source: 'm4.blueprintStore', timestamp: expect.any(String) });
    expect(result._prePopSources.userState).toBeNull();
  });

  it('TC-HDA-PrePop-2: m2 only → m2 fields present, m1/m3/blueprint fields omitted, sources null', () => {
    const result = prePopulateHomeDecisionInputs({
      m1Store: null,
      m2Store: makeM2([
        { id: 'r1', category: 'realEstate', currentValue: 500000, outstandingBalance: 180000 },
        { id: 'w1', category: 'workingCapital', currentValue: 20000, outstandingBalance: 0 },
      ]),
      m3Store: null,
      blueprintStore: null,
    });

    expect(result.inputs.existingMortgageBalance).toBe(180000);
    expect(result.inputs.startingLiquidCash).toBe(20000);
    expect(result.inputs.userPostDivorceGrossMonthlyIncome).toBeUndefined();
    expect(result.inputs.monthlyPropertyTax).toBeUndefined();
    expect(result.inputs.monthlyHOA).toBeUndefined();
    expect(result.inputs.monthlyInsurance).toBeUndefined();
    expect(result.inputs.expectedFilingStatusAtSellNow).toBeUndefined();

    expect(result._prePopSources.userPostDivorceGrossMonthlyIncome).toBeNull();
    expect(result._prePopSources.monthlyPropertyTax).toBeNull();
    expect(result._prePopSources.monthlyHOA).toBeNull();
    expect(result._prePopSources.monthlyInsurance).toBeNull();
    expect(result._prePopSources.expectedFilingStatusAtSellNow).toBeNull();
    expect(result._prePopSources.userState).toBeNull();
  });

  it('TC-HDA-PrePop-3: m3 only → m3 fields present, m1/m2/blueprint fields omitted', () => {
    const result = prePopulateHomeDecisionInputs({
      m1Store: null,
      m2Store: null,
      m3Store: makeM3({
        projectedHome: { propertyTaxes: 400, hoaFees: 0 },
        projectedInsurance: { home: 150 },
      }),
      blueprintStore: null,
    });

    expect(result.inputs.monthlyPropertyTax).toBe(400);
    expect(result.inputs.monthlyInsurance).toBe(150);
    expect(result.inputs.monthlyHOA).toBeUndefined();
    expect(result.inputs.userPostDivorceGrossMonthlyIncome).toBeUndefined();
    expect(result.inputs.existingMortgageBalance).toBeUndefined();
    expect(result.inputs.startingLiquidCash).toBeUndefined();
  });

  it('TC-HDA-PrePop-4: m3 projected.home.propertyTaxes=0, current.home.propertyTaxes set → fallback fires', () => {
    const result = prePopulateHomeDecisionInputs({
      m1Store: null,
      m2Store: null,
      m3Store: makeM3({
        projectedHome: { propertyTaxes: 0 },
        currentHome: { propertyTaxes: 290 },
      }),
      blueprintStore: null,
    });

    expect(result.inputs.monthlyPropertyTax).toBe(290);
    expect(result._prePopSources.monthlyPropertyTax).toMatchObject({ source: 'm3.budgetModeler.current', timestamp: expect.any(String) });
  });

  it('TC-HDA-PrePop-5: m3 both projected & current empty → propertyTax omitted, source null', () => {
    const result = prePopulateHomeDecisionInputs({
      m1Store: null,
      m2Store: null,
      m3Store: makeM3(), // all zeros
      blueprintStore: null,
    });

    expect(result.inputs.monthlyPropertyTax).toBeUndefined();
    expect(result.inputs.monthlyHOA).toBeUndefined();
    expect(result.inputs.monthlyInsurance).toBeUndefined();
    expect(result._prePopSources.monthlyPropertyTax).toBeNull();
    expect(result._prePopSources.monthlyHOA).toBeNull();
    expect(result._prePopSources.monthlyInsurance).toBeNull();
  });

  it('TC-HDA-PrePop-6: all stores null/undefined → empty inputs, all sources null, no throw', () => {
    let result;
    expect(() => {
      result = prePopulateHomeDecisionInputs({
        m1Store: null,
        m2Store: null,
        m3Store: null,
        blueprintStore: null,
      });
    }).not.toThrow();

    expect(result.inputs).toEqual({});
    expect(result._prePopSources.userPostDivorceGrossMonthlyIncome).toBeNull();
    expect(result._prePopSources.existingMortgageBalance).toBeNull();
    expect(result._prePopSources.startingLiquidCash).toBeNull();
    expect(result._prePopSources.monthlyPropertyTax).toBeNull();
    expect(result._prePopSources.monthlyHOA).toBeNull();
    expect(result._prePopSources.monthlyInsurance).toBeNull();
    expect(result._prePopSources.expectedFilingStatusAtSellNow).toBeNull();
    expect(result._prePopSources.userState).toBeNull();
  });

  it('TC-HDA-PrePop-7: m2 has no realEstate item → existingMortgageBalance omitted, source null', () => {
    const result = prePopulateHomeDecisionInputs({
      m1Store: null,
      m2Store: makeM2([
        { id: 'w1', category: 'workingCapital', currentValue: 10000, outstandingBalance: 0 },
      ]),
      m3Store: null,
      blueprintStore: null,
    });

    expect(result.inputs.existingMortgageBalance).toBeUndefined();
    expect(result._prePopSources.existingMortgageBalance).toBeNull();
  });

  it('TC-HDA-PrePop-8 (Q-16 mandatory): retirement excluded from startingLiquidCash', () => {
    // estate: retirement $200k + workingCapital(cash) $15k + workingCapital(brokerage) $25k
    // expected: 15000 + 25000 = 40000 (retirement excluded)
    const result = prePopulateHomeDecisionInputs({
      m1Store: null,
      m2Store: makeM2([
        { id: 'ret1', category: 'retirement', currentValue: 200000, outstandingBalance: 0 },
        { id: 'wc1', category: 'workingCapital', currentValue: 15000, outstandingBalance: 0 },
        { id: 'wc2', category: 'workingCapital', currentValue: 25000, outstandingBalance: 0 },
      ]),
      m3Store: null,
      blueprintStore: null,
    });

    expect(result.inputs.startingLiquidCash).toBe(40000);
    expect(result._prePopSources.startingLiquidCash).toMatchObject({ source: 'm2.maritalEstateInventory', timestamp: expect.any(String) });
  });

  it('TC-HDA-PrePop-9: blueprintStore.costBasisFilingStatus → expectedFilingStatusAtSellNow; absent → omitted', () => {
    const withStatus = prePopulateHomeDecisionInputs({
      m1Store: null,
      m2Store: null,
      m3Store: null,
      blueprintStore: makeBlueprint('mfj'),
    });
    expect(withStatus.inputs.expectedFilingStatusAtSellNow).toBe('mfj');
    expect(withStatus._prePopSources.expectedFilingStatusAtSellNow).toMatchObject({ source: 'm4.blueprintStore', timestamp: expect.any(String) });

    const withoutStore = prePopulateHomeDecisionInputs({
      m1Store: null,
      m2Store: null,
      m3Store: null,
      blueprintStore: null,
    });
    expect(withoutStore.inputs.expectedFilingStatusAtSellNow).toBeUndefined();
    expect(withoutStore._prePopSources.expectedFilingStatusAtSellNow).toBeNull();
  });

  it('TC-HDA-PrePop-10: userState always omitted + _prePopSources.userState===null even with rich sources', () => {
    const result = prePopulateHomeDecisionInputs({
      m1Store: makeM1(6000),
      m2Store: makeM2([
        { id: 'r1', category: 'realEstate', currentValue: 350000, outstandingBalance: 150000 },
      ]),
      m3Store: makeM3({ projectedHome: { propertyTaxes: 300 } }),
      blueprintStore: makeBlueprint('single'),
    });

    expect(result.inputs.userState).toBeUndefined();
    expect(result._prePopSources.userState).toBeNull();
  });
});

describe('isInputsFreshDefault (§6.2 fresh-default gate)', () => {
  it('returns true on init-default state from prePopulate (m3 absent)', () => {
    const { inputs } = prePopulateSupportEstimatorInputs({
      m1Store: null,
      m2Store: null,
      m3Store: null,
    });
    expect(isInputsFreshDefault(inputs)).toBe(true);
  });

  it('returns false when partyA.grossMonthly is set (pre-popped from m3)', () => {
    const { inputs } = prePopulateSupportEstimatorInputs({
      m1Store: null,
      m2Store: null,
      m3Store: { payStubDecoder: { results: { grossMonthlyIncome: 8000 } } },
    });
    expect(isInputsFreshDefault(inputs)).toBe(false);
  });

  it('returns false when user has touched numChildren', () => {
    const { inputs } = prePopulateSupportEstimatorInputs({ m3Store: null });
    inputs.numChildren = 2;
    expect(isInputsFreshDefault(inputs)).toBe(false);
  });

  it('returns false when partyB.grossMonthly is user-entered', () => {
    const { inputs } = prePopulateSupportEstimatorInputs({ m3Store: null });
    inputs.partyB.grossMonthly = 5000;
    expect(isInputsFreshDefault(inputs)).toBe(false);
  });

  it('returns false when state has been changed off default OTHER', () => {
    const { inputs } = prePopulateSupportEstimatorInputs({ m3Store: null });
    inputs.state = 'VA';
    expect(isInputsFreshDefault(inputs)).toBe(false);
  });

  it('returns false when inputs is null/undefined', () => {
    expect(isInputsFreshDefault(null)).toBe(false);
    expect(isInputsFreshDefault(undefined)).toBe(false);
  });
});

describe('clearPrePopSource (§6.5.7 override clears badge)', () => {
  it('removes the specified field path', () => {
    const sources = {
      'partyA.grossMonthly': { source: 'm3.payStubDecoder', timestamp: 'x' },
    };
    const next = clearPrePopSource(sources, 'partyA.grossMonthly');
    expect(next['partyA.grossMonthly']).toBeUndefined();
  });

  it('returns input unchanged when path not present', () => {
    const sources = {};
    expect(clearPrePopSource(sources, 'partyA.grossMonthly')).toBe(sources);
  });

  it('returns input unchanged when prePopSources is null', () => {
    expect(clearPrePopSource(null, 'partyA.grossMonthly')).toBeNull();
  });

  it('does not mutate input', () => {
    const sources = {
      'partyA.grossMonthly': { source: 'm3.payStubDecoder', timestamp: 'x' },
    };
    const snapshot = { ...sources };
    clearPrePopSource(sources, 'partyA.grossMonthly');
    expect(sources).toEqual(snapshot);
  });
});
