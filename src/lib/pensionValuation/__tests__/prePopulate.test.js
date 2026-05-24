import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { prePopulatePVAInputs } from '../../../stores/prePopulate.js';
import { calculatePensionValue } from '../calculatePensionValue.js';

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const loadFixture = (n) => JSON.parse(readFileSync(path.join(fixturesDir, n), 'utf-8'));

describe('prePopulatePVAInputs (§7.10.3)', () => {
  test('TC-PVA-PrePop-1: M2 accruing claim → tier_3 default; description→planName, titleholder(self)→whoseplan(Client)', () => {
    const f = loadFixture('tc-pva-prepop-1.json');
    const result = prePopulatePVAInputs(f.inputs);
    expect(result).not.toBeNull();
    expect(result.path).toBe('tier_3');
    expect(result.inputs.planName).toBe('ABC Corp Pension');
    expect(result.inputs.whoseplan).toBe('Client');
    expect(result._frozenRoutingApplied).toBe(false);
    expect(Object.keys(result._prePopSources).sort()).toEqual(['planName', 'whoseplan']);
    expect(result._prePopSources.planName).toMatchObject({
      source: 'm2.pensionClaim',
      timestamp: expect.any(String),
    });
  });

  test('TC-PVA-PrePop-2: M2 in-pay claim with full data → in_pay_status path; titleholder(spouse)→whoseplan(Spouse); monthlyBenefit + benefitStartDate pre-popped', () => {
    const f = loadFixture('tc-pva-prepop-2.json');
    const result = prePopulatePVAInputs(f.inputs);
    expect(result).not.toBeNull();
    expect(result.path).toBe('in_pay_status');
    expect(result.inputs.planName).toBe('XYZ Retirement Fund');
    expect(result.inputs.whoseplan).toBe('Spouse');
    expect(result.inputs.monthlyBenefit).toBe(4200);
    expect(result.inputs.benefitStartDate).toBe('2020-01-01');
    expect(Object.keys(result._prePopSources).sort())
      .toEqual(['benefitStartDate', 'monthlyBenefit', 'planName', 'whoseplan']);
  });

  test('TC-PVA-PrePop-2b [R5b-8]: in-pay claim with missing monthlyBenefit triggers R3 guard', () => {
    const f = loadFixture('tc-pva-prepop-2b.json');
    const result = prePopulatePVAInputs(f.inputs);
    expect(result).not.toBeNull();
    expect(result.error).toBe('in_pay_data_incomplete');
    expect(result.missingFields).toEqual(['monthlyBenefit']);
    expect(result.path).toBeNull();
    // Calc engine MUST NOT be invoked when the pre-pop reports a validation error.
    // The orchestrator (PR 2) consumes this union; here we assert the contract
    // by confirming the return shape lacks the normal `inputs` payload.
    expect(result.inputs).toBeUndefined();
  });

  test('TC-PVA-FrozenRouting-1 [R5b-18]: frozen claim → tier_1 default with _frozenRoutingApplied flag', () => {
    const f = loadFixture('tc-pva-frozenrouting-1.json');
    const result = prePopulatePVAInputs(f.inputs);
    expect(result).not.toBeNull();
    expect(result.path).toBe('tier_1');
    expect(result._frozenRoutingApplied).toBe(true);

    // Integration: _frozenRoutingApplied flows into router CP.4 and surfaces
    // frozen_plan_tier1_routing callout with planName.
    const calcResult = calculatePensionValue({
      path: 'tier_1',
      planType: 'private_db_traditional',
      ...result.inputs,
      _frozenRoutingApplied: result._frozenRoutingApplied,
      // Minimum required Tier 1 inputs:
      participantDOB: '1981-05-01',
      caseEffectiveDate: '2026-05-01',
      planNRA: 65,
      accruedMonthlyBenefitAtNRA: 3000,
      formOfBenefitOnStatement: 'single_life',
      vestingStatus: 'fully_vested',
      benefitSource: 'official_statement',
      mortalityTable: 'irs_417e',
      discountRateBps: 5234,
      cola: 0,
    });
    const frozenCallout = calcResult.breakdown.callouts.find(c => c.type === 'frozen_plan_tier1_routing');
    expect(frozenCallout).toBeDefined();
    expect(frozenCallout.planName).toBe('Frozen DB Plan');
  });

  test('titleholder mapping holes: joint/other/unknown/absent → whoseplan undefined (user picks from dropdown)', () => {
    const base = (titleholder) => ({
      m1Store: null,
      m2Store: {
        maritalEstateInventory: {
          items: [
            { id: 'c1', category: 'pensions', description: 'Some Plan', titleholder, accrualStatus: 'accruing' },
          ],
        },
      },
      m3Store: null,
      assetId: 'c1',
    });
    for (const t of ['joint', 'other', 'unknown', undefined]) {
      const r = prePopulatePVAInputs(base(t));
      expect(r.inputs.whoseplan).toBeUndefined();
      // Provenance honesty: no whoseplan source when the field has no value.
      expect(r._prePopSources).not.toHaveProperty('whoseplan');
      // planName still carries through.
      expect(r.inputs.planName).toBe('Some Plan');
      expect(r._prePopSources).toHaveProperty('planName');
    }
  });

  test('null-return guard (Phase 0 approval): claim not found at assetId → returns null', () => {
    // No m2Store at all
    expect(prePopulatePVAInputs({ m1Store: null, m2Store: null, m3Store: null, assetId: 'anything' })).toBeNull();
    // m2Store present but no matching claim
    expect(prePopulatePVAInputs({
      m1Store: null,
      m2Store: { maritalEstateInventory: { items: [{ id: 'other', category: 'pensions' }] } },
      m3Store: null,
      assetId: 'missing',
    })).toBeNull();
    // Matching id but wrong category (not 'pensions')
    expect(prePopulatePVAInputs({
      m1Store: null,
      m2Store: { maritalEstateInventory: { items: [{ id: 'x', category: 'real_estate' }] } },
      m3Store: null,
      assetId: 'x',
    })).toBeNull();
  });
});
