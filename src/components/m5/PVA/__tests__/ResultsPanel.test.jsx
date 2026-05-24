/**
 * ResultsPanel tests (§7.6.1 / §7.6.3).
 *
 * Drives ResultsPanel with synthetic `results` payloads matching the
 * spec §7.6.4 persistence shape. Covers:
 *   - Soft placeholder when results === null
 *   - Tier 1/2: 1 BigNumber + sensitivity bracket
 *   - Tier 3: 2 BigNumbers (marital + total) + coverture fraction in label
 *   - Cash balance: 1 BigNumber, no sensitivity (low === high)
 *   - Cash balance with coverture: 2 BigNumbers
 *   - Flag-only: no BigNumber, only the flag banner
 *   - 2 structural banners: frozen, flag-only
 *   - Unconditional inventory note on compute paths
 */

import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import ResultsPanel from '../ResultsPanel.jsx';

const TIER_1_RESULTS = {
  path: 'tier_1',
  formulaId: 'pva_db_tier1_v1',
  pv: { best: 165783, low: 126443, high: 218973 },
  coverture: null,
  receiptForm: 'monthly_db_stream',
  metadata: { planType: 'private_db_traditional' },
};

const TIER_3_RESULTS = {
  path: 'tier_3',
  formulaId: 'pva_db_tier3_coverture_v1',
  pv: {
    total: { best: 190845, low: 154543, high: 237284 },
    marital: { best: 60964, low: 49362, high: 75788 },
  },
  coverture: {
    fraction: 0.3194,
    numeratorMonths: 115,
    denominatorMonths: 360,
    maritalServiceStart: '2015-06-01',
    maritalServiceEnd: '2024-12-31',
  },
  receiptForm: 'monthly_db_stream',
  metadata: { planType: 'private_db_traditional' },
};

const TIER_3_ZERO_RESULTS = {
  ...TIER_3_RESULTS,
  pv: {
    total: { best: 190845, low: 154543, high: 237284 },
    marital: { best: 0, low: 0, high: 0 },
  },
  coverture: { ...TIER_3_RESULTS.coverture, fraction: 0, numeratorMonths: 0 },
};

const IN_PAY_RESULTS = {
  path: 'in_pay_status',
  formulaId: 'pva_db_inpaystatus_v1',
  pv: { best: 612800, low: 578400, high: 650200 },
  coverture: null,
  receiptForm: 'monthly_db_stream',
  metadata: {},
};

const CASH_BALANCE_RESULTS = {
  path: 'cash_balance',
  formulaId: 'pva_cashbalance_passthrough_v1',
  pv: { best: 245600, low: 245600, high: 245600 },
  coverture: null,
  receiptForm: 'lump_sum_rollover_to_ira',
  metadata: {},
};

const CASH_BALANCE_COVERTURE_RESULTS = {
  path: 'cash_balance',
  formulaId: 'pva_cashbalance_passthrough_v1',
  pv: {
    total: { best: 245600, low: 245600, high: 245600 },
    marital: { best: 78456, low: 78456, high: 78456 },
  },
  coverture: {
    fraction: 0.3194,
    numeratorMonths: 115,
    denominatorMonths: 360,
  },
  receiptForm: 'lump_sum_rollover_to_ira',
  metadata: {},
};

const FLAG_ONLY_RESULTS = {
  path: 'flag_only',
  formulaId: null,
  pv: null,
  coverture: null,
  receiptForm: null,
  metadata: { planType: 'multi_employer' },
};

describe('ResultsPanel (§7.6.1 / §7.6.3)', () => {
  it('TC-PVA-Results-1: soft placeholder when results=null', () => {
    render(<ResultsPanel results={null} flags={{}} />);
    expect(screen.getByTestId('pva-results-placeholder')).toBeInTheDocument();
    expect(screen.queryByTestId('pva-results-panel')).not.toBeInTheDocument();
  });

  it('TC-PVA-Results-2: tier_1 renders 1 BigNumber + sensitivity', () => {
    render(<ResultsPanel results={TIER_1_RESULTS} flags={{}} />);
    expect(screen.getByTestId('pva-bignumber-headline')).toBeInTheDocument();
    expect(screen.queryByTestId('pva-bignumber-marital')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pva-bignumber-total')).not.toBeInTheDocument();
    expect(screen.getByTestId('pva-sensitivity-bracket')).toBeInTheDocument();
    // No banners
    expect(screen.queryByTestId('pva-banner-frozen')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pva-banner-flagonly')).not.toBeInTheDocument();
  });

  it('TC-PVA-Results-3: tier_3 renders 2 BigNumbers (marital + total) with coverture fraction', () => {
    render(<ResultsPanel results={TIER_3_RESULTS} flags={{}} />);
    expect(screen.getByTestId('pva-bignumber-marital')).toBeInTheDocument();
    expect(screen.getByTestId('pva-bignumber-total')).toBeInTheDocument();
    expect(screen.queryByTestId('pva-bignumber-headline')).not.toBeInTheDocument();
    // Coverture fraction in label (0.3194 → "31.94%")
    expect(screen.getByText(/31\.94%/)).toBeInTheDocument();
    // Tier 3 has coverture → no sensitivity row (sensitivity hidden when coverture path)
    expect(screen.queryByTestId('pva-sensitivity-bracket')).not.toBeInTheDocument();
  });

  it('TC-PVA-Results-4: tier_3 zero coverture renders marital=$0', () => {
    render(<ResultsPanel results={TIER_3_ZERO_RESULTS} flags={{}} />);
    expect(screen.getByTestId('pva-bignumber-marital')).toBeInTheDocument();
    expect(screen.getByTestId('pva-bignumber-total')).toBeInTheDocument();
    expect(screen.getByText(/0\.00%/)).toBeInTheDocument();
  });

  it('TC-PVA-Results-5: in_pay renders 1 BigNumber + sensitivity', () => {
    render(<ResultsPanel results={IN_PAY_RESULTS} flags={{}} />);
    expect(screen.getByTestId('pva-bignumber-headline')).toBeInTheDocument();
    expect(screen.getByTestId('pva-sensitivity-bracket')).toBeInTheDocument();
  });

  it('TC-PVA-Results-6: cash_balance renders 1 BigNumber, no sensitivity (low=high)', () => {
    render(<ResultsPanel results={CASH_BALANCE_RESULTS} flags={{}} />);
    expect(screen.getByTestId('pva-bignumber-headline')).toBeInTheDocument();
    // Sensitivity bracket hidden when low===high (pass-through, no commutation)
    expect(screen.queryByTestId('pva-sensitivity-bracket')).not.toBeInTheDocument();
  });

  it('TC-PVA-Results-7: cash_balance with coverture renders 2 BigNumbers', () => {
    render(<ResultsPanel results={CASH_BALANCE_COVERTURE_RESULTS} flags={{}} />);
    expect(screen.getByTestId('pva-bignumber-marital')).toBeInTheDocument();
    expect(screen.getByTestId('pva-bignumber-total')).toBeInTheDocument();
    expect(screen.getByText(/31\.94%/)).toBeInTheDocument();
  });

  it('TC-PVA-Results-8: flag_only renders banner + no BigNumber', () => {
    render(<ResultsPanel results={FLAG_ONLY_RESULTS} flags={{}} />);
    expect(screen.getByTestId('pva-banner-flagonly')).toBeInTheDocument();
    expect(screen.queryByTestId('pva-bignumber-headline')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pva-bignumber-marital')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pva-bignumber-total')).not.toBeInTheDocument();
  });

  it('TC-PVA-Results-9: frozen banner surfaces when flags._frozenRoutingApplied=true', () => {
    render(<ResultsPanel results={TIER_1_RESULTS} flags={{ _frozenRoutingApplied: true }} />);
    expect(screen.getByTestId('pva-banner-frozen')).toBeInTheDocument();
    expect(screen.getByTestId('pva-bignumber-headline')).toBeInTheDocument();
  });

  it('TC-PVA-Results-10: unconditional inventory note renders on a compute path (replaces the obsolete legacy banner)', () => {
    render(<ResultsPanel results={TIER_3_RESULTS} flags={{}} />);
    const note = screen.getByTestId('pva-inventory-note');
    expect(note).toBeInTheDocument();
    expect(note).toHaveTextContent(/valued here from present-value inputs/i);
    // And — emphatically — no AMBER legacy banner.
    expect(screen.queryByTestId('pva-banner-legacy')).not.toBeInTheDocument();
  });

  it('TC-PVA-Results-10b: inventory note is NOT shown on flag_only (no PV to qualify)', () => {
    render(<ResultsPanel results={FLAG_ONLY_RESULTS} flags={{}} />);
    expect(screen.queryByTestId('pva-inventory-note')).toBeNull();
  });

  it('TC-PVA-Results-11: flag-only banner shows planType from results.metadata', () => {
    render(<ResultsPanel results={FLAG_ONLY_RESULTS} flags={{}} />);
    const banner = screen.getByTestId('pva-banner-flagonly');
    expect(banner).toHaveTextContent(/multi_employer/);
  });

  // ─── PR 3 / Phase 2 — CalloutStack integration ─────────────────────────
  it('TC-PVA-Results-12: mounts CalloutStack and renders engine callouts in §7.9.1 order', () => {
    const results = {
      ...TIER_1_RESULTS,
      breakdown: {
        callouts: [
          { type: 'liability_disclaimer' },
          { type: 'qpsa_election_callout' },
          { type: 'qdro_handoff_recommended', path: 'tier_1', planType: 'private_db_traditional' },
        ],
      },
    };
    render(<ResultsPanel results={results} flags={{}} />);
    const stack = screen.getByTestId('callout-stack');
    const ids = within(stack)
      .getAllByTestId(/^callout-/)
      .map((c) => c.getAttribute('data-testid'));
    expect(ids).toEqual([
      'callout-qpsa_election_callout',
      'callout-qdro_handoff_recommended',
      'callout-liability_disclaimer',
    ]);
  });

  it('TC-PVA-Results-13: renders nothing for empty callouts[]', () => {
    const results = { ...TIER_1_RESULTS, breakdown: { callouts: [] } };
    render(<ResultsPanel results={results} flags={{}} />);
    expect(screen.queryByTestId('callout-stack')).toBeNull();
  });

  it('TC-PVA-Results-14: structural banner and frozen_plan_tier1_routing callout both render', () => {
    // Banners (orchestrator flag) and CalloutStack content (engine
    // breakdown.callouts) are complementary surfaces; do NOT dedupe.
    const results = {
      ...TIER_1_RESULTS,
      breakdown: {
        callouts: [
          { type: 'frozen_plan_tier1_routing', planName: 'XYZ Plan' },
          { type: 'liability_disclaimer' },
        ],
      },
    };
    render(<ResultsPanel results={results} flags={{ _frozenRoutingApplied: true }} />);
    expect(screen.getByTestId('pva-banner-frozen')).toBeInTheDocument();
    expect(screen.getByTestId('callout-frozen_plan_tier1_routing')).toBeInTheDocument();
  });

  it('TC-PVA-Results-15: flag_only path still renders CalloutStack if breakdown.callouts present', () => {
    const results = {
      ...FLAG_ONLY_RESULTS,
      breakdown: {
        callouts: [{ type: 'multi_employer_flag_only', planName: 'M' }],
      },
    };
    render(<ResultsPanel results={results} flags={{}} />);
    expect(screen.getByTestId('pva-banner-flagonly')).toBeInTheDocument();
    expect(screen.getByTestId('callout-multi_employer_flag_only')).toBeInTheDocument();
  });

  // ─── PR 3 / Phase 3 — show-the-math + educational + disclaimer ─────────
  it('TC-PVA-Results-16: mounts PerStepNarrative when breakdown.perStepNarrative is non-empty', () => {
    const results = {
      ...TIER_1_RESULTS,
      breakdown: {
        callouts: [],
        perStepNarrative: [
          { step: 0, stepId: 'step_cp_resolve_constants', label: 'Resolve constants', computation: '', result: null },
        ],
      },
    };
    render(<ResultsPanel results={results} flags={{}} />);
    expect(screen.getByTestId('per-step-narrative')).toBeInTheDocument();
  });

  it('TC-PVA-Results-17: mounts PvComputationRationale on every compute path', () => {
    const results = { ...TIER_1_RESULTS, breakdown: { callouts: [], perStepNarrative: [] } };
    render(<ResultsPanel results={results} flags={{}} />);
    expect(screen.getByTestId('pv-computation-rationale')).toBeInTheDocument();
  });

  it('TC-PVA-Results-18: mounts CovertureRationale ONLY on tier_3 path', () => {
    const tier3 = { ...TIER_3_RESULTS, breakdown: { callouts: [], perStepNarrative: [] } };
    render(<ResultsPanel results={tier3} flags={{}} />);
    expect(screen.getByTestId('coverture-rationale')).toBeInTheDocument();
  });

  it('TC-PVA-Results-19: does NOT mount CovertureRationale on tier_1', () => {
    const tier1 = { ...TIER_1_RESULTS, breakdown: { callouts: [], perStepNarrative: [] } };
    render(<ResultsPanel results={tier1} flags={{}} />);
    expect(screen.queryByTestId('coverture-rationale')).toBeNull();
  });

  it('TC-PVA-Results-20: does NOT mount CovertureRationale on cash_balance even with coverture', () => {
    const cb = { ...CASH_BALANCE_COVERTURE_RESULTS, breakdown: { callouts: [], perStepNarrative: [] } };
    render(<ResultsPanel results={cb} flags={{}} />);
    // Coverture rationale is gated on path === 'tier_3' (§7.9.3 wording is
    // tier-3 specific; cash balance coverture uses a separate explanation).
    expect(screen.queryByTestId('coverture-rationale')).toBeNull();
  });

  it('TC-PVA-Results-21: mounts TaxTreatmentNote on compute paths', () => {
    const results = { ...TIER_1_RESULTS, breakdown: { callouts: [], perStepNarrative: [] } };
    render(<ResultsPanel results={results} flags={{}} />);
    expect(screen.getByTestId('tax-treatment-note')).toBeInTheDocument();
  });

  it('TC-PVA-Results-22: flag_only path skips show-the-math, rationale, and disclaimer', () => {
    const results = {
      ...FLAG_ONLY_RESULTS,
      breakdown: {
        callouts: [{ type: 'multi_employer_flag_only', planName: 'X' }],
        perStepNarrative: [],
      },
    };
    render(<ResultsPanel results={results} flags={{}} />);
    expect(screen.queryByTestId('per-step-narrative')).toBeNull();
    expect(screen.queryByTestId('pv-computation-rationale')).toBeNull();
    expect(screen.queryByTestId('coverture-rationale')).toBeNull();
    expect(screen.queryByTestId('tax-treatment-note')).toBeNull();
  });

  // ─── Session 22 PR 2 — "Continue to Tax Discount" CTA ────────────────────
  describe('PVA → PIT CTA (Session 22 PR 2)', () => {
    it('TC-PVA-Results-CTA-1: renders for tier_1 (compute path) with link to /modules/m4/tax-discount', () => {
      render(<ResultsPanel results={TIER_1_RESULTS} flags={{}} />);
      const cta = screen.getByTestId('pva-cta-pit');
      expect(cta).toBeInTheDocument();
      const link = within(cta).getByRole('link', { name: /Continue to Tax Discount/ });
      expect(link).toHaveAttribute('href', '/modules/m4/tax-discount');
    });

    it('TC-PVA-Results-CTA-2: renders for tier_3 (coverture compute path)', () => {
      render(<ResultsPanel results={TIER_3_RESULTS} flags={{}} />);
      expect(screen.getByTestId('pva-cta-pit')).toBeInTheDocument();
    });

    it('TC-PVA-Results-CTA-3: does NOT render for flag_only (no PV to tax-adjust)', () => {
      render(<ResultsPanel results={FLAG_ONLY_RESULTS} flags={{}} />);
      expect(screen.queryByTestId('pva-cta-pit')).toBeNull();
    });
  });
});
