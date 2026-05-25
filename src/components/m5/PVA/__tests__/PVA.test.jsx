/**
 * PVA orchestrator tests (§7.10.3 / LL-17).
 *
 * Verifies the orchestrator consumes all three §7.10.3 discriminated-union
 * variants explicitly:
 *   1. null                                → "no claim" surface
 *   2. {error, missingFields, path: null}  → ValidationErrorPanel
 *   3. {path, inputs, ...}                 → InputsPanel + ResultsPanel
 *
 * Also exercises the seedOverride pathway (bypasses m2 read) and verifies
 * the engine call is gated against the error variant.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PVA from '../PVA.jsx';
import { useM2Store } from '@/src/stores/m2Store';
import { useM5Store } from '@/src/stores/m5Store';
import useBlueprintStore from '@/src/stores/blueprintStore';
import { SEED_VARIANTS } from '../__fixtures__/seedVariants.js';

function seedM2(items) {
  useM2Store.setState((state) => ({
    maritalEstateInventory: { ...state.maritalEstateInventory, items },
  }));
}

beforeEach(() => {
  localStorage.clear();
  useM2Store.persist?.rehydrate?.();
  useM5Store.persist?.rehydrate?.();
  useBlueprintStore.persist?.rehydrate?.();
  useBlueprintStore.getState().resetBlueprint();
  seedM2([]);
  useM5Store.setState((state) => ({
    pensionValuation: { ...state.pensionValuation, assets: {} },
  }));
});

describe('PVA orchestrator (§7.10.3 / LL-17)', () => {
  it('TC-PVA-Orchestrator-1: with no asset selected and no seed, renders AssetPicker only', () => {
    seedM2([{ id: 'pen-1', category: 'pensions', planName: 'A', whoseplan: 'Client', accrualStatus: 'accruing' }]);
    render(<PVA />);
    expect(screen.getByTestId('pva-asset-picker')).toBeInTheDocument();
    expect(screen.queryByTestId('pva-no-claim')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pva-validation-error')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pva-inputs-panel')).not.toBeInTheDocument();
  });

  it('TC-PVA-Orchestrator-2 (Variant 3): selecting a normal pension renders InputsPanel + ResultsPanel placeholder', () => {
    seedM2([
      { id: 'pen-1', category: 'pensions', planName: 'A', whoseplan: 'Client', accrualStatus: 'accruing' },
    ]);
    render(<PVA />);
    fireEvent.click(screen.getByTestId('pva-asset-picker-item-pen-1'));

    expect(screen.getByTestId('pva-inputs-panel')).toBeInTheDocument();
    // No m2 fields filled → engine throws → results=null → soft placeholder
    expect(screen.getByTestId('pva-results-placeholder')).toBeInTheDocument();
    expect(screen.queryByTestId('pva-validation-error')).not.toBeInTheDocument();
  });

  it('TC-PVA-Orchestrator-3 (Variant 2): selecting an incomplete in-pay claim renders ValidationErrorPanel', () => {
    seedM2([
      {
        id: 'pen-incomplete',
        category: 'pensions',
        planName: 'Partial',
        whoseplan: 'Client',
        accrualStatus: 'in_pay_status',
        // monthlyBenefit + benefitStartDate intentionally missing — R3 guard fires
      },
    ]);
    render(<PVA />);
    fireEvent.click(screen.getByTestId('pva-asset-picker-item-pen-incomplete'));

    expect(screen.getByTestId('pva-validation-error')).toBeInTheDocument();
    expect(screen.queryByTestId('pva-inputs-panel')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pva-results-panel')).not.toBeInTheDocument();
  });

  it('TC-PVA-Orchestrator-4 (Variant 1): when prePopResult resolves null with selection set, the no-claim message surfaces', async () => {
    seedM2([
      { id: 'pen-other', category: 'pensions', planName: 'Other', whoseplan: 'Client', accrualStatus: 'accruing' },
    ]);
    render(<PVA seedOverride={null} />);
    // Select an existing claim, then mutate m2 out from under it — prePopResult
    // recomputes to null (claim no longer present) and Variant 1 takes over.
    fireEvent.click(screen.getByTestId('pva-asset-picker-item-pen-other'));
    seedM2([]);
    // Async wait — Zustand store update propagates on the next React render tick.
    expect(await screen.findByTestId('pva-no-claim')).toBeInTheDocument();
  });

  it('TC-PVA-Orchestrator-5: seedOverride bypasses m2 and renders the InputsPanel + ResultsPanel for tier_1', () => {
    render(<PVA seedOverride={SEED_VARIANTS.tier1_canonical} />);
    expect(screen.queryByTestId('pva-asset-picker')).not.toBeInTheDocument();
    expect(screen.getByTestId('pva-inputs-panel')).toBeInTheDocument();
    // Real engine call should produce headline PV ≈ $165,783 per fixture pin.
    expect(screen.getByTestId('pva-bignumber-headline')).toBeInTheDocument();
  });

  it('TC-PVA-Orchestrator-6: seedOverride for r3 error renders ValidationErrorPanel + no engine call', () => {
    render(<PVA seedOverride={SEED_VARIANTS.r3_validation_error} />);
    expect(screen.getByTestId('pva-validation-error')).toBeInTheDocument();
    expect(screen.queryByTestId('pva-inputs-panel')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pva-results-panel')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pva-results-placeholder')).not.toBeInTheDocument();
  });

  it('TC-PVA-Orchestrator-7: seedOverride for flag_only_multiemployer renders flag-only banner', () => {
    render(<PVA seedOverride={SEED_VARIANTS.flag_only_multiemployer} />);
    expect(screen.getByTestId('pva-banner-flagonly')).toBeInTheDocument();
    // ReceiptFormDropdown hidden for flag_only
    expect(screen.queryByTestId('pva-input-receiptForm')).not.toBeInTheDocument();
  });

  it('TC-PVA-Orchestrator-8: seedOverride for frozen_routing_banner surfaces frozen banner over Tier 1 numbers', () => {
    render(<PVA seedOverride={SEED_VARIANTS.frozen_routing_banner} />);
    expect(screen.getByTestId('pva-banner-frozen')).toBeInTheDocument();
    expect(screen.getByTestId('pva-bignumber-headline')).toBeInTheDocument();
  });

  // ─── §7.2 v2 — TierOverride visibility driven by derived frozenRoutingApplied ─
  it('TC-PVA-Orchestrator-10: frozen seed hides tier_3 option in TierOverride on first render (no store roundtrip)', () => {
    // §7.2 v2: the orchestrator derives `frozenRoutingApplied` from
    // `inputs.accrualStatus === 'frozen'` and threads it as a prop to
    // InputsPanel → TierOverride. With the pre-pop-seed fallback for the
    // `inputs` value, the very first render already has the correct
    // derived flag — tier_3 never briefly shows for a frozen plan.
    render(<PVA seedOverride={SEED_VARIANTS.frozen_routing_banner} />);
    // PR-D: TierOverride uses WizardRadio (stacked); tier labels were split
    // at the em-dash into `label` + `description` per the primitive's API.
    // Assert each option's presence via the WizardRadio per-option testid.
    // The same words remain on screen ("Tier 1" / "Accrued benefit known" etc.),
    // they're now in two DOM elements per option instead of one em-dash-joined
    // string, which is why the previous /Tier N — …/ regex no longer matches.
    expect(screen.getByTestId('wizard-radio-option-tier_1')).toBeInTheDocument();
    expect(screen.getByTestId('wizard-radio-option-tier_2')).toBeInTheDocument();
    // The Tier 3 option should NOT appear at first render for frozen seed.
    expect(screen.queryByTestId('wizard-radio-option-tier_3')).not.toBeInTheDocument();
  });

  it('TC-PVA-Orchestrator-11: non-frozen seed renders all 3 TierOverride options', () => {
    render(<PVA seedOverride={SEED_VARIANTS.tier3_canonical} />);
    expect(screen.getByTestId('wizard-radio-option-tier_1')).toBeInTheDocument();
    expect(screen.getByTestId('wizard-radio-option-tier_2')).toBeInTheDocument();
    expect(screen.getByTestId('wizard-radio-option-tier_3')).toBeInTheDocument();
  });

  // ─── §7.2 v2 — orchestrator resolvedPath R1–R6 coverage ────────────────
  describe('resolvedPath rules (§7.2 v2)', () => {
    it('TC-PVA-Resolver-R1: flag-only planType routes to flag_only (regardless of accrualStatus)', () => {
      render(
        <PVA
          seedOverride={{
            assetId: 'seed-r1',
            inputs: {
              planName: 'Multi-Employer (R1)',
              whoseplan: 'Client',
              planType: 'gov_civilian',
              accrualStatus: 'frozen', // ignored; R1 wins
            },
          }}
        />,
      );
      expect(screen.getByTestId('pva-banner-flagonly')).toBeInTheDocument();
    });

    it('TC-PVA-Resolver-R2: cash-balance planType routes to cash_balance', () => {
      render(<PVA seedOverride={SEED_VARIANTS.cashbalance_canonical} />);
      // CashBalanceFields subpanel renders the currentAccountBalance field.
      expect(screen.getByTestId('pva-input-currentAccountBalance')).toBeInTheDocument();
    });

    it('TC-PVA-Resolver-R3: accrualStatus=in_pay_status routes to in_pay_status', () => {
      render(<PVA seedOverride={SEED_VARIANTS.inpay_canonical} />);
      // InPayFields subpanel renders the formOfBenefitInPay field.
      expect(screen.getByTestId('pva-input-formOfBenefitInPay')).toBeInTheDocument();
    });

    it('TC-PVA-Resolver-R4: accrualStatus=frozen routes to tier_1 (tierBase)', () => {
      render(<PVA seedOverride={SEED_VARIANTS.frozen_routing_banner} />);
      expect(screen.getByTestId('pva-banner-frozen')).toBeInTheDocument();
      expect(screen.getByTestId('pva-bignumber-headline')).toBeInTheDocument();
      // Tier 3 marital/coverture BigNumber should NOT render.
      expect(screen.queryByTestId('pva-bignumber-marital')).not.toBeInTheDocument();
    });

    it('TC-PVA-Resolver-R5: accrualStatus=accruing routes to tier_3 default (no override)', () => {
      render(<PVA seedOverride={SEED_VARIANTS.tier3_canonical} />);
      // Tier 3 marital BigNumber renders for a coverture path.
      expect(screen.getByTestId('pva-bignumber-marital')).toBeInTheDocument();
    });

    it('TC-PVA-Resolver-R6: tierOverride within validSet wins (accruing + tier_1 override → tier_1)', () => {
      render(<PVA seedOverride={SEED_VARIANTS.tier1_canonical} />);
      // tier1_canonical has accrualStatus:'accruing' + tierOverride:'tier_1'.
      // R5 base would be tier_3; R6 swaps to tier_1.
      expect(screen.getByTestId('pva-bignumber-headline')).toBeInTheDocument();
      expect(screen.queryByTestId('pva-bignumber-marital')).not.toBeInTheDocument();
      // Frozen banner must NOT render — this is non-frozen tier_1.
      expect(screen.queryByTestId('pva-banner-frozen')).not.toBeInTheDocument();
    });

    it('TC-PVA-Resolver-R6-clamp: stale tier_3 override on frozen plan is ignored; path stays tier_1', () => {
      // Frozen base + tierOverride='tier_3' → tier_3 ∉ validSet({tier_1,tier_2})
      // → return tierBase (tier_1). Verifies the validSet clamp.
      render(
        <PVA
          seedOverride={{
            assetId: 'seed-r6-clamp',
            inputs: {
              ...SEED_VARIANTS.frozen_routing_banner.inputs,
              tierOverride: 'tier_3', // stale override; must be clamped
            },
          }}
        />,
      );
      expect(screen.getByTestId('pva-banner-frozen')).toBeInTheDocument();
      expect(screen.getByTestId('pva-bignumber-headline')).toBeInTheDocument();
      expect(screen.queryByTestId('pva-bignumber-marital')).not.toBeInTheDocument();
    });

    it('TC-PVA-Resolver-FrozenDerived: non-frozen accruing+tier_1 override does NOT surface the frozen banner', () => {
      // Validates that frozenRoutingApplied is derived from
      // inputs.accrualStatus alone — not from the resolved path being tier_1.
      render(<PVA seedOverride={SEED_VARIANTS.tier1_canonical} />);
      expect(screen.queryByTestId('pva-banner-frozen')).not.toBeInTheDocument();
    });
  });

  // ─── PR 3 / Phase 2 — new callout-surfacing seeds end-to-end ──────────
  it('TC-PVA-Orchestrator-12: vesting_partial seed surfaces vesting_status_callout via CalloutStack', () => {
    render(<PVA seedOverride={SEED_VARIANTS.vesting_partial} />);
    expect(screen.getByTestId('callout-vesting_status_callout')).toBeInTheDocument();
  });

  it('TC-PVA-Orchestrator-13: lump_sum_divergent seed surfaces lump_sum_offer_divergence via CalloutStack', () => {
    render(<PVA seedOverride={SEED_VARIANTS.lump_sum_divergent} />);
    expect(screen.getByTestId('callout-lump_sum_offer_divergence')).toBeInTheDocument();
  });

  it('TC-PVA-Orchestrator-14: coverture_zero_combo seed surfaces precedence-sorted multi-callout stack', () => {
    render(<PVA seedOverride={SEED_VARIANTS.coverture_zero_combo} />);
    // Expect at minimum: coverture_zero_fraction (5), vesting_status_callout (6),
    // form_of_benefit_callout (7), qpsa (8), qdro_handoff (11), liability (12).
    expect(screen.getByTestId('callout-coverture_zero_fraction')).toBeInTheDocument();
    expect(screen.getByTestId('callout-vesting_status_callout')).toBeInTheDocument();
    expect(screen.getByTestId('callout-form_of_benefit_callout')).toBeInTheDocument();
    expect(screen.getByTestId('callout-liability_disclaimer')).toBeInTheDocument();
  });

  // ─── Session 22 PR 2 — PVA → Blueprint §6 write trigger ────────────────
  describe('PVA → Blueprint §6 write (Session 22 PR 2)', () => {
    it('TC-PVA-Blueprint-1: tier_1 result triggers updatePensionValuation with headlinePV (no marital narrowing)', () => {
      render(<PVA seedOverride={SEED_VARIANTS.tier1_canonical} />);
      const s6 = useBlueprintStore.getState().sections.s6;
      expect(s6.data.pva).not.toBeNull();
      expect(s6.data.pva.path).toBe('tier_1');
      expect(typeof s6.data.pva.headlinePV).toBe('number');
      expect(s6.data.pva.headlinePV).toBeGreaterThan(0);
      // Tier 1 has no coverture → maritalPV null per [R5b-16].
      expect(s6.data.pva.maritalPV).toBeNull();
      expect(s6.sourceModule).toBe('m5');
    });

    it('TC-PVA-Blueprint-2: tier_3 result includes both headlinePV + maritalPV + coverturePercent', () => {
      render(<PVA seedOverride={SEED_VARIANTS.tier3_canonical} />);
      const s6 = useBlueprintStore.getState().sections.s6;
      expect(s6.data.pva).not.toBeNull();
      expect(s6.data.pva.path).toBe('tier_3');
      expect(typeof s6.data.pva.headlinePV).toBe('number');
      expect(typeof s6.data.pva.maritalPV).toBe('number');
      expect(s6.data.pva.maritalPV).toBeGreaterThan(0);
      expect(s6.data.pva.maritalPV).toBeLessThanOrEqual(s6.data.pva.headlinePV);
      expect(typeof s6.data.pva.coverturePercent).toBe('number');
      expect(s6.data.pva.coverturePercent).toBeGreaterThan(0);
      expect(s6.data.pva.coverturePercent).toBeLessThanOrEqual(1);
    });

    it('TC-PVA-Blueprint-3: flag_only result writes minimal slot (path only, no PV)', () => {
      render(<PVA seedOverride={SEED_VARIANTS.flag_only_multiemployer} />);
      const s6 = useBlueprintStore.getState().sections.s6;
      expect(s6.data.pva).toEqual({
        path: 'flag_only',
        headlinePV: null,
        maritalPV: null,
      });
      expect(s6.sourceModule).toBe('m5');
    });

    it('TC-PVA-Blueprint-4: validation-error variant does NOT write to §6 (no result computed)', () => {
      render(<PVA seedOverride={SEED_VARIANTS.r3_validation_error} />);
      const s6 = useBlueprintStore.getState().sections.s6;
      expect(s6.data.pva).toBeNull();
      expect(s6.sourceModule).toBeNull();
    });

    it('TC-PVA-Blueprint-5: PVA write coexists with prior PIT write — sourceModule becomes m4+m5', () => {
      // Pre-seed §6 with PIT data (simulates user having completed PIT first).
      useBlueprintStore.getState().updateRetirementDivision({
        planBalance: 200000,
        planType: '401k',
        taxDiscountPercent: 0.18,
        taxDiscountDollars: 36000,
        taxAdjustedValue: 164000,
        traditionalDiscountDollars: 50000,
        overage: 14000,
        n: 18,
        effectiveTaxRate: 0.25,
        discountRate: 0.05,
      });

      render(<PVA seedOverride={SEED_VARIANTS.tier3_canonical} />);
      const s6 = useBlueprintStore.getState().sections.s6;
      expect(s6.data.pit).not.toBeNull();
      expect(s6.data.pit.planBalance).toBe(200000);
      expect(s6.data.pva).not.toBeNull();
      expect(s6.data.pva.path).toBe('tier_3');
      expect(s6.sourceModule).toBe('m4+m5');
    });
  });
});
