import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { calculatePensionValue, DEFAULT_RECEIPT_FORM_BY_PATH } from '../calculatePensionValue.js';
import { getHeadlinePV, getMaritalPV } from '../pvHelpers.js';

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const loadFixture = (n) => JSON.parse(readFileSync(path.join(fixturesDir, n), 'utf-8'));

describe('Flag-only routing through calculatePensionValue (§7.4.1 STEP CP.1, §7.9.2)', () => {
  const CASES = [
    { fixture: 'tc-pva-flagonly-1.json', planType: 'multi_employer',  calloutType: 'multi_employer_flag_only', variant: null },
    { fixture: 'tc-pva-flagonly-2.json', planType: 'gov_civilian',    calloutType: 'gov_flag_only',           variant: 'csrs_fers' },
    { fixture: 'tc-pva-flagonly-3.json', planType: 'military',        calloutType: 'gov_flag_only',           variant: 'military' },
    { fixture: 'tc-pva-flagonly-4.json', planType: 'state_municipal', calloutType: 'gov_flag_only',           variant: 'state_municipal' },
  ];

  test.each(CASES)('$fixture: $planType routes to flag_only with correct educational callout', ({ fixture, calloutType, variant }) => {
    const f = loadFixture(fixture);
    const result = calculatePensionValue(f.inputs);

    // Path / formulaId / pv per spec §7.4.1 STEP CP.1 (flag-only construction)
    expect(result.path).toBe('flag_only');
    expect(result.formulaId).toBeNull();
    expect(result.pv).toBeNull();
    expect(result.coverture).toBeNull();
    expect(result.maritalPortion).toBeNull();
    expect(result.receiptForm).toBeNull();
    expect(DEFAULT_RECEIPT_FORM_BY_PATH.flag_only).toBeNull();

    // Educational callout present with correct shape
    const educational = result.breakdown.callouts.find(c => c.type === calloutType);
    expect(educational).toBeDefined();
    expect(educational.planName).toBe('ABC Plan');
    if (variant !== null) {
      expect(educational.variant).toBe(variant);
    }

    // Per [R5b-10]: qpsa_election_callout and qdro_handoff_recommended MUST be absent
    const types = result.breakdown.callouts.map(c => c.type);
    expect(types).not.toContain('qpsa_election_callout');
    expect(types).not.toContain('qdro_handoff_recommended');

    // liability_disclaimer is always-last per §7.9.1 (also rendered for flag-only)
    expect(types).toContain('liability_disclaimer');
    expect(types[types.length - 1]).toBe('liability_disclaimer');

    // Educational callout precedes liability_disclaimer in render order
    expect(types[0]).toBe(calloutType);

    // Metadata persisted for forward-compat (planName, whoseplan)
    expect(result.metadata.planName).toBe('ABC Plan');
    expect(result.metadata.whoseplan).toBe('Client');
    expect(result.metadata.citations).toEqual([]);   // CITATIONS_BY_PATH.flag_only is empty

    // pvHelpers narrow correctly for flag-only
    expect(getHeadlinePV(result)).toBeNull();
    expect(getMaritalPV(result)).toBeNull();
  });
});
