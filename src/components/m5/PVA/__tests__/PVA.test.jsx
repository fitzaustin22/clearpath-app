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

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PVA from '../PVA.jsx';
import { useM2Store } from '@/src/stores/m2Store';
import { useM5Store } from '@/src/stores/m5Store';
import useBlueprintStore from '@/src/stores/blueprintStore';
import { calculatePensionValue } from '@/src/lib/pensionValuation';
import { SEED_VARIANTS } from '../__fixtures__/seedVariants.js';

function seedM2(items) {
  useM2Store.setState((state) => ({
    maritalEstateInventory: { ...state.maritalEstateInventory, items },
  }));
}

// Failure-A gating (§7.10.4): compute/persist no longer happen reactively on
// mount — the user must click "Calculate present value" in InputsPanel. Tests
// that assert a rendered result (BigNumber, banner, callout, Blueprint §6
// write) now click through first.
function clickCalculate() {
  fireEvent.click(screen.getByRole('button', { name: /calculate present value/i }));
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

afterEach(() => {
  // Scroll-to-result tests stub this on Element.prototype; don't leak it.
  delete Element.prototype.scrollIntoView;
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
    clickCalculate();
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
    clickCalculate();
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
      clickCalculate();
      expect(screen.getByTestId('pva-banner-frozen')).toBeInTheDocument();
      expect(screen.getByTestId('pva-bignumber-headline')).toBeInTheDocument();
      // Tier 3 marital/coverture BigNumber should NOT render.
      expect(screen.queryByTestId('pva-bignumber-marital')).not.toBeInTheDocument();
    });

    it('TC-PVA-Resolver-R5: accrualStatus=accruing routes to tier_3 default (no override)', () => {
      render(<PVA seedOverride={SEED_VARIANTS.tier3_canonical} />);
      clickCalculate();
      // Tier 3 marital BigNumber renders for a coverture path.
      expect(screen.getByTestId('pva-bignumber-marital')).toBeInTheDocument();
    });

    it('TC-PVA-Resolver-R6: tierOverride within validSet wins (accruing + tier_1 override → tier_1)', () => {
      render(<PVA seedOverride={SEED_VARIANTS.tier1_canonical} />);
      clickCalculate();
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
      clickCalculate();
      expect(screen.getByTestId('pva-banner-frozen')).toBeInTheDocument();
      expect(screen.getByTestId('pva-bignumber-headline')).toBeInTheDocument();
      expect(screen.queryByTestId('pva-bignumber-marital')).not.toBeInTheDocument();
    });

    it('TC-PVA-Resolver-FrozenDerived: non-frozen accruing+tier_1 override does NOT surface the frozen banner', () => {
      // Validates that frozenRoutingApplied is derived from
      // inputs.accrualStatus alone — not from the resolved path being tier_1.
      // Click through so this exercises the same post-calculate state as its
      // sibling assertions (Failure-A gating), not just the pre-calculate
      // placeholder where the banner is trivially absent either way.
      render(<PVA seedOverride={SEED_VARIANTS.tier1_canonical} />);
      clickCalculate();
      expect(screen.queryByTestId('pva-banner-frozen')).not.toBeInTheDocument();
    });
  });

  // ─── PR 3 / Phase 2 — new callout-surfacing seeds end-to-end ──────────
  it('TC-PVA-Orchestrator-12: vesting_partial seed surfaces vesting_status_callout via CalloutStack', () => {
    render(<PVA seedOverride={SEED_VARIANTS.vesting_partial} />);
    clickCalculate();
    expect(screen.getByTestId('callout-vesting_status_callout')).toBeInTheDocument();
  });

  it('TC-PVA-Orchestrator-13: lump_sum_divergent seed surfaces lump_sum_offer_divergence via CalloutStack', () => {
    render(<PVA seedOverride={SEED_VARIANTS.lump_sum_divergent} />);
    clickCalculate();
    expect(screen.getByTestId('callout-lump_sum_offer_divergence')).toBeInTheDocument();
  });

  it('TC-PVA-Orchestrator-14: coverture_zero_combo seed surfaces precedence-sorted multi-callout stack', () => {
    render(<PVA seedOverride={SEED_VARIANTS.coverture_zero_combo} />);
    clickCalculate();
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
      clickCalculate();
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
      clickCalculate();
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
      clickCalculate();
      const s6 = useBlueprintStore.getState().sections.s6;
      expect(s6.data.pit).not.toBeNull();
      expect(s6.data.pit.planBalance).toBe(200000);
      expect(s6.data.pva).not.toBeNull();
      expect(s6.data.pva.path).toBe('tier_3');
      expect(s6.sourceModule).toBe('m4+m5');
    });
  });

  // ─── Failure A — compute/persist gated behind explicit Calculate click ────
  // A financial estimate must never be silently computed and saved before the
  // user has reviewed it. `results` still computes reactively (cheap/pure),
  // but it is neither displayed, written to m5Store, nor synced to Blueprint
  // §6 until the user clicks "Calculate present value" in InputsPanel — with
  // one exception: flag_only has no PV to compute at all (it's a routing
  // banner recording "specialist required"), so it stays reactive/immediate.
  describe('Compute/persist gating (§7.10.4 — no result without explicit Calculate)', () => {
    it('TC-PVA-Gate-1: fresh seed shows the placeholder — NOT a bignumber — before Calculate is clicked, even though inputs are complete', () => {
      render(<PVA seedOverride={SEED_VARIANTS.tier1_canonical} />);
      expect(screen.getByTestId('pva-results-placeholder')).toBeInTheDocument();
      expect(screen.queryByTestId('pva-bignumber-headline')).not.toBeInTheDocument();
    });

    it('TC-PVA-Gate-2: fresh seed does NOT persist results to m5Store before Calculate is clicked', () => {
      render(<PVA seedOverride={SEED_VARIANTS.tier1_canonical} />);
      const stored = useM5Store.getState().pensionValuation.assets[SEED_VARIANTS.tier1_canonical.assetId];
      expect(stored?.results).toBeUndefined();
    });

    it('TC-PVA-Gate-3: fresh seed does NOT sync to Blueprint §6 before Calculate is clicked', () => {
      render(<PVA seedOverride={SEED_VARIANTS.tier1_canonical} />);
      expect(useBlueprintStore.getState().sections.s6.data.pva).toBeNull();
    });

    it('TC-PVA-Gate-4: clicking Calculate reveals the bignumber, persists to m5Store, and syncs to Blueprint §6', () => {
      render(<PVA seedOverride={SEED_VARIANTS.tier1_canonical} />);
      clickCalculate();
      expect(screen.getByTestId('pva-bignumber-headline')).toBeInTheDocument();
      const stored = useM5Store.getState().pensionValuation.assets[SEED_VARIANTS.tier1_canonical.assetId];
      expect(stored?.results).not.toBeNull();
      expect(useBlueprintStore.getState().sections.s6.data.pva).not.toBeNull();
    });

    it('TC-PVA-Gate-5: flag_only is unaffected by gating — banner shows immediately, no click required', () => {
      render(<PVA seedOverride={SEED_VARIANTS.flag_only_multiemployer} />);
      expect(screen.getByTestId('pva-banner-flagonly')).toBeInTheDocument();
      expect(useBlueprintStore.getState().sections.s6.data.pva).toEqual({
        path: 'flag_only',
        headlinePV: null,
        maritalPV: null,
      });
    });

    it('TC-PVA-Gate-6: editing an input after Calculate immediately invalidates the display, clears the persisted m5Store result, and clears Blueprint §6', () => {
      render(<PVA seedOverride={SEED_VARIANTS.tier1_canonical} />);
      clickCalculate();
      expect(screen.getByTestId('pva-bignumber-headline')).toBeInTheDocument();

      const nraInput = screen.getByTestId('pva-input-planNRA').querySelector('input');
      fireEvent.change(nraInput, { target: { value: '66' } });

      expect(screen.queryByTestId('pva-bignumber-headline')).not.toBeInTheDocument();
      expect(screen.getByTestId('pva-results-placeholder')).toBeInTheDocument();
      const stored = useM5Store.getState().pensionValuation.assets[SEED_VARIANTS.tier1_canonical.assetId];
      expect(stored?.results).toBeNull();
      expect(useBlueprintStore.getState().sections.s6.data.pva).toBeNull();
    });

    it('TC-PVA-Gate-7: a pension already calculated in a PRIOR session (persisted m5Store results present at mount) shows its result immediately — no re-click needed', () => {
      const assetId = SEED_VARIANTS.tier1_canonical.assetId;
      // Seed inputs as they'd genuinely look for an already-calculated pension
      // — receiptForm included. In real usage ReceiptFormDropdown's own
      // default-commit effect fires the moment InputsPanel first mounts,
      // long before Calculate can be clicked, so a truly-prior-session asset
      // never has it unset; a bare fixture (missing receiptForm) would still
      // trigger that default-commit on THIS mount, which is a real edit and
      // would correctly (if confusingly, for a test) invalidate the seed.
      const priorInputs = { ...SEED_VARIANTS.tier1_canonical.inputs, receiptForm: 'monthly_db_stream' };
      useM5Store.getState().setPVAAssetInputs(assetId, priorInputs);
      const priorResults = calculatePensionValue({ ...priorInputs, path: 'tier_1' });
      useM5Store.getState().setPVAAssetResults(assetId, priorResults);

      render(<PVA seedOverride={SEED_VARIANTS.tier1_canonical} />);
      expect(screen.getByTestId('pva-bignumber-headline')).toBeInTheDocument();
      expect(screen.queryByTestId('pva-results-placeholder')).not.toBeInTheDocument();
    });

    it('TC-PVA-Gate-8: switching to a different (never-calculated) pension and back to a calculated one — the calculated one still shows its result, the never-touched one shows the placeholder', () => {
      seedM2([
        // 'frozen' routes to tier_1 (Tier1And2Fields) regardless of tierOverride,
        // avoiding the coverture-specific fields tier_3's default would require.
        { id: 'pen-calc', category: 'pensions', planName: 'Calculated', whoseplan: 'Client', accrualStatus: 'frozen' },
        { id: 'pen-fresh', category: 'pensions', planName: 'Fresh', whoseplan: 'Client', accrualStatus: 'frozen' },
      ]);
      render(<PVA />);

      fireEvent.click(screen.getByTestId('pva-asset-picker-item-pen-calc'));
      const nraInput = screen.getByTestId('pva-input-planNRA').querySelector('input');
      fireEvent.change(nraInput, { target: { value: '65' } });
      const accruedInput = screen
        .getByTestId('pva-input-accruedMonthlyBenefitAtNRA')
        .querySelector('input');
      fireEvent.change(accruedInput, { target: { value: '3000' } });
      const dobInput = screen.getByTestId('pva-input-participantDOB');
      fireEvent.change(dobInput, { target: { value: '1980-01-01' } });
      clickCalculate();
      expect(screen.getByTestId('pva-bignumber-headline')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('pva-asset-picker-item-pen-fresh'));
      expect(screen.getByTestId('pva-results-placeholder')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('pva-asset-picker-item-pen-calc'));
      expect(screen.getByTestId('pva-bignumber-headline')).toBeInTheDocument();
    });

    // ─── "valued" tag must track GENUINE validity, not mere presence ────────
    // Same bug class as Failure B's false-$0: `setPVAAssetResults` must not
    // persist a result whose headline PV is non-finite/exactly-zero (a blank
    // required numeric), or the pension-picker's "(valued)" tag — which only
    // checks `assets[id].results != null` — lights up on a broken calculation
    // even though ResultsPanel correctly shows the placeholder.
    it('TC-PVA-Gate-9: clicking Calculate with a blank required numeric does NOT set the "valued" tag in the picker', () => {
      seedM2([
        { id: 'pen-broken', category: 'pensions', planName: 'Broken', whoseplan: 'Client', accrualStatus: 'frozen' },
      ]);
      render(<PVA />);
      fireEvent.click(screen.getByTestId('pva-asset-picker-item-pen-broken'));

      fireEvent.change(screen.getByTestId('pva-input-planNRA').querySelector('input'), {
        target: { value: '65' },
      });
      fireEvent.change(screen.getByTestId('pva-input-participantDOB'), {
        target: { value: '1980-01-01' },
      });
      fireEvent.change(screen.getByTestId('pva-input-caseEffectiveDate'), {
        target: { value: '2026-05-01' },
      });
      // accruedMonthlyBenefitAtNRA intentionally left blank — the reported bug.
      clickCalculate();

      expect(screen.getByTestId('pva-results-placeholder')).toBeInTheDocument();
      expect(
        screen.queryByTestId('pva-asset-picker-item-pen-broken-valued'),
      ).not.toBeInTheDocument();
      expect(
        useM5Store.getState().pensionValuation.assets['pen-broken']?.results,
      ).toBeUndefined();
    });

    it('TC-PVA-Gate-10: clicking Calculate with all required fields filled DOES set the "valued" tag (guards against overcorrecting)', () => {
      seedM2([
        { id: 'pen-good', category: 'pensions', planName: 'Good', whoseplan: 'Client', accrualStatus: 'frozen' },
      ]);
      render(<PVA />);
      fireEvent.click(screen.getByTestId('pva-asset-picker-item-pen-good'));

      fireEvent.change(screen.getByTestId('pva-input-planNRA').querySelector('input'), {
        target: { value: '65' },
      });
      fireEvent.change(
        screen.getByTestId('pva-input-accruedMonthlyBenefitAtNRA').querySelector('input'),
        { target: { value: '3000' } },
      );
      fireEvent.change(screen.getByTestId('pva-input-participantDOB'), {
        target: { value: '1980-01-01' },
      });
      fireEvent.change(screen.getByTestId('pva-input-caseEffectiveDate'), {
        target: { value: '2026-05-01' },
      });
      clickCalculate();

      expect(screen.getByTestId('pva-bignumber-headline')).toBeInTheDocument();
      expect(
        screen.getByTestId('pva-asset-picker-item-pen-good-valued'),
      ).toBeInTheDocument();
    });
  });

  // ─── Scroll-to-result on Calculate ───────────────────────────────────────
  // jsdom has no real scrollIntoView implementation, so it's stubbed per-test
  // to assert the call happened — not to verify actual scroll positioning.
  describe('Scroll-to-result on Calculate', () => {
    it('TC-PVA-Scroll-1: a genuine Calculate click scrolls the results section into view', () => {
      const scrollIntoView = vi.fn();
      Element.prototype.scrollIntoView = scrollIntoView;
      render(<PVA seedOverride={SEED_VARIANTS.tier1_canonical} />);
      clickCalculate();
      expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    });

    it('TC-PVA-Scroll-2: a blank-required-field Calculate (placeholder shown, no genuine result) does NOT scroll', () => {
      const scrollIntoView = vi.fn();
      Element.prototype.scrollIntoView = scrollIntoView;
      seedM2([
        { id: 'pen-broken-scroll', category: 'pensions', planName: 'Broken', whoseplan: 'Client', accrualStatus: 'frozen' },
      ]);
      render(<PVA />);
      fireEvent.click(screen.getByTestId('pva-asset-picker-item-pen-broken-scroll'));
      fireEvent.change(screen.getByTestId('pva-input-planNRA').querySelector('input'), {
        target: { value: '65' },
      });
      fireEvent.change(screen.getByTestId('pva-input-participantDOB'), {
        target: { value: '1980-01-01' },
      });
      fireEvent.change(screen.getByTestId('pva-input-caseEffectiveDate'), {
        target: { value: '2026-05-01' },
      });
      // accruedMonthlyBenefitAtNRA left blank.
      clickCalculate();

      expect(screen.getByTestId('pva-results-placeholder')).toBeInTheDocument();
      expect(scrollIntoView).not.toHaveBeenCalled();
    });

    it('TC-PVA-Scroll-3: reselecting an already-calculated pension from the list does NOT scroll (no click, no jump)', () => {
      const scrollIntoView = vi.fn();
      Element.prototype.scrollIntoView = scrollIntoView;
      seedM2([
        { id: 'pen-calc-scroll', category: 'pensions', planName: 'Calculated', whoseplan: 'Client', accrualStatus: 'frozen' },
        { id: 'pen-fresh-scroll', category: 'pensions', planName: 'Fresh', whoseplan: 'Client', accrualStatus: 'frozen' },
      ]);
      render(<PVA />);

      fireEvent.click(screen.getByTestId('pva-asset-picker-item-pen-calc-scroll'));
      fireEvent.change(screen.getByTestId('pva-input-planNRA').querySelector('input'), {
        target: { value: '65' },
      });
      fireEvent.change(
        screen.getByTestId('pva-input-accruedMonthlyBenefitAtNRA').querySelector('input'),
        { target: { value: '3000' } },
      );
      fireEvent.change(screen.getByTestId('pva-input-participantDOB'), {
        target: { value: '1980-01-01' },
      });
      fireEvent.change(screen.getByTestId('pva-input-caseEffectiveDate'), {
        target: { value: '2026-05-01' },
      });
      clickCalculate();
      expect(scrollIntoView).toHaveBeenCalledTimes(1);

      // Switch away and back — neither hop involves a Calculate click.
      fireEvent.click(screen.getByTestId('pva-asset-picker-item-pen-fresh-scroll'));
      fireEvent.click(screen.getByTestId('pva-asset-picker-item-pen-calc-scroll'));
      expect(screen.getByTestId('pva-bignumber-headline')).toBeInTheDocument();
      expect(scrollIntoView).toHaveBeenCalledTimes(1);
    });
  });
});
