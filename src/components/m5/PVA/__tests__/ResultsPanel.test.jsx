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
 *   - 3 structural banners: frozen, legacy, flag-only
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
    expect(screen.queryByTestId('pva-banner-legacy')).not.toBeInTheDocument();
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

  it('TC-PVA-Results-10: legacy banner surfaces when flags._legacyCurrentValueDetected=true (with _legacyValue)', () => {
    render(
      <ResultsPanel
        results={TIER_3_RESULTS}
        flags={{ _legacyCurrentValueDetected: true, _legacyValue: 300000 }}
      />,
    );
    expect(screen.getByTestId('pva-banner-legacy')).toBeInTheDocument();
    expect(screen.getByText(/\$300,000/)).toBeInTheDocument();
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

});
