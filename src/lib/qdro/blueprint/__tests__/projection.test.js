// Tests for §8 Blueprint projection selector and equality helper (PR5-1, PR5-6).
// Pure functions over the object-keyed `qdroDecision.assets` map.

import { describe, it, expect } from 'vitest';
import {
  selectQDROBlueprintProjection,
  isProjectionEqual,
} from '../projection.js';

// ── fixtures ──────────────────────────────────────────────────────────────────

// Realistic complete DC-participant asset (from codebase / store shape)
const dcParticipantAsset = {
  userRole: 'participant',
  planType: 'dc',
  planName: 'MegaCorp 401(k)',
  employer: 'MegaCorp',
  pvSource: null,
  _prePopSources: {},
  decisions: {
    allocationType: 'percentage',
    allocationValue: 50,
    receiptMethod: null,
    valuationDate: { type: 'divorce', date: '2026-01-01' },
  },
  metadata: { formulaId: null, citations: [], qdroPacketGeneratedAt: null },
};

// Realistic private_db alternate-payee asset
const dbAlternatePayeeAsset = {
  userRole: 'alternatePayee',
  planType: 'private_db',
  planName: 'State Teachers Pension',
  employer: 'FCPS',
  pvSource: null,
  _prePopSources: {},
  decisions: {
    interestStructure: 'simple',
    qpsa: 'waived',
    qjsa: 'survivor_annuity',
    cola: 'yes',
    earlyRetirementSubsidy: 'no',
  },
  metadata: { formulaId: null, citations: [], qdroPacketGeneratedAt: null },
};

// IRA asset
const iraAsset = {
  userRole: 'participant',
  planType: 'ira',
  planName: 'Fidelity Rollover IRA',
  employer: null,
  pvSource: null,
  _prePopSources: {},
  decisions: {
    decreeLanguageConfirmed: 'yes',
    custodian: 'Fidelity',
  },
  metadata: { formulaId: null, citations: [], qdroPacketGeneratedAt: null },
};

// Flag-only assets
const govCivilianAsset = {
  userRole: 'alternatePayee',
  planType: 'gov_civilian',
  planName: 'FERS Pension',
  employer: 'DOD',
  pvSource: null,
  _prePopSources: {},
  decisions: {
    starterQuestionResponses: [{ questionId: 'q1', response: 'defer' }],
  },
  metadata: { formulaId: null, citations: [], qdroPacketGeneratedAt: null },
};

const militaryAsset = {
  userRole: 'participant',
  planType: 'military',
  planName: 'Military Retired Pay',
  employer: 'USAF',
  pvSource: null,
  _prePopSources: {},
  decisions: {
    starterQuestionResponses: [{ questionId: 'q2', response: 'yes' }],
  },
  metadata: { formulaId: null, citations: [], qdroPacketGeneratedAt: null },
};

const stateMunicipalAsset = {
  userRole: 'alternatePayee',
  planType: 'state_municipal',
  planName: 'VRS Pension',
  employer: 'Virginia',
  pvSource: null,
  _prePopSources: {},
  decisions: {
    starterQuestionResponses: [],
  },
  metadata: { formulaId: null, citations: [], qdroPacketGeneratedAt: null },
};

// ── TC-PROJ-1: single DC participant with branch capture ───────────────────────
describe('TC-PROJ-1: single DC-participant asset — full shape', () => {
  const m5State = { qdroDecision: { assets: { a1: dcParticipantAsset } } };
  const result = selectQDROBlueprintProjection(m5State);

  it('returns correct per-asset shape', () => {
    expect(result.assets).toHaveLength(1);
    const asset = result.assets[0];
    expect(asset.id).toBe('a1');
    expect(asset.label).toBe('MegaCorp 401(k)');
    expect(asset.planType).toBe('dc');
    expect(asset.perspective).toBe('participant');
    expect(asset.branchCapture).toEqual(dcParticipantAsset.decisions);
    expect(asset.flagOnlyResponses).toBeNull();
  });

  it('top-level perspective is participant', () => {
    expect(result.perspective).toBe('participant');
  });

  it('generatedAt is null', () => {
    expect(result.generatedAt).toBeNull();
  });
});

// ── TC-PROJ-2: single private_db alternate-payee ───────────────────────────────
describe('TC-PROJ-2: single private_db alternatePayee asset', () => {
  const m5State = { qdroDecision: { assets: { b1: dbAlternatePayeeAsset } } };
  const result = selectQDROBlueprintProjection(m5State);

  it('perspective per-asset is alternatePayee', () => {
    expect(result.assets[0].perspective).toBe('alternatePayee');
  });

  it('top-level perspective is alternatePayee', () => {
    expect(result.perspective).toBe('alternatePayee');
  });

  it('branchCapture equals decisions, flagOnlyResponses is null', () => {
    expect(result.assets[0].branchCapture).toEqual(dbAlternatePayeeAsset.decisions);
    expect(result.assets[0].flagOnlyResponses).toBeNull();
  });
});

// ── TC-PROJ-3: IRA asset with branch decisions ─────────────────────────────────
describe('TC-PROJ-3: IRA asset', () => {
  const m5State = { qdroDecision: { assets: { ira1: iraAsset } } };
  const result = selectQDROBlueprintProjection(m5State);

  it('branchCapture equals IRA decisions, flagOnlyResponses is null', () => {
    expect(result.assets[0].branchCapture).toEqual(iraAsset.decisions);
    expect(result.assets[0].flagOnlyResponses).toBeNull();
  });

  it('planType is ira', () => {
    expect(result.assets[0].planType).toBe('ira');
  });
});

// ── TC-PROJ-4: mixed perspective ───────────────────────────────────────────────
describe('TC-PROJ-4: mixed-perspective (a1 participant, a2 alternatePayee)', () => {
  const a2 = { ...dcParticipantAsset, userRole: 'alternatePayee', planName: 'SpouseCo 401(k)' };
  const m5State = { qdroDecision: { assets: { a1: dcParticipantAsset, a2 } } };
  const result = selectQDROBlueprintProjection(m5State);

  it('top-level perspective is mixed', () => {
    expect(result.perspective).toBe('mixed');
  });

  it('each asset keeps its own raw perspective', () => {
    const a1Asset = result.assets.find((a) => a.id === 'a1');
    const a2Asset = result.assets.find((a) => a.id === 'a2');
    expect(a1Asset.perspective).toBe('participant');
    expect(a2Asset.perspective).toBe('alternatePayee');
  });
});

// ── TC-PROJ-5: unclassified asset ──────────────────────────────────────────────
describe('TC-PROJ-5: unclassified asset (planType:null, userRole:null)', () => {
  const unclassified = {
    userRole: null,
    planType: null,
    planName: null,
    employer: null,
    pvSource: null,
    _prePopSources: {},
    decisions: {},
    metadata: { formulaId: null, citations: [], qdroPacketGeneratedAt: null },
  };
  const m5State = { qdroDecision: { assets: { u1: unclassified } } };
  let result;

  it('does not throw', () => {
    expect(() => {
      result = selectQDROBlueprintProjection(m5State);
    }).not.toThrow();
  });

  it('planType is null, perspective is null', () => {
    result = selectQDROBlueprintProjection(m5State);
    expect(result.assets[0].planType).toBeNull();
    expect(result.assets[0].perspective).toBeNull();
  });

  it('branchCapture is raw empty decisions (not flag-only), flagOnlyResponses is null', () => {
    result = selectQDROBlueprintProjection(m5State);
    expect(result.assets[0].branchCapture).toEqual({});
    expect(result.assets[0].flagOnlyResponses).toBeNull();
  });

  it('top-level perspective is null (single asset, userRole null)', () => {
    result = selectQDROBlueprintProjection(m5State);
    expect(result.perspective).toBeNull();
  });
});

// ── TC-PROJ-6: flag-only assets ────────────────────────────────────────────────
describe('TC-PROJ-6: flag-only assets (gov_civilian, military, state_municipal)', () => {
  it('gov_civilian: branchCapture is null, flagOnlyResponses has the array', () => {
    const m5State = { qdroDecision: { assets: { g1: govCivilianAsset } } };
    const result = selectQDROBlueprintProjection(m5State);
    expect(result.assets[0].branchCapture).toBeNull();
    expect(result.assets[0].flagOnlyResponses).toEqual(
      govCivilianAsset.decisions.starterQuestionResponses
    );
  });

  it('military: branchCapture is null, flagOnlyResponses has the array', () => {
    const m5State = { qdroDecision: { assets: { mil1: militaryAsset } } };
    const result = selectQDROBlueprintProjection(m5State);
    expect(result.assets[0].branchCapture).toBeNull();
    expect(result.assets[0].flagOnlyResponses).toEqual(
      militaryAsset.decisions.starterQuestionResponses
    );
  });

  it('state_municipal: branchCapture is null, flagOnlyResponses is empty array', () => {
    const m5State = { qdroDecision: { assets: { sm1: stateMunicipalAsset } } };
    const result = selectQDROBlueprintProjection(m5State);
    expect(result.assets[0].branchCapture).toBeNull();
    expect(result.assets[0].flagOnlyResponses).toEqual([]);
  });
});

// ── TC-PROJ-7: empty assets ────────────────────────────────────────────────────
describe('TC-PROJ-7: empty assets object', () => {
  it('returns { perspective:null, assets:[], generatedAt:null }', () => {
    const result = selectQDROBlueprintProjection({ qdroDecision: { assets: {} } });
    expect(result).toEqual({ perspective: null, assets: [], generatedAt: null });
  });
});

// ── TC-PROJ-8: insertion order preserved ──────────────────────────────────────
describe('TC-PROJ-8: insertion order preserved (z9, a1, m3)', () => {
  it('assets array order matches object insertion order', () => {
    const z9 = { ...dcParticipantAsset, planName: 'Z9 Plan' };
    const a1 = { ...dcParticipantAsset, planName: 'A1 Plan' };
    const m3 = { ...dcParticipantAsset, planName: 'M3 Plan' };
    const m5State = { qdroDecision: { assets: { z9, a1, m3 } } };
    const result = selectQDROBlueprintProjection(m5State);
    expect(result.assets.map((a) => a.id)).toEqual(['z9', 'a1', 'm3']);
  });
});

// ── TC-PROJ-9: purity ─────────────────────────────────────────────────────────
describe('TC-PROJ-9: purity — no mutation, generatedAt always null', () => {
  const m5State = { qdroDecision: { assets: { a1: dcParticipantAsset } } };
  const stateBefore = JSON.stringify(m5State);

  it('generatedAt is null on both calls', () => {
    const r1 = selectQDROBlueprintProjection(m5State);
    const r2 = selectQDROBlueprintProjection(m5State);
    expect(r1.generatedAt).toBeNull();
    expect(r2.generatedAt).toBeNull();
  });

  it('does not mutate the input', () => {
    selectQDROBlueprintProjection(m5State);
    expect(JSON.stringify(m5State)).toBe(stateBefore);
  });
});

// ── TC-PROJ-10: determinism ────────────────────────────────────────────────────
describe('TC-PROJ-10: determinism — JSON.stringify stable across calls', () => {
  it('multi-asset stringified output is identical across two calls', () => {
    const m5State = {
      qdroDecision: {
        assets: {
          a1: dcParticipantAsset,
          b1: dbAlternatePayeeAsset,
          g1: govCivilianAsset,
        },
      },
    };
    expect(JSON.stringify(selectQDROBlueprintProjection(m5State))).toBe(
      JSON.stringify(selectQDROBlueprintProjection(m5State))
    );
  });
});

// ── TC-PROJ-11: regression — exact key sets ───────────────────────────────────
describe('TC-PROJ-11: regression guard — exact key sets, no extra fields', () => {
  const m5State = { qdroDecision: { assets: { a1: dcParticipantAsset } } };
  const result = selectQDROBlueprintProjection(m5State);

  it('root has exactly [perspective, assets, generatedAt] in that order', () => {
    expect(Object.keys(result)).toEqual(['perspective', 'assets', 'generatedAt']);
  });

  it('each asset has exactly [id, label, planType, perspective, branchCapture, flagOnlyResponses]', () => {
    expect(Object.keys(result.assets[0])).toEqual([
      'id',
      'label',
      'planType',
      'perspective',
      'branchCapture',
      'flagOnlyResponses',
    ]);
  });

  it('no planTypeMix / branchDecisionSummary / readyForBlueprint / employer / pvSource / metadata keys present', () => {
    const assetKeys = Object.keys(result.assets[0]);
    const forbidden = ['planTypeMix', 'branchDecisionSummary', 'readyForBlueprint', 'employer', 'pvSource', 'metadata'];
    for (const key of forbidden) {
      expect(assetKeys).not.toContain(key);
    }
  });
});

// ── TC-PROJ-12: isProjectionEqual — equal projections ─────────────────────────
describe('TC-PROJ-12: isProjectionEqual — equal projections', () => {
  it('two independent selector calls on equal inputs return true', () => {
    const m5State = { qdroDecision: { assets: { a1: dcParticipantAsset } } };
    const p1 = selectQDROBlueprintProjection(m5State);
    const p2 = selectQDROBlueprintProjection(m5State);
    expect(isProjectionEqual(p1, p2)).toBe(true);
  });
});

// ── TC-PROJ-13: isProjectionEqual — single field differs ──────────────────────
describe('TC-PROJ-13: isProjectionEqual — single field differs', () => {
  it('label changed → false', () => {
    const m5State1 = { qdroDecision: { assets: { a1: dcParticipantAsset } } };
    const m5State2 = {
      qdroDecision: {
        assets: { a1: { ...dcParticipantAsset, planName: 'Other Plan' } },
      },
    };
    const p1 = selectQDROBlueprintProjection(m5State1);
    const p2 = selectQDROBlueprintProjection(m5State2);
    expect(isProjectionEqual(p1, p2)).toBe(false);
  });
});

// ── TC-PROJ-14: isProjectionEqual — order differs ─────────────────────────────
describe('TC-PROJ-14: isProjectionEqual — different insertion order', () => {
  it('same assets but different insertion order → false (order is significant)', () => {
    const a1 = { ...dcParticipantAsset, planName: 'Plan A1' };
    const a2 = { ...dcParticipantAsset, planName: 'Plan A2', userRole: 'alternatePayee' };
    const stateAB = { qdroDecision: { assets: { a1, a2 } } };
    const stateBA = { qdroDecision: { assets: { a2, a1 } } };
    const pAB = selectQDROBlueprintProjection(stateAB);
    const pBA = selectQDROBlueprintProjection(stateBA);
    expect(isProjectionEqual(pAB, pBA)).toBe(false);
  });
});

// ── TC-PROJ-15: isProjectionEqual — null handling ─────────────────────────────
describe('TC-PROJ-15: isProjectionEqual — null handling', () => {
  it('one arg null, other is a projection → false', () => {
    const m5State = { qdroDecision: { assets: { a1: dcParticipantAsset } } };
    const p1 = selectQDROBlueprintProjection(m5State);
    expect(isProjectionEqual(null, p1)).toBe(false);
    expect(isProjectionEqual(p1, null)).toBe(false);
  });

  it('two nulls → true', () => {
    expect(isProjectionEqual(null, null)).toBe(true);
  });
});
