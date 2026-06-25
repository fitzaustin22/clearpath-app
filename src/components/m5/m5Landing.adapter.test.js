// Unit tests for the M5 progress adapter's PURE normalizer. M5 is the most
// heterogeneous store of the ModuleLanding rollout, so there is one test per
// distinct completion semantic — that's where the risk lives:
//   - Support Estimator & Home Decision: SINGLETON `results` objects, BINARY
//     (results != null -> complete; else not_started; no in_progress — the
//     pre-pop-immune signal, per the M5 migration checkpoint).
//   - Pension Valuation: MULTI-INSTANCE `assets{}` map — complete iff ANY asset
//     has results != null (flag-only results count: a finished analysis); a bare
//     asset with no results is in_progress; an empty map is not_started.
//   - QDRO Decision Guide: NO completion flag — leans on the dormant contract
//     field `metadata.qdroPacketGeneratedAt` (no production code writes it yet),
//     complete iff ANY asset has it stamped; a bare asset is in_progress; empty
//     is not_started.
// pct is the sanctioned synthetic bucket (0 / 50 / 100), as M3/M4.

import { describe, it, expect } from 'vitest';
import { m5NormalizeProgress } from './m5Landing.adapter.js';

// Journey order is locked: [SE, PVA, QDRO, HDA] (M5_LANDING.worksheets order).
const ORDER = ['supportEstimator', 'pensionValuation', 'qdroDecision', 'homeDecision'];
const byId = (entries) => Object.fromEntries(entries.map((e) => [e.id, e]));

// A minimal store shape with every slice empty/initial (mirrors makeInitial*).
function emptyStore() {
  return {
    supportEstimator: { results: null },
    pensionValuation: { assets: {} },
    qdroDecision: { assets: {} },
    homeDecision: { results: null },
  };
}

describe('m5NormalizeProgress — shape & order', () => {
  it('returns one entry per worksheet, in journey order (SE, PVA, QDRO, HDA)', () => {
    const out = m5NormalizeProgress(emptyStore());
    expect(out.map((e) => e.id)).toEqual(ORDER);
  });

  it('is null-safe — undefined raw / missing slices => all not_started/0', () => {
    for (const raw of [undefined, {}, null]) {
      const out = m5NormalizeProgress(raw);
      expect(out.map((e) => e.id)).toEqual(ORDER);
      for (const e of out) {
        expect(e.status).toBe('not_started');
        expect(e.pct).toBe(0);
      }
    }
  });
});

// ── Singleton tools: Support Estimator (binary) ───────────────────────────────
describe('m5NormalizeProgress — Support Estimator (singleton, binary)', () => {
  it('results present => complete / 100', () => {
    const raw = { ...emptyStore(), supportEstimator: { results: { childSupport: 100 } } };
    expect(byId(m5NormalizeProgress(raw)).supportEstimator).toEqual({
      id: 'supportEstimator',
      status: 'complete',
      pct: 100,
    });
  });

  it('results null => not_started / 0 (NO in_progress — binary)', () => {
    const raw = { ...emptyStore(), supportEstimator: { results: null } };
    expect(byId(m5NormalizeProgress(raw)).supportEstimator).toEqual({
      id: 'supportEstimator',
      status: 'not_started',
      pct: 0,
    });
  });
});

// ── Singleton tools: Home Decision Analyzer (binary) ──────────────────────────
describe('m5NormalizeProgress — Home Decision Analyzer (singleton, binary)', () => {
  it('results present => complete / 100', () => {
    const raw = { ...emptyStore(), homeDecision: { results: { keepAndRefi: {} } } };
    expect(byId(m5NormalizeProgress(raw)).homeDecision).toEqual({
      id: 'homeDecision',
      status: 'complete',
      pct: 100,
    });
  });

  it('results null => not_started / 0 (NO in_progress — binary)', () => {
    const raw = { ...emptyStore(), homeDecision: { results: null } };
    expect(byId(m5NormalizeProgress(raw)).homeDecision).toEqual({
      id: 'homeDecision',
      status: 'not_started',
      pct: 0,
    });
  });
});

// ── Multi-instance: Pension Valuation (assets{}) ──────────────────────────────
describe('m5NormalizeProgress — Pension Valuation (multi-instance assets{})', () => {
  it('empty assets map => not_started / 0', () => {
    const raw = { ...emptyStore(), pensionValuation: { assets: {} } };
    expect(byId(m5NormalizeProgress(raw)).pensionValuation).toEqual({
      id: 'pensionValuation',
      status: 'not_started',
      pct: 0,
    });
  });

  it('an asset with NO results => in_progress / 50', () => {
    const raw = {
      ...emptyStore(),
      pensionValuation: { assets: { a1: { inputs: { foo: 1 }, results: null } } },
    };
    expect(byId(m5NormalizeProgress(raw)).pensionValuation).toEqual({
      id: 'pensionValuation',
      status: 'in_progress',
      pct: 50,
    });
  });

  it('ANY asset with results != null => complete / 100', () => {
    const raw = {
      ...emptyStore(),
      pensionValuation: { assets: { a1: { results: { pv: { best: 1000 } } } } },
    };
    expect(byId(m5NormalizeProgress(raw)).pensionValuation).toEqual({
      id: 'pensionValuation',
      status: 'complete',
      pct: 100,
    });
  });

  it('a flag-only result (results present, pv null) still counts as complete', () => {
    const raw = {
      ...emptyStore(),
      pensionValuation: { assets: { a1: { results: { pv: null } } } },
    };
    expect(byId(m5NormalizeProgress(raw)).pensionValuation.status).toBe('complete');
  });

  it('mixed assets — at least one valued => complete (any-asset rule)', () => {
    const raw = {
      ...emptyStore(),
      pensionValuation: {
        assets: {
          a1: { results: null },
          a2: { results: { pv: { best: 5 } } },
        },
      },
    };
    expect(byId(m5NormalizeProgress(raw)).pensionValuation.status).toBe('complete');
  });
});

// ── Multi-instance + dormant flag: QDRO Decision Guide ────────────────────────
describe('m5NormalizeProgress — QDRO Decision Guide (qdroPacketGeneratedAt)', () => {
  function qdroAsset(overrides = {}) {
    return {
      userRole: null,
      planType: null,
      decisions: {},
      metadata: { formulaId: null, citations: [], qdroPacketGeneratedAt: null },
      ...overrides,
    };
  }

  it('empty assets map => not_started / 0', () => {
    const raw = { ...emptyStore(), qdroDecision: { assets: {} } };
    expect(byId(m5NormalizeProgress(raw)).qdroDecision).toEqual({
      id: 'qdroDecision',
      status: 'not_started',
      pct: 0,
    });
  });

  it('an asset present but NO packet => in_progress / 50', () => {
    const raw = { ...emptyStore(), qdroDecision: { assets: { a1: qdroAsset() } } };
    expect(byId(m5NormalizeProgress(raw)).qdroDecision).toEqual({
      id: 'qdroDecision',
      status: 'in_progress',
      pct: 50,
    });
  });

  it('ANY asset with metadata.qdroPacketGeneratedAt set => complete / 100', () => {
    const raw = {
      ...emptyStore(),
      qdroDecision: {
        assets: {
          a1: qdroAsset(),
          a2: qdroAsset({
            metadata: { formulaId: 'x', citations: [], qdroPacketGeneratedAt: '2026-06-25T00:00:00.000Z' },
          }),
        },
      },
    };
    expect(byId(m5NormalizeProgress(raw)).qdroDecision).toEqual({
      id: 'qdroDecision',
      status: 'complete',
      pct: 100,
    });
  });

  it('is defensive when an asset lacks metadata entirely (=> in_progress, not a throw)', () => {
    const raw = { ...emptyStore(), qdroDecision: { assets: { a1: {} } } };
    expect(byId(m5NormalizeProgress(raw)).qdroDecision.status).toBe('in_progress');
  });
});

// ── pct buckets are exactly the sanctioned 0 / 50 / 100 ───────────────────────
describe('m5NormalizeProgress — pct buckets', () => {
  it('emits only 0, 50, or 100', () => {
    const raw = {
      supportEstimator: { results: { x: 1 } }, // 100
      pensionValuation: { assets: { a1: { results: null } } }, // 50
      qdroDecision: { assets: {} }, // 0
      homeDecision: { results: null }, // 0
    };
    const pcts = m5NormalizeProgress(raw).map((e) => e.pct).sort((a, b) => a - b);
    expect(pcts).toEqual([0, 0, 50, 100]);
    for (const p of pcts) expect([0, 50, 100]).toContain(p);
  });
});
