// Tests for §8.10.3 cross-asset selectors. Pure functions over the
// object-keyed `qdroDecision.assets` map. Step-4 fixtures (dc/ira/flag-only);
// a private_db fixture exercises the missing-pvSource selector only.

import { describe, it, expect } from 'vitest';
import {
  countByPlanType,
  countByUserRole,
  flagOnlyAssets,
  privateDbMissingPvSource,
  isMixedPerspective,
  isPacketReady,
} from '../qdroSelectors.js';

// ── fixtures ──────────────────────────────────────────────────────────────
const dcParticipantComplete = {
  userRole: 'participant',
  planType: 'dc',
  pvSource: null,
  decisions: {
    allocationType: 'percentage',
    allocationValue: 50,
    receiptMethod: null, // §8.5.4.2 participant carve-out
    valuationDate: { type: 'divorce', date: '2026-01-01' },
  },
};
const dcAlternatePayeeComplete = {
  userRole: 'alternatePayee',
  planType: 'dc',
  pvSource: null,
  decisions: {
    allocationType: 'fixed_dollar',
    allocationValue: 90000,
    receiptMethod: 'rollover_ira',
    valuationDate: { type: 'no_specific', date: null },
  },
};
const iraComplete = {
  userRole: 'participant',
  planType: 'ira',
  pvSource: null,
  decisions: { decreeLanguageConfirmed: 'yes', custodian: 'Fidelity', custodianNotes: '' },
};
const govCivilianFlagOnly = {
  userRole: 'alternatePayee',
  planType: 'gov_civilian',
  pvSource: null,
  decisions: { starterQuestionResponses: [] }, // empty allowed per §8.10.2
};
const privateDbNoPv = {
  userRole: 'participant',
  planType: 'private_db',
  pvSource: null,
  decisions: {},
};
const privateDbWithPv = {
  userRole: 'participant',
  planType: 'private_db',
  pvSource: 'tier2_face_2026Q1',
  decisions: {},
};

describe('countByPlanType / countByUserRole (§8.10.3)', () => {
  it('counts assets by planType', () => {
    const assets = { a: dcParticipantComplete, b: dcAlternatePayeeComplete, c: iraComplete };
    expect(countByPlanType(assets)).toEqual({ dc: 2, ira: 1 });
  });

  it('counts assets by userRole', () => {
    const assets = { a: dcParticipantComplete, b: dcAlternatePayeeComplete, c: iraComplete };
    expect(countByUserRole(assets)).toEqual({ participant: 2, alternatePayee: 1 });
  });

  it('returns empty objects for an empty slice', () => {
    expect(countByPlanType({})).toEqual({});
    expect(countByUserRole({})).toEqual({});
  });
});

describe('flagOnlyAssets (§8.10.3)', () => {
  it('lists only flag-only assets with their assetId', () => {
    const assets = { a: dcParticipantComplete, fers: govCivilianFlagOnly };
    const result = flagOnlyAssets(assets);
    expect(result).toEqual([{ assetId: 'fers', asset: govCivilianFlagOnly }]);
  });

  it('returns [] when there are no flag-only assets', () => {
    expect(flagOnlyAssets({ a: dcParticipantComplete })).toEqual([]);
  });
});

describe('privateDbMissingPvSource (§8.10.3 → §8.6.3 warning header)', () => {
  it('lists private_db assets with null pvSource only', () => {
    const assets = { p1: privateDbNoPv, p2: privateDbWithPv, d: dcParticipantComplete };
    const result = privateDbMissingPvSource(assets);
    expect(result).toEqual([{ assetId: 'p1', asset: privateDbNoPv }]);
  });

  it('returns [] when no private_db assets are missing pvSource', () => {
    expect(privateDbMissingPvSource({ d: dcParticipantComplete, i: iraComplete })).toEqual([]);
  });
});

describe('isMixedPerspective (§8.10.3 — Set(userRoles).size > 1)', () => {
  it('true when both participant and alternatePayee present', () => {
    expect(isMixedPerspective({ a: dcParticipantComplete, b: dcAlternatePayeeComplete })).toBe(true);
  });

  it('false when only one perspective present', () => {
    expect(isMixedPerspective({ a: dcParticipantComplete, c: iraComplete })).toBe(false);
  });

  it('false for an empty slice', () => {
    expect(isMixedPerspective({})).toBe(false);
  });
});

describe('isPacketReady (§8.10.3 — decisions populated per branch shape)', () => {
  it('true when all dc + ira + flag-only assets are complete', () => {
    const assets = {
      a: dcParticipantComplete,
      b: dcAlternatePayeeComplete,
      c: iraComplete,
      f: govCivilianFlagOnly,
    };
    expect(isPacketReady(assets)).toBe(true);
  });

  it('participant-DC with receiptMethod null counts as ready (allocation + valuationDate populated)', () => {
    expect(isPacketReady({ a: dcParticipantComplete })).toBe(true);
  });

  it('false when participant-DC is missing valuationDate', () => {
    const broken = {
      ...dcParticipantComplete,
      decisions: { ...dcParticipantComplete.decisions, valuationDate: { type: null, date: null } },
    };
    expect(isPacketReady({ a: broken })).toBe(false);
  });

  it('false when alternate-payee DC is missing receiptMethod', () => {
    const broken = {
      ...dcAlternatePayeeComplete,
      decisions: { ...dcAlternatePayeeComplete.decisions, receiptMethod: null },
    };
    expect(isPacketReady({ b: broken })).toBe(false);
  });

  it('false when IRA is missing custodian', () => {
    const broken = { ...iraComplete, decisions: { decreeLanguageConfirmed: 'yes', custodian: '', custodianNotes: '' } };
    expect(isPacketReady({ c: broken })).toBe(false);
  });

  it('flag-only asset is ready even with an empty starterQuestionResponses array', () => {
    expect(isPacketReady({ f: govCivilianFlagOnly })).toBe(true);
  });

  it('false for an empty slice (nothing to generate)', () => {
    expect(isPacketReady({})).toBe(false);
  });
});
