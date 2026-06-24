import { describe, it, expect } from 'vitest';
import {
  itemNetValue,
  effectiveAlloc,
  intentAlloc,
  titleholderForAlloc,
  allocOneSided,
  rollup,
  computeTotals,
  splitFromCategoryTotals,
} from '@/src/lib/m2/estateRollup';
import { computeCategoryTotals, ALL_SECTIONS, LIABILITY_KEYS } from '@/src/lib/m2Sections';

// A realistic estate mirroring the design hand-off sample (mei/data.js),
// expressed in the FROZEN m2Store item shape: { category, currentValue,
// outstandingBalance, titleholder, classification }. Every item here is
// classified (marital/separate/mixed→commingled) so titleholder drives the
// division, EXCEPT the explicitly unallocated ones.
function sampleItems() {
  return [
    // Real estate: $820k FMV − $200k mortgage = $620k net equity, to client.
    { id: 're-1', category: 'realEstate', currentValue: 820000, outstandingBalance: 200000, titleholder: 'self', classification: 'marital' },
    // Working capital
    { id: 'wc-1', category: 'workingCapital', currentValue: 16000, outstandingBalance: 0, titleholder: 'joint', classification: 'marital' },
    { id: 'wc-2', category: 'workingCapital', currentValue: 44000, outstandingBalance: 0, titleholder: 'self', classification: 'marital' },
    { id: 'wc-3', category: 'workingCapital', currentValue: 98000, outstandingBalance: 0, titleholder: 'self', classification: 'unknown' }, // brokerage, unallocated via classification
    // Retirement (both 401k)
    { id: 'ra-1', category: 'retirement', currentValue: 145000, outstandingBalance: 0, titleholder: 'self', classification: 'marital' },
    { id: 'ra-2', category: 'retirement', currentValue: 228000, outstandingBalance: 0, titleholder: 'spouse', classification: 'marital' },
    // Pension (present value, spouse)
    { id: 'pn-1', category: 'pensions', currentValue: 450000, outstandingBalance: 0, titleholder: 'spouse', classification: 'marital' },
    // Other assets — vehicles
    { id: 'oa-1', category: 'otherAssets', currentValue: 22000, outstandingBalance: 0, titleholder: 'self', classification: 'marital' },
    { id: 'oa-2', category: 'otherAssets', currentValue: 16000, outstandingBalance: 0, titleholder: 'spouse', classification: 'marital' },
    // Personal property — unallocated by titleholder ('other')
    { id: 'pp-1', category: 'personalProperty', currentValue: 35000, outstandingBalance: 0, titleholder: 'other', classification: 'marital' },
    // Liabilities
    { id: 'ln-1', category: 'loans', currentValue: 48000, outstandingBalance: 0, titleholder: 'self', classification: 'marital' },
    { id: 'cc-1', category: 'creditCards', currentValue: 22000, outstandingBalance: 0, titleholder: 'spouse', classification: 'marital' },
  ];
}

describe('itemNetValue', () => {
  it('nets the loan against an asset (FMV − outstanding balance)', () => {
    expect(itemNetValue({ category: 'realEstate', currentValue: 820000, outstandingBalance: 200000 })).toBe(620000);
  });

  it('uses currentValue directly for a liability (no outstandingBalance netting)', () => {
    expect(itemNetValue({ category: 'creditCards', currentValue: 22000, outstandingBalance: 0 })).toBe(22000);
  });

  it('coerces missing/blank numerics to 0', () => {
    expect(itemNetValue({ category: 'otherAssets' })).toBe(0);
  });
});

describe('effectiveAlloc — division axis (titleholder gated by classification)', () => {
  it('maps titleholder self→you, spouse→spouse, joint→split', () => {
    expect(effectiveAlloc({ category: 'workingCapital', titleholder: 'self', classification: 'marital' })).toBe('you');
    expect(effectiveAlloc({ category: 'workingCapital', titleholder: 'spouse', classification: 'marital' })).toBe('spouse');
    expect(effectiveAlloc({ category: 'workingCapital', titleholder: 'joint', classification: 'marital' })).toBe('split');
  });

  it('routes other/unknown titleholders to unalloc', () => {
    expect(effectiveAlloc({ category: 'otherAssets', titleholder: 'other', classification: 'marital' })).toBe('unalloc');
    expect(effectiveAlloc({ category: 'otherAssets', titleholder: 'unknown', classification: 'marital' })).toBe('unalloc');
  });

  it('classification override: disputed/unknown classification → unalloc regardless of titleholder', () => {
    expect(effectiveAlloc({ category: 'workingCapital', titleholder: 'self', classification: 'unknown' })).toBe('unalloc');
    expect(effectiveAlloc({ category: 'workingCapital', titleholder: 'self', classification: 'disputed' })).toBe('unalloc');
  });
});

describe('intentAlloc — what the segmented control shows (pure titleholder, no classification gate)', () => {
  it('reflects the user titleholder choice even when classification gates the aggregate', () => {
    expect(intentAlloc({ titleholder: 'self', classification: 'unknown' })).toBe('you');
    expect(intentAlloc({ titleholder: 'joint', classification: 'unknown' })).toBe('split');
    expect(intentAlloc({ titleholder: 'other' })).toBe('unalloc');
  });
});

describe('titleholderForAlloc — control writes back to the frozen titleholder field', () => {
  it('round-trips you/spouse/split/unalloc → self/spouse/joint/unknown', () => {
    expect(titleholderForAlloc('you')).toBe('self');
    expect(titleholderForAlloc('spouse')).toBe('spouse');
    expect(titleholderForAlloc('split')).toBe('joint');
    expect(titleholderForAlloc('unalloc')).toBe('unknown');
  });
});

describe('allocOneSided — split-bar proportions for a single item', () => {
  it('split contributes value/2 conceptually → equal you/spouse halves', () => {
    expect(allocOneSided('split')).toEqual({ you: 1, spouse: 1, unalloc: 0 });
  });
  it('you/spouse/unalloc are one-sided', () => {
    expect(allocOneSided('you')).toEqual({ you: 1, spouse: 0, unalloc: 0 });
    expect(allocOneSided('spouse')).toEqual({ you: 0, spouse: 1, unalloc: 0 });
    expect(allocOneSided('unalloc')).toEqual({ you: 0, spouse: 0, unalloc: 1 });
  });
});

describe('rollup — README math over store items', () => {
  it('a split item contributes value/2 to each side', () => {
    const r = rollup([
      { category: 'workingCapital', currentValue: 16000, outstandingBalance: 0, titleholder: 'joint', classification: 'marital' },
    ]);
    expect(r.you).toBe(8000);
    expect(r.spouse).toBe(8000);
    expect(r.unalloc).toBe(0);
    expect(r.total).toBe(16000);
  });

  it('classification-gated item lands in unalloc, not you/spouse', () => {
    const r = rollup([
      { category: 'workingCapital', currentValue: 98000, outstandingBalance: 0, titleholder: 'self', classification: 'unknown' },
    ]);
    expect(r.you).toBe(0);
    expect(r.spouse).toBe(0);
    expect(r.unalloc).toBe(98000);
    expect(r.total).toBe(98000);
  });

  it('skips zero-net items', () => {
    const r = rollup([
      { category: 'realEstate', currentValue: 200000, outstandingBalance: 200000, titleholder: 'self', classification: 'marital' },
    ]);
    expect(r.total).toBe(0);
    expect(r.you).toBe(0);
  });
});

describe('computeTotals — net estate, percentages, divide-by-zero guard', () => {
  it('net = assets − liabilities on each side', () => {
    const t = computeTotals(sampleItems());
    // Client assets: 620k(re) + 8k(wc joint half) + 44k(wc self) + 145k(401k self)
    //              + 22k(vehicle self) = 839,000.  (brokerage 98k unknown → unalloc;
    //              personal property 35k 'other' → unalloc)
    expect(t.assets.you).toBe(839000);
    // Spouse assets: 8k(wc joint half) + 228k(401k spouse) + 450k(pension)
    //              + 16k(vehicle spouse) = 702,000.
    expect(t.assets.spouse).toBe(702000);
    // Client liabilities: 48k HELOC (self). Spouse liabilities: 22k card.
    expect(t.liabilities.you).toBe(48000);
    expect(t.liabilities.spouse).toBe(22000);
    // Net = assets − liabilities
    expect(t.net.you).toBe(839000 - 48000);
    expect(t.net.spouse).toBe(702000 - 22000);
  });

  it('youPct + spousePct sum to 100 when there is an allocated estate', () => {
    const t = computeTotals(sampleItems());
    expect(t.youPct + t.spousePct).toBe(100);
    expect(t.youPct).toBeGreaterThan(0);
    expect(t.spousePct).toBeGreaterThan(0);
  });

  it('guards divide-by-zero: nothing allocated → 0% / 0%, no NaN', () => {
    const t = computeTotals([
      { category: 'workingCapital', currentValue: 50000, outstandingBalance: 0, titleholder: 'unknown', classification: 'unknown' },
    ]);
    expect(t.allocated).toBe(0);
    expect(t.youPct).toBe(0);
    expect(t.spousePct).toBe(0);
    expect(Number.isNaN(t.youPct)).toBe(false);
  });
});

describe('reconciliation — the module IS the store/blueprint division math', () => {
  it('computeTotals matches the existing computeCategoryTotals aggregated across categories', () => {
    const items = sampleItems();
    const t = computeTotals(items);
    const cats = computeCategoryTotals(items);

    let client = 0, spouse = 0, unalloc = 0;
    let clientL = 0, spouseL = 0, unallocL = 0;
    for (const section of ALL_SECTIONS) {
      const c = cats[section.key];
      if (!c) continue;
      if (LIABILITY_KEYS.has(section.key)) {
        clientL += c.client; spouseL += c.spouse; unallocL += c.unallocated;
      } else {
        client += c.client; spouse += c.spouse; unalloc += c.unallocated;
      }
    }
    expect(t.assets.you).toBe(client);
    expect(t.assets.spouse).toBe(spouse);
    expect(t.assets.unalloc).toBe(unalloc);
    expect(t.liabilities.you).toBe(clientL);
    expect(t.liabilities.spouse).toBe(spouseL);
    expect(t.liabilities.unalloc).toBe(unallocL);
    // And the net (Estate so far) reconciles to client/spouse net estate.
    expect(t.net.you).toBe(client - clientL);
    expect(t.net.spouse).toBe(spouse - spouseL);
  });
});

describe('splitFromCategoryTotals — adapt store {client,spouse,unallocated} to bar {you,spouse,unalloc}', () => {
  it('renames the keys without changing values', () => {
    expect(splitFromCategoryTotals({ total: 100, client: 60, spouse: 30, unallocated: 10 })).toEqual({
      you: 60, spouse: 30, unalloc: 10, total: 100,
    });
  });
  it('tolerates a missing category total', () => {
    expect(splitFromCategoryTotals(undefined)).toEqual({ you: 0, spouse: 0, unalloc: 0, total: 0 });
  });
});
