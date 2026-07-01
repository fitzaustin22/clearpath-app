import { describe, it, expect } from 'vitest';
import { buildInputSnapshot, isSupportSaved } from '../resultValidity.js';

const inputs = () => ({
  region: 'MD',
  incomeYou: '2000',
  incomeSpouse: '12000',
  numChildren: '2',
  parentingPct: 65,
  childcare: '',
  health: '',
  marriageYears: '',
  existingSupport: '',
});

describe('isSupportSaved — §8 validity-relative-to-current-inputs predicate', () => {
  it('returns false when s8 is not complete', () => {
    expect(isSupportSaved(inputs(), { status: 'empty', data: null })).toBe(false);
  });

  it('returns false when complete but s8.data carries no snapshot (legacy/other-writer payload)', () => {
    expect(isSupportSaved(inputs(), { status: 'complete', data: { totalMonthlySupport: 4975 } })).toBe(false);
  });

  it('returns true when complete and the snapshot matches current inputs exactly', () => {
    const s8 = { status: 'complete', data: { _inputSnapshot: buildInputSnapshot(inputs()) } };
    expect(isSupportSaved(inputs(), s8)).toBe(true);
  });

  it('returns false the moment a single field diverges from the saved snapshot', () => {
    const s8 = { status: 'complete', data: { _inputSnapshot: buildInputSnapshot(inputs()) } };
    const edited = { ...inputs(), incomeYou: '2500' };
    expect(isSupportSaved(edited, s8)).toBe(false);
  });
});
