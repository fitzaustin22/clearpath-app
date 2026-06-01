/**
 * S6RetirementDivision render tests — multi-source §6 fix
 * (S6-Renderer-PVA-QDRO-Not-Rendered).
 *
 * s6.data is { pit, pva, qdro }. Before this fix the renderer had an
 * `if (!pit) return null` guard and a body that read only `pit.*`, so any §6
 * carrying `pva`/`qdro` but no `pit` rendered a blank body under a non-empty
 * heading (the "blank-but-complete" bug — most visibly the PVA flag_only path).
 *
 * The component is a pure props-in renderer: it receives `data` (= s6.data) and
 * `status` directly from BlueprintView, so these tests render it in isolation
 * with no store. Slot rendering is presence-based (NOT gated on `status`);
 * `status` only decides the all-empty fallback (in-progress line vs nothing).
 *
 * Leaf shapes confirmed against the writers (recon, HEAD a441d13):
 *   pit  — updateRetirementDivision payload (blueprintStore.js)
 *   pva  — updatePensionValuation payload (PVA.jsx); headlinePV/maritalPV are
 *          number|null (pvHelpers.js), coverturePercent a fraction 0–1,
 *          citations a string[] (CITATIONS_BY_PATH); flag_only ⇒ PVs null.
 *   qdro — selectQDRODivisionData output wrapped as { assets, status,
 *          lastUpdated }; per asset { userRole, planType, decisions, pvSource
 *          (scalar string|null), completionState ('empty'|'partial'|'complete'),
 *          metadata: { formulaId, citations: string[], qdroPacketGeneratedAt } }.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import S6RetirementDivision from '../S6RetirementDivision.jsx';

const PIT = {
  planBalance: 200000,
  planType: '401k',
  taxDiscountPercent: 0.22,
  taxDiscountDollars: 44000,
  taxAdjustedValue: 156000,
  traditionalDiscountDollars: 50000,
  overage: 6000,
  n: 10,
  effectiveTaxRate: 0.25,
  discountRate: 0.05,
};

// Coverture (tier_3) valued PVA: maritalPV present, coverturePercent a fraction.
const PVA_VALUED = {
  path: 'tier_3',
  headlinePV: 300000,
  maritalPV: 180000,
  expectedRetirementAge: 65,
  coverturePercent: 0.6,
  citations: ['IRC §417(e)(3)', 'Bender v. Bender, 297 A.2d 786 (DC 1972)'],
};

// flag_only: pension flagged but not valued — both PVs null. Must NOT print $0.
const PVA_FLAG_ONLY = { path: 'flag_only', headlinePV: null, maritalPV: null };

const QDRO_PARTIAL = {
  assets: {
    a1: {
      userRole: 'participant',
      planType: 'dc',
      decisions: { allocationType: 'percentage' },
      pvSource: null,
      completionState: 'partial',
      metadata: { formulaId: 'qdro-dc-v1', citations: ['IRC §414(p)'], qdroPacketGeneratedAt: null },
    },
  },
  status: 'partial',
  lastUpdated: '2026-06-01T00:00:00.000Z',
};

const QDRO_COMPLETE = {
  assets: {
    a1: {
      userRole: 'alternatePayee',
      planType: 'private_db',
      decisions: { interestStructure: 'shared' },
      pvSource: 'pva_asset_k1', // PVA linkage → surfaces as 'Pension Valuation Analyzer', never the raw token
      completionState: 'complete',
      metadata: { formulaId: null, citations: [], qdroPacketGeneratedAt: null },
    },
    a2: {
      userRole: 'participant',
      planType: 'ira',
      decisions: {},
      pvSource: null,
      completionState: 'complete',
      metadata: { formulaId: null, citations: [], qdroPacketGeneratedAt: null },
    },
  },
  status: 'complete',
  lastUpdated: '2026-06-01T00:00:00.000Z',
};

const QDRO_EMPTY = { assets: {}, status: 'empty', lastUpdated: '2026-06-01T00:00:00.000Z' };

// pvSource present but NOT a PVA linkage (legacy/unknown scalar). The renderer
// must omit the PV Source row entirely and NEVER surface the raw token.
const QDRO_NON_PVA_SOURCE = {
  assets: {
    a1: {
      userRole: 'participant',
      planType: 'dc',
      decisions: {},
      pvSource: 'legacy_sentinel',
      completionState: 'complete',
      metadata: { formulaId: null, citations: [], qdroPacketGeneratedAt: null },
    },
  },
  status: 'complete',
  lastUpdated: '2026-06-01T00:00:00.000Z',
};

describe('S6RetirementDivision — PIT slot (regression guard)', () => {
  it('renders the PIT block and no PVA/QDRO blocks when only pit is present', () => {
    render(<S6RetirementDivision data={{ pit: PIT, pva: null, qdro: null }} status="complete" />);
    expect(screen.getByText('PLAN BALANCE AT DIVISION')).toBeInTheDocument();
    expect(screen.getByText('$200,000')).toBeInTheDocument();
    expect(screen.getByText('$156,000')).toBeInTheDocument(); // tax-adjusted value
    expect(screen.queryByText('Pension Present Value')).toBeNull();
    expect(screen.queryByText(/modeled in the QDRO tool/)).toBeNull();
  });
});

describe('S6RetirementDivision — PVA slot', () => {
  it('renders pension present value, coverture share, retirement age, and citations when pva is valued (no pit)', () => {
    render(<S6RetirementDivision data={{ pit: null, pva: PVA_VALUED, qdro: null }} status="complete" />);
    expect(screen.getByText('Pension Present Value')).toBeInTheDocument();
    expect(screen.getByText('$180,000')).toBeInTheDocument(); // marital portion
    expect(screen.getByText('$300,000')).toBeInTheDocument(); // total
    expect(screen.getByText(/60\.0%/)).toBeInTheDocument(); // coverture fraction 0.6 -> 60.0%
    expect(screen.getByText('Expected Retirement Age')).toBeInTheDocument();
    expect(screen.getByText('65')).toBeInTheDocument();
    expect(screen.getByText(/IRC §417\(e\)\(3\)/)).toBeInTheDocument(); // citation via shared helper
    // PIT-only assumption must not leak in:
    expect(screen.queryByText('PLAN BALANCE AT DIVISION')).toBeNull();
  });

  it('flag_only: renders a non-empty body with the flag message and NEVER prints $0', () => {
    const { container } = render(
      <S6RetirementDivision data={{ pit: null, pva: PVA_FLAG_ONLY, qdro: null }} status="complete" />,
    );
    expect(container).not.toBeEmptyDOMElement();
    expect(
      screen.getByText(/Pension flagged for valuation; present value not yet calculated\./),
    ).toBeInTheDocument();
    // The whole point of the fix: null PVs are not rendered as $0.
    expect(container.textContent).not.toContain('$0');
  });
});

describe('S6RetirementDivision — QDRO slot', () => {
  it('renders the QDRO block for a single partial asset (no pit/pva)', () => {
    render(<S6RetirementDivision data={{ pit: null, pva: null, qdro: QDRO_PARTIAL }} status="partial" />);
    expect(screen.getByText(/1 plan modeled in the QDRO tool\./)).toBeInTheDocument();
    expect(screen.getByText('Defined contribution')).toBeInTheDocument(); // planType 'dc' humanized, never raw id
    expect(screen.getByText('Participant')).toBeInTheDocument(); // userRole
    expect(screen.getByText('In progress')).toBeInTheDocument(); // completionState 'partial' humanized
    expect(screen.getByText('qdro-dc-v1')).toBeInTheDocument(); // metadata.formulaId provenance
    expect(screen.getByText(/IRC §414\(p\)/)).toBeInTheDocument(); // per-asset citation via shared helper
    // raw asset id must never surface
    expect(screen.queryByText('a1')).toBeNull();
  });

  it('renders a PVA-linked pvSource as "Pension Valuation Analyzer" and never the raw token', () => {
    render(<S6RetirementDivision data={{ pit: null, pva: null, qdro: QDRO_COMPLETE }} status="complete" />);
    expect(screen.getByText(/2 plans modeled in the QDRO tool\./)).toBeInTheDocument();
    expect(screen.getByText('Private defined benefit')).toBeInTheDocument();
    expect(screen.getByText('IRA')).toBeInTheDocument();
    expect(screen.getByText('Alternate payee')).toBeInTheDocument();
    // a1.pvSource = 'pva_asset_k1' (PVA linkage) surfaces as a friendly source name,
    // never the internal token; a2.pvSource = null contributes no PV Source row.
    expect(screen.getAllByText('PV Source')).toHaveLength(1);
    expect(screen.getByText('Pension Valuation Analyzer')).toBeInTheDocument();
    expect(screen.queryByText('pva_asset_k1')).toBeNull();
  });

  it('omits the PV Source row for a non-PVA pvSource and never renders the raw token', () => {
    render(
      <S6RetirementDivision data={{ pit: null, pva: null, qdro: QDRO_NON_PVA_SOURCE }} status="complete" />,
    );
    expect(screen.queryByText('PV Source')).toBeNull();
    expect(screen.queryByText('legacy_sentinel')).toBeNull();
    expect(screen.queryByText('Pension Valuation Analyzer')).toBeNull();
  });

  it('renders no QDRO block and does not crash when assets map is empty', () => {
    const { container } = render(
      <S6RetirementDivision data={{ pit: null, pva: null, qdro: QDRO_EMPTY }} status="empty" />,
    );
    expect(screen.queryByText(/modeled in the QDRO tool/)).toBeNull();
    expect(container).toBeEmptyDOMElement();
  });
});

describe('S6RetirementDivision — §6 pagination contract (sub-block break-avoid hooks)', () => {
  it('wraps each present sub-block (PIT, PVA, QDRO) in a .blueprint-s6-block container', () => {
    render(
      <S6RetirementDivision data={{ pit: PIT, pva: PVA_VALUED, qdro: QDRO_PARTIAL }} status="complete" />,
    );
    // Each sub-heading sits inside a hooked container so the premium export
    // (body.exporting-blueprint) can break BETWEEN sub-blocks and never orphan a
    // sub-heading the way the un-hooked §6 did ("QDRO Decisions" orphan, p7→p8).
    expect(screen.getByText('PLAN BALANCE AT DIVISION').closest('.blueprint-s6-block')).not.toBeNull();
    expect(screen.getByText('Pension Present Value').closest('.blueprint-s6-block')).not.toBeNull();
    expect(screen.getByText('QDRO Decisions').closest('.blueprint-s6-block')).not.toBeNull();
  });

  it('hooks the PVA sub-block (sub-heading + content) when it is the only slot present', () => {
    const { container } = render(
      <S6RetirementDivision data={{ pit: null, pva: PVA_VALUED, qdro: null }} status="complete" />,
    );
    const block = screen.getByText('Pension Present Value').closest('.blueprint-s6-block');
    expect(block).not.toBeNull();
    expect(block.textContent).toContain('Pension Present Value');
    expect(container.querySelectorAll('.blueprint-s6-block').length).toBeGreaterThanOrEqual(1);
  });
});

describe('S6RetirementDivision — combined + fallback', () => {
  it('renders all three slots together when pit, pva, and qdro are all present', () => {
    render(
      <S6RetirementDivision
        data={{ pit: PIT, pva: PVA_VALUED, qdro: QDRO_PARTIAL }}
        status="complete"
      />,
    );
    expect(screen.getByText('PLAN BALANCE AT DIVISION')).toBeInTheDocument(); // PIT
    expect(screen.getByText('Pension Present Value')).toBeInTheDocument(); // PVA
    expect(screen.getByText(/modeled in the QDRO tool/)).toBeInTheDocument(); // QDRO
  });

  it('renders the in-progress line when status is non-empty but all slots are absent', () => {
    render(<S6RetirementDivision data={{ pit: null, pva: null, qdro: null }} status="partial" />);
    expect(screen.getByText('Retirement division is in progress.')).toBeInTheDocument();
  });

  it('renders nothing when data is null', () => {
    const { container } = render(<S6RetirementDivision data={null} status="empty" />);
    expect(container).toBeEmptyDOMElement();
  });
});
