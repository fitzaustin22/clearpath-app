import { describe, it, expect } from 'vitest';
import { ZONES, SCHEMATIC_CARDS, cardsInZone } from '../sections';

describe('schematic taxonomy', () => {
  it('has exactly 12 cards', () => {
    expect(SCHEMATIC_CARDS).toHaveLength(12);
  });

  it('binds each card to a unique store key (12 unique s1..s12)', () => {
    const keys = SCHEMATIC_CARDS.map((c) => c.storeKey);
    const expected = ['s1','s2','s3','s4','s5','s6','s7','s8','s9','s10','s11','s12'];
    expect(new Set(keys).size).toBe(12);
    expect([...keys].sort()).toEqual(expected.sort());
  });

  it('declares 4 zones with locked column counts (4/5/2/1)', () => {
    expect(ZONES).toHaveLength(4);
    expect(ZONES.map((z) => z.id)).toEqual(['A', 'B', 'C', 'D']);
    expect(ZONES.map((z) => z.columns)).toEqual([4, 5, 2, 1]);
  });

  it('each card’s zone is one of A/B/C/D', () => {
    const ids = new Set(ZONES.map((z) => z.id));
    for (const c of SCHEMATIC_CARDS) {
      expect(ids.has(c.zone)).toBe(true);
    }
  });

  it('each zone has cards matching its declared column count', () => {
    for (const z of ZONES) {
      expect(cardsInZone(z.id)).toHaveLength(z.columns);
    }
  });

  it('binds the relabeled design cards to s9 (Home Decision) and s5 (Property Division)', () => {
    const s9 = SCHEMATIC_CARDS.find((c) => c.storeKey === 's9');
    const s5 = SCHEMATIC_CARDS.find((c) => c.storeKey === 's5');
    expect(s9.label).toBe('Home Decision');
    expect(s9.zone).toBe('A');
    expect(s5.label).toBe('Property Division');
    expect(s5.zone).toBe('B');
  });

  it('preserves the design’s within-zone card ORDER for Zone B (Tax Impact in slot 4)', () => {
    const zoneB = cardsInZone('B');
    expect(zoneB.map((c) => c.label)).toEqual([
      'Property Division',
      'Retirement & Pensions',
      'Expense & Budget',
      'Tax Impact',
      'Support Analysis',
    ]);
  });

  it('Zone A reads in design order (Story, Inventory, Home, Income)', () => {
    expect(cardsInZone('A').map((c) => c.label)).toEqual([
      'Your Story & Goals',
      'Asset Inventory',
      'Home Decision',
      'Income Analysis',
    ]);
  });

  it('arrays are frozen (immutable taxonomy)', () => {
    expect(Object.isFrozen(SCHEMATIC_CARDS)).toBe(true);
    expect(Object.isFrozen(ZONES)).toBe(true);
  });

  it('cardsInZone returns [] for an unknown zone id', () => {
    expect(cardsInZone('Z')).toEqual([]);
  });
});
