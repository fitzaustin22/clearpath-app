// __tests__/mfjDifferentialFootnote.test.js
//
// Coverage for Q-9 MFJ-vs-Single differential per M5-Tool-Specs.md §9.5.3.
// Maps to TC-HDA-4: three gain levels surfacing the bounded differential.

import { describe, it, expect } from 'vitest';
import { calculateMfjDifferential } from '../mfjDifferentialFootnote';

describe('calculateMfjDifferential', () => {
  it('gainAtSale=$200k — differential $0 (both exclusions cover full gain), TC-HDA-4', () => {
    const r = calculateMfjDifferential({ gainAtSale: 200_000 });
    expect(r.exclusionSingle).toBe(200_000);
    expect(r.exclusionMfj).toBe(200_000);
    expect(r.differential).toBe(0);
    expect(r.isBoundedAt250k).toBe(false);
  });

  it('gainAtSale=$350k — differential $100k (Single caps at $250k), TC-HDA-4', () => {
    const r = calculateMfjDifferential({ gainAtSale: 350_000 });
    expect(r.exclusionSingle).toBe(250_000);
    expect(r.exclusionMfj).toBe(350_000);
    expect(r.differential).toBe(100_000);
    expect(r.isBoundedAt250k).toBe(false);
  });

  it('gainAtSale=$600k — differential $250k (capped at MFJ ceiling), TC-HDA-4', () => {
    const r = calculateMfjDifferential({ gainAtSale: 600_000 });
    expect(r.exclusionSingle).toBe(250_000);
    expect(r.exclusionMfj).toBe(500_000);
    expect(r.differential).toBe(250_000);
    expect(r.isBoundedAt250k).toBe(true);
  });

  it('gainAtSale=$250k — Single exactly covers; differential $0', () => {
    const r = calculateMfjDifferential({ gainAtSale: 250_000 });
    expect(r.exclusionSingle).toBe(250_000);
    expect(r.exclusionMfj).toBe(250_000);
    expect(r.differential).toBe(0);
  });

  it('gainAtSale=$500k — MFJ exactly covers; differential $250k (capped boundary)', () => {
    const r = calculateMfjDifferential({ gainAtSale: 500_000 });
    expect(r.exclusionSingle).toBe(250_000);
    expect(r.exclusionMfj).toBe(500_000);
    expect(r.differential).toBe(250_000);
    expect(r.isBoundedAt250k).toBe(true);
  });
});
