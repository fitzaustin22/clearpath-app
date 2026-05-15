// src/lib/homeDecision/homeDecisionConstants.js
//
// Build-time constants for the Home Decision Analyzer (HDA).
// Per M5-Tool-Specs.md §9.6.3 (banded refi rates), §9.6.5 (PMI matrix),
// §9.6.4 (state-aware closing costs), §9.4.2 (inflation assumption),
// §9.7 (projection horizons).

// Fisher-approximation inflation assumption per §9.4.2.
// Matches the Federal Reserve long-run target. Single source of truth for
// real-vs-nominal conversion across the HDA projection engine.
export const INFLATION_ASSUMPTION = 0.025;

// Banded refi-rate defaults per §9.6.3 (Q-11), build-time constants.
// Live-rate API integration deferred to v1.1 per §15 entry 12.
export const REFI_RATE_BY_CREDIT_BAND = {
  excellent: 0.0625,
  good: 0.0650,
  fair: 0.0700,
  poor: 0.0800,
};

// 2D credit × LTV PMI lookup matrix per §9.6.5 (Q-13).
// BPMI (borrower-paid PMI) assumption per v1 lock; LPMI deferred to v1.1.
// `poor` credit forces verdict red upstream per §9.6.2 — no PMI lookup.
export const PMI_MATRIX = {
  excellent: { '80-85': 0.0030, '85-90': 0.0040, '90-95': 0.0055 },
  good:      { '80-85': 0.0050, '85-90': 0.0065, '90-95': 0.0085 },
  fair:      { '80-85': 0.0085, '85-90': 0.0110, '90-95': 0.0140 },
};

// State-aware closing-costs defaults per §9.6.4 (Q-12).
// Range 2–5% by USPS code; high-cost-of-recording states map to upper end,
// low-cost states to lower end. v1 build-time constants per §9.6.4;
// live-state-data API deferred to v1.1.
export const STATE_CLOSING_COSTS_DEFAULT = {
  AL: 0.030, AK: 0.030, AZ: 0.030, AR: 0.028, CA: 0.035,
  CO: 0.023, CT: 0.040, DE: 0.045, DC: 0.040, FL: 0.045,
  GA: 0.030, HI: 0.040, ID: 0.025, IL: 0.035, IN: 0.025,
  IA: 0.025, KS: 0.025, KY: 0.025, LA: 0.030, ME: 0.035,
  MD: 0.045, MA: 0.040, MI: 0.030, MN: 0.030, MS: 0.025,
  MO: 0.025, MT: 0.025, NE: 0.025, NV: 0.030, NH: 0.035,
  NJ: 0.045, NM: 0.025, NY: 0.050, NC: 0.030, ND: 0.025,
  OH: 0.030, OK: 0.025, OR: 0.030, PA: 0.040, RI: 0.040,
  SC: 0.030, SD: 0.025, TN: 0.025, TX: 0.025, UT: 0.022,
  VT: 0.035, VA: 0.035, WA: 0.030, WV: 0.030, WI: 0.025,
  WY: 0.025,
  DEFAULT: 0.035,
};

// Projection horizons per §9.7 (no-toggle v1 lock).
// 3-year ≈ alimony period, 6-year ≈ post-alimony settling-in, 10-year ≈ long horizon.
export const PROJECTION_HORIZONS = [3, 6, 10];

// Default refi term in months — 30-year fixed conventional only at v1 (§9.3.2).
export const DEFAULT_REFI_TERM_MONTHS = 360;

// Locked v1 assumptions per §9.10. Surfaced into metadata blocks so downstream
// consumers (PDF handoff, v1.1 migration tooling) can reason about which v1
// simplifications were active.
export const V1_ASSUMPTIONS = Object.freeze({
  bpmiAssumption: true,
  conventionalLoanAssumption: true,
  realDollarConvention: true,
});
