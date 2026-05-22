'use client';

import { useState } from 'react';
import { T } from '@/src/lib/brand/tokens';
import WizardField from '@/src/components/wizard/WizardField.jsx';
import WizardSelector from '@/src/components/wizard/WizardSelector.jsx';
import WizardCheckbox from '@/src/components/wizard/WizardCheckbox.jsx';
import NumericFieldBridge from '@/src/components/m5/wizard-bridge/NumericFieldBridge.jsx';
import RefiRateInput from './RefiRateInput.jsx';

/**
 * §9.8.1 el.1–2 — HDA input surface.
 *   1. Shared inputs (§9.3.1): always visible.
 *   2. Per-scenario inputs (§9.3.2): three accordion sections, collapsed by
 *      default (user expands the scenario(s) they want to tune).
 *
 * Props-driven and store-agnostic (mirrors PVA/CommonFields): the parent owns
 * the m5Store read + `setHomeDecisionInputs` write and passes `onChange(field,
 * value)`. Accordion expand/collapse is local UI state only.
 *
 * Value/unit convention (PR 3): fields edit the RAW m5Store value. The store
 * mixes fraction units (realtor/closing/appreciation/equity-share) with a
 * percent unit (`interimCostSharePct` 0–100); that seam is Fitz's polish-
 * backlog item 8 and is NOT reconciled here. The orchestrator converts
 * `interimCostSharePct` ×0.01 at the calc boundary (resolution #4). Per-field
 * helper text states the unit so the raw value is unambiguous.
 *
 * `refiRate` is a plain number field in PR 3; the Q-11 force-input UX
 * (RefiRateInput.jsx) is deferred to PR 4 per the approved split.
 *
 * @param {object} props
 * @param {object} props.inputs   m5Store.homeDecision.inputs
 * @param {(field: string, value: unknown) => void} props.onChange
 */

function FieldSection({ title, testid, children }) {
  return (
    <section
      data-testid={testid}
      style={{
        marginBottom: 20,
        padding: 16,
        background: T.CARD,
        border: `1px solid ${T.NAVY_12}`,
        borderRadius: 8,
      }}
    >
      {title && (
        <h3
          style={{
            fontFamily: T.FONT_DISPLAY,
            fontSize: '1rem',
            fontWeight: 500,
            color: T.NAVY,
            margin: '0 0 12px 0',
          }}
        >
          {title}
        </h3>
      )}
      {children}
    </section>
  );
}

function Accordion({ id, title, expanded, onToggle, children }) {
  const panelId = `${id}-panel`;
  return (
    <section
      data-testid={`${id}-section`}
      style={{
        marginBottom: 12,
        background: T.CARD,
        border: `1px solid ${T.NAVY_12}`,
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        data-testid={`${id}-toggle`}
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontFamily: T.FONT_DISPLAY,
          fontSize: '1rem',
          fontWeight: 500,
          color: T.NAVY,
          textAlign: 'left',
        }}
      >
        <span>{title}</span>
        <span aria-hidden="true" style={{ color: T.NAVY_55, fontSize: 13 }}>
          {expanded ? '▾' : '▸'}
        </span>
      </button>
      {expanded && (
        <div
          id={panelId}
          data-testid={panelId}
          style={{ padding: '0 16px 16px', borderTop: `1px solid ${T.NAVY_12}` }}
        >
          <div style={{ paddingTop: 16 }}>{children}</div>
        </div>
      )}
    </section>
  );
}

const CREDIT_BAND_OPTIONS = [
  { value: 'excellent', label: 'Excellent (740+)' },
  { value: 'good', label: 'Good (670–739)' },
  { value: 'fair', label: 'Fair (580–669)' },
  { value: 'poor', label: 'Poor (<580)' },
];

const FILING_STATUS_OPTIONS = [
  { value: 'single', label: 'Single' },
  { value: 'mfj', label: 'Married filing jointly' },
];

const MORTGAGE_CONTINUITY_OPTIONS = [
  { value: 'refi-at-current', label: 'Refinance at current rate (default)' },
  { value: 'assumable', label: 'Assumable (FHA/VA/USDA)' },
];

const REFI_TERM_OPTIONS = [{ value: '30-year', label: '30-year fixed (v1 lock)' }];

export default function HomeDecisionInputs({ inputs, onChange }) {
  const [open, setOpen] = useState({
    keepAndRefi: false,
    sellNow: false,
    deferredSale: false,
  });
  const toggle = (k) => setOpen((s) => ({ ...s, [k]: !s[k] }));

  // State USPS code: WizardField has no maxLength prop; preserve the old
  // TextField's auto-uppercase + 2-char cap + empty→null discipline here.
  const handleStateChange = (field, raw) => {
    const upper = (raw || '').toUpperCase().slice(0, 2);
    onChange(field, upper || null);
  };

  return (
    <div data-testid="hda-inputs" style={{ fontFamily: T.FONT_BODY }}>
      {/* ── §9.3.1 Shared inputs (always visible) ── */}
      <FieldSection title="Shared inputs" testid="hda-inputs-shared">
        <NumericFieldBridge
          field="currentFMV"
          label="Current home value (FMV estimate)"
          tooltip="Your best estimate. For high-stakes scenarios, an appraisal may be warranted."
          prefix="$"
          value={inputs.currentFMV ?? ''}
          onChange={onChange}
          parser="number"
          data-testid="hda-input-currentFMV"
        />
        <NumericFieldBridge
          field="existingMortgageBalance"
          label="Existing mortgage balance ($)"
          tooltip="Pre-populated from your M2 marital estate inventory when available."
          prefix="$"
          value={inputs.existingMortgageBalance ?? ''}
          onChange={onChange}
          parser="number"
          data-testid="hda-input-existingMortgageBalance"
        />
        <NumericFieldBridge
          field="existingMortgageRate"
          label="Existing mortgage rate (% APR)"
          tooltip="Enter as a percent (e.g. 4.5 for 4.5% APR). Manual entry — used for interim cashflow and deferred-sale continuity."
          suffix="%"
          value={inputs.existingMortgageRate ?? ''}
          onChange={onChange}
          parser="number"
          percent
          data-testid="hda-input-existingMortgageRate"
        />
        <NumericFieldBridge
          field="existingMortgageRemainingTermMonths"
          label="Existing mortgage remaining term (months)"
          tooltip="Defaults to 360 (30 years) if unknown."
          value={inputs.existingMortgageRemainingTermMonths ?? ''}
          onChange={onChange}
          parser="number"
          data-testid="hda-input-existingMortgageRemainingTermMonths"
        />
        <NumericFieldBridge
          field="monthlyPropertyTax"
          label="Monthly property tax ($)"
          tooltip="Pre-populated from M3 budget modeler when available."
          prefix="$"
          value={inputs.monthlyPropertyTax ?? ''}
          onChange={onChange}
          parser="number"
          data-testid="hda-input-monthlyPropertyTax"
        />
        <NumericFieldBridge
          field="monthlyInsurance"
          label="Monthly home insurance ($)"
          tooltip="Pre-populated from M3 budget modeler when available."
          prefix="$"
          value={inputs.monthlyInsurance ?? ''}
          onChange={onChange}
          parser="number"
          data-testid="hda-input-monthlyInsurance"
        />
        <NumericFieldBridge
          field="monthlyHOA"
          label="Monthly HOA ($)"
          tooltip="Default 0 if no source data."
          prefix="$"
          value={inputs.monthlyHOA ?? ''}
          onChange={onChange}
          parser="number"
          data-testid="hda-input-monthlyHOA"
        />
        <NumericFieldBridge
          field="userPostDivorceGrossMonthlyIncome"
          label="Post-divorce gross monthly income ($)"
          tooltip="Pre-populated from M1 Budget Gap (household × your share %). DTI denominator."
          prefix="$"
          value={inputs.userPostDivorceGrossMonthlyIncome ?? ''}
          onChange={onChange}
          parser="number"
          data-testid="hda-input-userPostDivorceGrossMonthlyIncome"
        />
        <NumericFieldBridge
          field="userTotalMonthlyDebtPayments"
          label="Other monthly debt payments ($)"
          tooltip="Non-housing debt (auto, student loans, cards). Manual entry at v1. Used for back-end DTI."
          prefix="$"
          value={inputs.userTotalMonthlyDebtPayments ?? ''}
          onChange={onChange}
          parser="number"
          data-testid="hda-input-userTotalMonthlyDebtPayments"
        />
        <NumericFieldBridge
          field="startingLiquidCash"
          label="Starting liquid cash ($)"
          tooltip="Checking + savings + non-retirement brokerage. Pre-populated from M2. Retirement excluded."
          prefix="$"
          value={inputs.startingLiquidCash ?? ''}
          onChange={onChange}
          parser="number"
          data-testid="hda-input-startingLiquidCash"
        />
        <WizardSelector
          field="userCreditScoreBand"
          label="Credit score band"
          tooltip="Drives the qualification verdict, banded refi-rate estimate, and PMI lookup."
          value={inputs.userCreditScoreBand ?? ''}
          onChange={onChange}
          options={CREDIT_BAND_OPTIONS}
          placeholder="— select —"
          data-testid="hda-input-userCreditScoreBand"
        />
        <WizardField
          field="userState"
          label="State (USPS code)"
          tooltip="Drives the state-aware refi closing-cost default."
          value={inputs.userState ?? ''}
          onChange={handleStateChange}
          data-testid="hda-input-userState"
        />
        <NumericFieldBridge
          field="homeAcquisitionYear"
          label="Home acquisition year"
          tooltip="Required for the deferred-sale ownership test and sell-now use-test calibration."
          value={inputs.homeAcquisitionYear ?? ''}
          onChange={onChange}
          parser="number"
          data-testid="hda-input-homeAcquisitionYear"
        />
        <NumericFieldBridge
          field="propertyAppreciationRateReal"
          label="Real property appreciation rate (fraction)"
          tooltip="Real-dollar terms. Default 0 (≈ 2.5% nominal). 0.01 = 1% real."
          value={inputs.propertyAppreciationRateReal ?? ''}
          onChange={onChange}
          parser="number"
          data-testid="hda-input-propertyAppreciationRateReal"
        />
        <NumericFieldBridge
          field="spouseEquityShare"
          label="Spouse equity share (fraction 0–1)"
          tooltip="Default 0.5 (equal split). 0.5 = spouse receives 50% of net equity."
          value={inputs.spouseEquityShare ?? ''}
          onChange={onChange}
          parser="number"
          data-testid="hda-input-spouseEquityShare"
        />
      </FieldSection>

      {/* ── §9.3.2 Per-scenario inputs (accordion, collapsed by default) ── */}
      <Accordion
        id="hda-scenario-keepAndRefi"
        title="Keep & refinance inputs"
        expanded={open.keepAndRefi}
        onToggle={() => toggle('keepAndRefi')}
      >
        <NumericFieldBridge
          field="buyoutAmount"
          label="Buyout amount ($)"
          tooltip="Defaults to (FMV − mortgage) × spouse equity share if left blank. Override per settlement."
          prefix="$"
          value={inputs.buyoutAmount ?? ''}
          onChange={onChange}
          parser="number"
          data-testid="hda-input-buyoutAmount"
        />
        <RefiRateInput
          value={inputs.refiRate}
          creditBand={inputs.userCreditScoreBand}
          provenance={inputs.refiRateProvenance}
          onChange={onChange}
        />
        <NumericFieldBridge
          field="refiClosingCostsPercent"
          label="Refi closing costs (fraction)"
          tooltip="State-aware default (2–5%). 0.03 = 3%. Distinct from sale closing costs."
          value={inputs.refiClosingCostsPercent ?? ''}
          onChange={onChange}
          parser="number"
          data-testid="hda-input-refiClosingCostsPercent"
        />
        <WizardSelector
          field="refiTerm"
          label="Refi term"
          tooltip="v1 lock: 30-year fixed conventional only."
          value={inputs.refiTerm ?? '30-year'}
          onChange={onChange}
          options={REFI_TERM_OPTIONS}
          data-testid="hda-input-refiTerm"
        />
      </Accordion>

      <Accordion
        id="hda-scenario-sellNow"
        title="Sell now inputs"
        expanded={open.sellNow}
        onToggle={() => toggle('sellNow')}
      >
        <NumericFieldBridge
          field="realtorCommissionPercent"
          label="Realtor commission (fraction)"
          tooltip="Default 0.05 (5%). Shared with deferred-sale per the v1 store schema."
          value={inputs.realtorCommissionPercent ?? ''}
          onChange={onChange}
          parser="number"
          data-testid="hda-input-realtorCommissionPercent"
        />
        <NumericFieldBridge
          field="saleClosingCostsPercent"
          label="Sale closing costs (fraction)"
          tooltip="Default 0.02 (2%). Shared with deferred-sale per the v1 store schema."
          value={inputs.saleClosingCostsPercent ?? ''}
          onChange={onChange}
          parser="number"
          data-testid="hda-input-saleClosingCostsPercent"
        />
        <WizardSelector
          field="expectedFilingStatusAtSellNow"
          label="Expected filing status at sale"
          tooltip="Optional override. Defaults from your M4 divorce-year filing status. Captures sale-slippage cases."
          value={inputs.expectedFilingStatusAtSellNow ?? ''}
          onChange={onChange}
          options={FILING_STATUS_OPTIONS}
          placeholder="— select —"
          data-testid="hda-input-expectedFilingStatusAtSellNow"
        />
        <NumericFieldBridge
          field="userMovedOutYearsAgo"
          label="Years since you moved out"
          tooltip="Default 0 (currently occupying). Fractional allowed. >3 at sale triggers a §121 use-test callout."
          value={inputs.userMovedOutYearsAgo ?? ''}
          onChange={onChange}
          parser="number"
          data-testid="hda-input-userMovedOutYearsAgo"
        />
      </Accordion>

      <Accordion
        id="hda-scenario-deferredSale"
        title="Deferred sale inputs"
        expanded={open.deferredSale}
        onToggle={() => toggle('deferredSale')}
      >
        <NumericFieldBridge
          field="occupancyYears"
          label="Years until trigger sale"
          tooltip="Typically: youngest child's high-school graduation year − current year."
          value={inputs.occupancyYears ?? ''}
          onChange={onChange}
          parser="number"
          data-testid="hda-input-occupancyYears"
        />
        <NumericFieldBridge
          field="interimCostSharePct"
          label="Your interim cost share (%)"
          tooltip="Percent 0–100 (50 = 50%). Interim costs = mortgage P&I + tax + insurance + HOA."
          suffix="%"
          value={inputs.interimCostSharePct ?? ''}
          onChange={onChange}
          parser="number"
          data-testid="hda-input-interimCostSharePct"
        />
        <div data-testid="hda-stress-test-row" style={{ marginBottom: 14 }}>
          <WizardCheckbox
            field="stressTestUserPays100Pct"
            variant="checkbox"
            label="Stress test: assume I pay 100% of interim costs"
            tooltip="Runs a parallel projection assuming you cover all interim costs."
            value={inputs.stressTestUserPays100Pct}
            onChange={onChange}
            data-testid="hda-input-stressTestUserPays100Pct"
          />
        </div>
        <WizardSelector
          field="deferredSaleMortgageContinuity"
          label="Mortgage continuity at deferred sale"
          tooltip="Default: refinance at current rate. Assumable for FHA/VA/USDA edge cases."
          value={inputs.deferredSaleMortgageContinuity ?? 'refi-at-current'}
          onChange={onChange}
          options={MORTGAGE_CONTINUITY_OPTIONS}
          data-testid="hda-input-deferredSaleMortgageContinuity"
        />
      </Accordion>
    </div>
  );
}
