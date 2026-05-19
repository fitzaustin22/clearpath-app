// Tests for §8.7 / §8.10.3 packet-readiness selectors. Store-state adapters
// over the locked pure §8.10.3 isPacketReady (DO-NOT-TOUCH qdroSelectors).
//
// Adjudication (PR4): build-prompt §5 prose ("flag-only answers non-empty")
// is superseded by LOCKED §8.10.2/§8.10.3 + the existing isPacketReady
// selector + its passing test (qdroSelectors.test.js:154): an empty
// starterQuestionResponses array is packet-ready (flag-only branches
// frequently defer all answers to the attorney). selectQDROPacketReady
// delegates to isPacketReady — spec-faithful, honors PR4-3.

import { describe, it, expect } from 'vitest';
import {
  selectQDROPacketReady,
  selectQDROPacketReadyAssetIds,
} from '../readiness.js';

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
const iraComplete = {
  userRole: 'participant',
  planType: 'ira',
  pvSource: null,
  decisions: { decreeLanguageConfirmed: 'yes', custodian: 'Fidelity', custodianNotes: '' },
};
const govCivilianEmptyFlagOnly = {
  userRole: 'alternatePayee',
  planType: 'gov_civilian',
  pvSource: null,
  decisions: { starterQuestionResponses: [] }, // empty allowed per §8.10.2
};
const militaryCapturedFlagOnly = {
  userRole: 'participant',
  planType: 'military',
  pvSource: null,
  decisions: {
    starterQuestionResponses: [{ questionId: 'military_q1', response: 'yes 10/10' }],
  },
};

const stateWith = (assets) => ({ qdroDecision: { assets } });

describe('selectQDROPacketReady (§8.10.3 store adapter)', () => {
  it('false when there are no assets (nothing to generate)', () => {
    expect(selectQDROPacketReady(stateWith({}))).toBe(false);
  });

  it('false when any asset is missing required branch capture', () => {
    const brokenDc = {
      ...dcParticipantComplete,
      decisions: { ...dcParticipantComplete.decisions, valuationDate: { type: null, date: null } },
    };
    expect(selectQDROPacketReady(stateWith({ a: brokenDc, b: iraComplete }))).toBe(false);
  });

  it('true when all DC + IRA captures are complete', () => {
    expect(selectQDROPacketReady(stateWith({ a: dcParticipantComplete, b: iraComplete }))).toBe(true);
  });

  it('true with a flag-only asset whose starterQuestionResponses is empty (LOCKED §8.10.2 — supersedes §5 prose)', () => {
    expect(
      selectQDROPacketReady(stateWith({ a: dcParticipantComplete, f: govCivilianEmptyFlagOnly })),
    ).toBe(true);
  });

  it('true with a flag-only asset that has captured responses', () => {
    expect(
      selectQDROPacketReady(stateWith({ a: iraComplete, f: militaryCapturedFlagOnly })),
    ).toBe(true);
  });

  it('false / safe when state or qdroDecision is absent', () => {
    expect(selectQDROPacketReady(undefined)).toBe(false);
    expect(selectQDROPacketReady({})).toBe(false);
    expect(selectQDROPacketReady({ qdroDecision: {} })).toBe(false);
  });
});

describe('selectQDROPacketReadyAssetIds (§8.7 packet asset list)', () => {
  it('returns every asset id when the packet is ready', () => {
    const ids = selectQDROPacketReadyAssetIds(
      stateWith({ a: dcParticipantComplete, b: iraComplete, f: govCivilianEmptyFlagOnly }),
    );
    expect(ids.sort()).toEqual(['a', 'b', 'f']);
  });

  it('returns [] when the packet is not ready', () => {
    const brokenIra = { ...iraComplete, decisions: { decreeLanguageConfirmed: 'yes', custodian: '', custodianNotes: '' } };
    expect(selectQDROPacketReadyAssetIds(stateWith({ a: dcParticipantComplete, b: brokenIra }))).toEqual([]);
  });

  it('returns [] safely when state or qdroDecision is absent', () => {
    expect(selectQDROPacketReadyAssetIds(undefined)).toEqual([]);
    expect(selectQDROPacketReadyAssetIds({})).toEqual([]);
  });
});
