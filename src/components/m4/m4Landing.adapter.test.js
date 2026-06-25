import { describe, it, expect } from 'vitest';
import { m4NormalizeProgress } from './m4Landing.adapter';

// Minimal raw store-slice fixtures. m4NormalizeProgress receives the real
// useM4Store slices; these build only the field it reads. M4's store is BINARY —
// each tool slice carries a `completedAt` timestamp (set atomically with `results`
// by setFilingStatusResults / setPITResults). There is NO partial-progress signal,
// so the adapter maps:
//   completedAt set  -> complete / 100
//   completedAt null -> not_started / 0
// (No in_progress branch — the old M4 page only ever showed Complete / Not started.)

const emptyFilingStatus = { completedAt: null };
const emptyPit = { completedAt: null };

function normalize({ filingStatusOptimizer, pitTaxDiscount } = {}) {
  return m4NormalizeProgress({
    filingStatusOptimizer: filingStatusOptimizer || emptyFilingStatus,
    pitTaxDiscount: pitTaxDiscount || emptyPit,
  });
}

const byId = (rows, id) => rows.find((r) => r.id === id);

describe('m4NormalizeProgress — shape & order', () => {
  it('returns one entry per worksheet, in journey order, keyed by store slice id', () => {
    const rows = normalize();
    expect(rows.map((r) => r.id)).toEqual([
      'filingStatusOptimizer',
      'pitTaxDiscount',
    ]);
  });

  it('an all-empty store yields every worksheet not_started at 0%', () => {
    const rows = normalize();
    for (const r of rows) {
      expect(r.status).toBe('not_started');
      expect(r.pct).toBe(0);
    }
  });

  it('never emits an in_progress status (M4 has no partial-progress signal)', () => {
    const rows = normalize({
      filingStatusOptimizer: { completedAt: '2026-06-25T00:00:00.000Z' },
      pitTaxDiscount: { completedAt: null },
    });
    for (const r of rows) {
      expect(r.status).not.toBe('in_progress');
    }
  });
});

describe('m4NormalizeProgress — filing status optimizer (binary)', () => {
  it('completedAt set → complete 100%', () => {
    const rows = normalize({
      filingStatusOptimizer: { completedAt: '2026-06-25T12:00:00.000Z' },
    });
    expect(byId(rows, 'filingStatusOptimizer')).toMatchObject({
      status: 'complete',
      pct: 100,
    });
  });

  it('completedAt null → not_started 0%', () => {
    const rows = normalize({
      filingStatusOptimizer: { completedAt: null },
    });
    expect(byId(rows, 'filingStatusOptimizer')).toMatchObject({
      status: 'not_started',
      pct: 0,
    });
  });
});

describe('m4NormalizeProgress — PIT tax discount calculator (binary)', () => {
  it('completedAt set → complete 100%', () => {
    const rows = normalize({
      pitTaxDiscount: { completedAt: '2026-06-25T12:00:00.000Z' },
    });
    expect(byId(rows, 'pitTaxDiscount')).toMatchObject({
      status: 'complete',
      pct: 100,
    });
  });

  it('completedAt null → not_started 0%', () => {
    const rows = normalize({
      pitTaxDiscount: { completedAt: null },
    });
    expect(byId(rows, 'pitTaxDiscount')).toMatchObject({
      status: 'not_started',
      pct: 0,
    });
  });

  it('the two worksheets resolve independently', () => {
    const rows = normalize({
      filingStatusOptimizer: { completedAt: null },
      pitTaxDiscount: { completedAt: '2026-06-25T12:00:00.000Z' },
    });
    expect(byId(rows, 'filingStatusOptimizer').status).toBe('not_started');
    expect(byId(rows, 'pitTaxDiscount').status).toBe('complete');
  });
});

describe('m4NormalizeProgress — null-safety (pre-hydration / missing slices)', () => {
  it('a missing raw object yields two not_started rows (no throw)', () => {
    const rows = m4NormalizeProgress(undefined);
    expect(rows.map((r) => r.id)).toEqual([
      'filingStatusOptimizer',
      'pitTaxDiscount',
    ]);
    for (const r of rows) {
      expect(r).toMatchObject({ status: 'not_started', pct: 0 });
    }
  });
});
