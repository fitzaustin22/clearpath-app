import { describe, it, expect } from 'vitest';
import { deriveActiveStoreKey } from '../deriveActive';

function buildSections(overrides = {}) {
  const empty = (label) => ({ status: 'empty', label, sourceModule: 'm1', data: null });
  const base = {
    s1:  empty('Personal Profile'),
    s2:  empty('Income Analysis'),
    s3:  empty('Asset Inventory'),
    s4:  empty('Tax Analysis'),
    s5:  empty('Property Division'),
    s6:  empty('Retirement Plan Division'),
    s7:  empty('Expense Analysis'),
    s8:  empty('Support Analysis'),
    s9:  empty('Home Decision'),
    s10: empty('Negotiation Strategy'),
    s11: empty('Settlement Offer Overview'),
    s12: empty('Action Plan & Timeline'),
  };
  for (const [k, v] of Object.entries(overrides)) base[k] = { ...base[k], ...v };
  return base;
}

describe('deriveActiveStoreKey', () => {
  it('picks s1 when nothing is started (first card in zone order)', () => {
    expect(deriveActiveStoreKey(buildSections())).toBe('s1');
  });

  it('skips complete sections and picks the first non-complete in card order', () => {
    // SCHEMATIC_CARDS order is s1, s3, s9, s2, s5, s6, s7, s4, s8, s10, s11, s12.
    // Mark s1, s3, s9 complete → next non-complete is s2.
    const sections = buildSections({
      s1: { status: 'complete' },
      s3: { status: 'complete' },
      s9: { status: 'complete' },
    });
    expect(deriveActiveStoreKey(sections)).toBe('s2');
  });

  it('treats partial as non-complete (a partial card is still the "writing now" card)', () => {
    const sections = buildSections({
      s1: { status: 'complete' },
      s3: { status: 'partial' },   // partial wins — s3 is in card order before s9
    });
    expect(deriveActiveStoreKey(sections)).toBe('s3');
  });

  it('returns null when every section is complete', () => {
    const all = buildSections();
    for (const k of Object.keys(all)) all[k] = { ...all[k], status: 'complete' };
    expect(deriveActiveStoreKey(all)).toBeNull();
  });

  it('returns null on missing input', () => {
    expect(deriveActiveStoreKey(undefined)).toBeNull();
    expect(deriveActiveStoreKey(null)).toBeNull();
  });

  it('treats an unknown status value as non-complete', () => {
    const sections = buildSections({
      s1: { status: 'complete' },
      s3: { status: 'someUnknownState' },
    });
    expect(deriveActiveStoreKey(sections)).toBe('s3');
  });

  it('follows zone order across zones (last Zone-A card s2 → first Zone-B card s5)', () => {
    // Complete all Zone-A cards: s1, s3, s9, s2 → next is first Zone-B card s5
    const sections = buildSections({
      s1: { status: 'complete' },
      s3: { status: 'complete' },
      s9: { status: 'complete' },
      s2: { status: 'complete' },
    });
    expect(deriveActiveStoreKey(sections)).toBe('s5');
  });
});
