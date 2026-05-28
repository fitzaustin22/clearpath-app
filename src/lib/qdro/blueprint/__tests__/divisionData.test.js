/**
 * §10.8 §6 division-data adapter tests (PR-A m5/qdro-s108-blueprint-wiring).
 *
 * Covers:
 *   - per-branch `completionState` derivation (empty / partial / complete)
 *     per the §8.10.2 shapes
 *   - the §10.8 private_db `pvSource: null` carve-out (caps at 'partial')
 *   - the §10.8 section-status rollup over per-asset completionState
 *   - shape pass-through (userRole, planType, decisions, pvSource, metadata)
 *   - default metadata when missing on the source asset
 */

import { describe, it, expect } from 'vitest';
import {
  selectQDRODivisionData,
  deriveCompletionState,
  isAssetEmpty,
  rollupStatus,
} from '../divisionData.js';

// ---------------------------------------------------------------------------
// Per-branch asset factories
// ---------------------------------------------------------------------------

const dcEmpty = () => ({
  userRole: 'participant',
  planType: 'dc',
  decisions: {},
  pvSource: null,
  metadata: { formulaId: 'qdg_dc_v1', citations: [], qdroPacketGeneratedAt: null },
});

const dcPartial = () => ({
  ...dcEmpty(),
  decisions: { allocationType: 'percentage' },
});

const dcCompleteParticipant = () => ({
  ...dcEmpty(),
  userRole: 'participant',
  decisions: {
    allocationType: 'percentage',
    allocationValue: 50,
    receiptMethod: null, // participant carve-out — null is OK per §8.5.4.2
    valuationDate: { type: 'divorce', date: '2026-01-01' },
  },
});

const dcCompleteAlternatePayee = () => ({
  ...dcEmpty(),
  userRole: 'alternatePayee',
  decisions: {
    allocationType: 'percentage',
    allocationValue: 50,
    receiptMethod: 'rollover_ira', // required for alternate payee
    valuationDate: { type: 'divorce', date: '2026-01-01' },
  },
});

const iraEmpty = () => ({
  userRole: 'participant',
  planType: 'ira',
  decisions: {},
  pvSource: null,
  metadata: { formulaId: 'qdg_ira_v1', citations: [], qdroPacketGeneratedAt: null },
});

const iraPartial = () => ({
  ...iraEmpty(),
  decisions: { decreeLanguageConfirmed: 'yes' },
});

const iraComplete = () => ({
  ...iraEmpty(),
  decisions: {
    decreeLanguageConfirmed: 'yes',
    custodian: 'Fidelity',
    custodianNotes: '',
  },
});

const privateDbEmpty = (overrides = {}) => ({
  userRole: 'participant',
  planType: 'private_db',
  decisions: {},
  pvSource: null,
  metadata: { formulaId: 'qdg_private_db_v1', citations: [], qdroPacketGeneratedAt: null },
  ...overrides,
});

const privateDbPartial = (overrides = {}) => ({
  ...privateDbEmpty(),
  decisions: { interestStructure: 'separate' },
  ...overrides,
});

const privateDbAllFieldsCaptured = (overrides = {}) => ({
  ...privateDbEmpty(),
  decisions: {
    interestStructure: 'separate',
    qpsa: 'yes',
    qjsa: 'no',
    cola: 'plan_no_cola',
    earlyRetirementSubsidy: 'not_applicable',
  },
  ...overrides,
});

const flagOnlyUntouched = () => ({
  userRole: 'participant',
  planType: 'gov_civilian',
  decisions: {}, // no starterQuestionResponses array
  pvSource: null,
  metadata: { formulaId: null, citations: [], qdroPacketGeneratedAt: null },
});

const flagOnlyEmptyArray = () => ({
  ...flagOnlyUntouched(),
  decisions: { starterQuestionResponses: [] },
});

const flagOnlyPopulated = () => ({
  ...flagOnlyUntouched(),
  decisions: { starterQuestionResponses: [{ questionId: 'q1', response: 'see attorney' }] },
});

function stateWithAssets(assets) {
  return { qdroDecision: { assets } };
}

// ---------------------------------------------------------------------------
// 1. Per-asset completionState — DC
// ---------------------------------------------------------------------------
describe('deriveCompletionState — DC branch (§8.10.2)', () => {
  it('TC-QDIV-DC-1: empty decisions → "empty"', () => {
    expect(deriveCompletionState(dcEmpty())).toBe('empty');
  });

  it('TC-QDIV-DC-2: one field captured → "partial"', () => {
    expect(deriveCompletionState(dcPartial())).toBe('partial');
  });

  it('TC-QDIV-DC-3: complete participant (receiptMethod null OK) → "complete"', () => {
    expect(deriveCompletionState(dcCompleteParticipant())).toBe('complete');
  });

  it('TC-QDIV-DC-4: complete alternate payee → "complete"', () => {
    expect(deriveCompletionState(dcCompleteAlternatePayee())).toBe('complete');
  });

  it('TC-QDIV-DC-5: alternate payee missing receiptMethod → "partial"', () => {
    const asset = {
      ...dcCompleteAlternatePayee(),
      decisions: { ...dcCompleteAlternatePayee().decisions, receiptMethod: null },
    };
    expect(deriveCompletionState(asset)).toBe('partial');
  });
});

// ---------------------------------------------------------------------------
// 2. Per-asset completionState — IRA
// ---------------------------------------------------------------------------
describe('deriveCompletionState — IRA branch (§8.10.2)', () => {
  it('TC-QDIV-IRA-1: empty decisions → "empty"', () => {
    expect(deriveCompletionState(iraEmpty())).toBe('empty');
  });

  it('TC-QDIV-IRA-2: only decreeLanguageConfirmed captured → "partial"', () => {
    expect(deriveCompletionState(iraPartial())).toBe('partial');
  });

  it('TC-QDIV-IRA-3: decreeLanguageConfirmed + custodian → "complete"', () => {
    expect(deriveCompletionState(iraComplete())).toBe('complete');
  });
});

// ---------------------------------------------------------------------------
// 3. Per-asset completionState — private_db (with §10.8 pvSource carve-out)
// ---------------------------------------------------------------------------
describe('deriveCompletionState — private_db branch + §10.8 carve-out', () => {
  it('TC-QDIV-PDB-1: empty decisions → "empty" regardless of pvSource', () => {
    expect(deriveCompletionState(privateDbEmpty({ pvSource: null }))).toBe('empty');
    expect(deriveCompletionState(privateDbEmpty({ pvSource: 'pva_db_tier2_v1' }))).toBe('empty');
  });

  it('TC-QDIV-PDB-2: one field captured + pvSource null → "partial"', () => {
    expect(deriveCompletionState(privateDbPartial({ pvSource: null }))).toBe('partial');
  });

  it('TC-QDIV-PDB-3: one field captured + pvSource set → "partial"', () => {
    expect(deriveCompletionState(privateDbPartial({ pvSource: 'pva_db_tier2_v1' }))).toBe('partial');
  });

  it('TC-QDIV-PDB-4: all 5 fields captured + pvSource set → "complete"', () => {
    expect(deriveCompletionState(privateDbAllFieldsCaptured({ pvSource: 'pva_db_tier2_v1' }))).toBe('complete');
  });

  it('TC-QDIV-PDB-5 [§10.8 CARVE-OUT]: all 5 fields captured + pvSource null → caps at "partial"', () => {
    expect(deriveCompletionState(privateDbAllFieldsCaptured({ pvSource: null }))).toBe('partial');
  });

  it('TC-QDIV-PDB-6 [§10.8 CARVE-OUT]: all 5 fields + pvSource undefined → caps at "partial"', () => {
    const asset = privateDbAllFieldsCaptured();
    delete asset.pvSource;
    expect(deriveCompletionState(asset)).toBe('partial');
  });
});

// ---------------------------------------------------------------------------
// 4. Per-asset completionState — flag-only branches
// ---------------------------------------------------------------------------
describe('deriveCompletionState — flag-only branches (§8.10.2)', () => {
  it('TC-QDIV-FO-1: untouched (no starterQuestionResponses array) → "empty"', () => {
    expect(deriveCompletionState(flagOnlyUntouched())).toBe('empty');
  });

  it('TC-QDIV-FO-2: empty array (explicit "defer to attorney") → "complete"', () => {
    // Per §8.10.2 "empty array allowed — flag-only branches frequently defer
    // all answers to attorney" — the array key IS the decision-capture signal.
    expect(deriveCompletionState(flagOnlyEmptyArray())).toBe('complete');
  });

  it('TC-QDIV-FO-3: populated array → "complete"', () => {
    expect(deriveCompletionState(flagOnlyPopulated())).toBe('complete');
  });

  it('TC-QDIV-FO-4: military planType variant → same rules', () => {
    expect(
      deriveCompletionState({ ...flagOnlyEmptyArray(), planType: 'military' }),
    ).toBe('complete');
    expect(
      deriveCompletionState({ ...flagOnlyUntouched(), planType: 'military' }),
    ).toBe('empty');
  });

  it('TC-QDIV-FO-5: state_municipal planType variant → same rules', () => {
    expect(
      deriveCompletionState({ ...flagOnlyPopulated(), planType: 'state_municipal' }),
    ).toBe('complete');
  });
});

// ---------------------------------------------------------------------------
// 5. Defensive — unknown / unset planType
// ---------------------------------------------------------------------------
describe('deriveCompletionState — defensive', () => {
  it('TC-QDIV-Def-1: planType null → "empty"', () => {
    expect(deriveCompletionState({ planType: null, decisions: {} })).toBe('empty');
  });

  it('TC-QDIV-Def-2: undefined asset → "empty"', () => {
    expect(deriveCompletionState(undefined)).toBe('empty');
  });

  it('TC-QDIV-Def-3: unknown planType → "empty"', () => {
    expect(
      deriveCompletionState({ planType: 'not_a_real_type', decisions: { foo: 'bar' } }),
    ).toBe('empty');
  });
});

// ---------------------------------------------------------------------------
// 6. isAssetEmpty — direct
// ---------------------------------------------------------------------------
describe('isAssetEmpty', () => {
  it('TC-QDIV-IAE-1: dc empty → true', () => {
    expect(isAssetEmpty(dcEmpty())).toBe(true);
  });
  it('TC-QDIV-IAE-2: dc partial → false', () => {
    expect(isAssetEmpty(dcPartial())).toBe(false);
  });
  it('TC-QDIV-IAE-3: flag-only no array → true', () => {
    expect(isAssetEmpty(flagOnlyUntouched())).toBe(true);
  });
  it('TC-QDIV-IAE-4: flag-only empty array → false (decision captured)', () => {
    expect(isAssetEmpty(flagOnlyEmptyArray())).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 7. rollupStatus — §10.8 section-status rollup
// ---------------------------------------------------------------------------
describe('rollupStatus — §10.8 section-status rollup', () => {
  it('TC-QDIV-Rollup-1: no assets → "empty"', () => {
    expect(rollupStatus([])).toBe('empty');
  });

  it('TC-QDIV-Rollup-2: all empty → "empty"', () => {
    expect(rollupStatus(['empty', 'empty'])).toBe('empty');
  });

  it('TC-QDIV-Rollup-3: all complete → "complete"', () => {
    expect(rollupStatus(['complete', 'complete'])).toBe('complete');
  });

  it('TC-QDIV-Rollup-4: mix of empty + complete → "partial"', () => {
    expect(rollupStatus(['empty', 'complete'])).toBe('partial');
  });

  it('TC-QDIV-Rollup-5: any "partial" present → "partial"', () => {
    expect(rollupStatus(['complete', 'partial'])).toBe('partial');
    expect(rollupStatus(['empty', 'partial'])).toBe('partial');
    expect(rollupStatus(['partial'])).toBe('partial');
  });
});

// ---------------------------------------------------------------------------
// 8. selectQDRODivisionData — end-to-end
// ---------------------------------------------------------------------------
describe('selectQDRODivisionData — end-to-end', () => {
  it('TC-QDIV-Sel-1: undefined m5State → { assets: {}, status: "empty" }', () => {
    expect(selectQDRODivisionData(undefined)).toEqual({ assets: {}, status: 'empty' });
  });

  it('TC-QDIV-Sel-2: empty m5State.qdroDecision.assets → { assets: {}, status: "empty" }', () => {
    expect(selectQDRODivisionData(stateWithAssets({}))).toEqual({
      assets: {},
      status: 'empty',
    });
  });

  it('TC-QDIV-Sel-3: single complete DC asset → status "complete"', () => {
    const result = selectQDRODivisionData(stateWithAssets({ a1: dcCompleteParticipant() }));
    expect(result.status).toBe('complete');
    expect(result.assets.a1.completionState).toBe('complete');
    expect(result.assets.a1.planType).toBe('dc');
    expect(result.assets.a1.userRole).toBe('participant');
  });

  it('TC-QDIV-Sel-4: mixed assets → status "partial" (complete + empty)', () => {
    const result = selectQDRODivisionData(
      stateWithAssets({
        a1: dcCompleteParticipant(),
        a2: iraEmpty(),
      }),
    );
    expect(result.status).toBe('partial');
    expect(result.assets.a1.completionState).toBe('complete');
    expect(result.assets.a2.completionState).toBe('empty');
  });

  it('TC-QDIV-Sel-5 [§10.8 CARVE-OUT propagation]: private_db all-captured + pvSource null caps section at "partial"', () => {
    const result = selectQDRODivisionData(
      stateWithAssets({
        a1: privateDbAllFieldsCaptured({ pvSource: null }),
      }),
    );
    expect(result.assets.a1.completionState).toBe('partial');
    expect(result.assets.a1.pvSource).toBeNull();
    expect(result.status).toBe('partial');
  });

  it('TC-QDIV-Sel-6: private_db all-captured + pvSource set → section "complete"', () => {
    const result = selectQDRODivisionData(
      stateWithAssets({
        a1: privateDbAllFieldsCaptured({ pvSource: 'pva_db_tier2_v1' }),
      }),
    );
    expect(result.assets.a1.completionState).toBe('complete');
    expect(result.status).toBe('complete');
  });

  it('TC-QDIV-Sel-7: shape — preserves userRole, planType, decisions, pvSource, metadata', () => {
    const source = dcCompleteParticipant();
    source.pvSource = 'will_be_preserved'; // even though DC normally has no pvSource link
    source.metadata = { formulaId: 'qdg_dc_v1', citations: ['IRC §414(p)'], qdroPacketGeneratedAt: '2026-05-27T12:00:00.000Z' };
    const result = selectQDRODivisionData(stateWithAssets({ a1: source }));
    expect(result.assets.a1.userRole).toBe('participant');
    expect(result.assets.a1.planType).toBe('dc');
    expect(result.assets.a1.decisions).toEqual(source.decisions);
    expect(result.assets.a1.pvSource).toBe('will_be_preserved');
    expect(result.assets.a1.metadata).toEqual(source.metadata);
  });

  it('TC-QDIV-Sel-8: missing metadata on source asset defaults to {formulaId:null, citations:[], qdroPacketGeneratedAt:null}', () => {
    const partial = { userRole: 'participant', planType: 'ira', decisions: {}, pvSource: null };
    const result = selectQDRODivisionData(stateWithAssets({ a1: partial }));
    expect(result.assets.a1.metadata).toEqual({
      formulaId: null,
      citations: [],
      qdroPacketGeneratedAt: null,
    });
  });

  it('TC-QDIV-Sel-9: flag-only empty array → section "complete" (decision captured per §8.10.2)', () => {
    const result = selectQDRODivisionData(stateWithAssets({ a1: flagOnlyEmptyArray() }));
    expect(result.assets.a1.completionState).toBe('complete');
    expect(result.status).toBe('complete');
  });

  it('TC-QDIV-Sel-10: multi-asset rollup — DC complete + IRA partial + flag-only empty-array complete → "partial"', () => {
    const result = selectQDRODivisionData(
      stateWithAssets({
        a1: dcCompleteParticipant(),
        a2: iraPartial(),
        a3: flagOnlyEmptyArray(),
      }),
    );
    expect(result.assets.a1.completionState).toBe('complete');
    expect(result.assets.a2.completionState).toBe('partial');
    expect(result.assets.a3.completionState).toBe('complete');
    expect(result.status).toBe('partial');
  });
});
