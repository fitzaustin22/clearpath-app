'use client';

import { useState } from 'react';
import { T } from '@/src/lib/brand/tokens';

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

const LABEL_STYLE = {
  display: 'block',
  fontFamily: T.FONT_BODY,
  fontSize: 14,
  fontWeight: 600,
  color: T.NAVY,
  marginBottom: 6,
};

const INPUT_STYLE = {
  width: '100%',
  padding: '10px 12px',
  fontFamily: T.FONT_BODY,
  fontSize: 16,
  color: T.NAVY,
  border: `1px solid ${T.NAVY_12}`,
  borderRadius: 6,
  backgroundColor: T.CARD,
  outline: 'none',
  boxSizing: 'border-box',
};

const HELPER_STYLE = {
  fontFamily: T.FONT_BODY,
  fontSize: 13,
  color: T.NAVY_55,
  margin: '6px 0 0',
};

const FIELD_WRAP = { marginBottom: 14 };

function NumberField({ id, label, helper, value, onChange, min, max, step }) {
  return (
    <div style={FIELD_WRAP}>
      <label htmlFor={id} style={LABEL_STYLE}>{label}</label>
      <input
        id={id}
        data-testid={id}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step ?? 'any'}
        value={value == null ? '' : value}
        onChange={(e) => {
          const v = e.target.value;
          if (v === '') return onChange(null);
          const n = Number(v);
          onChange(Number.isFinite(n) ? n : null);
        }}
        style={INPUT_STYLE}
      />
      {helper && <p style={HELPER_STYLE}>{helper}</p>}
    </div>
  );
}

function TextField({ id, label, helper, value, onChange, maxLength }) {
  return (
    <div style={FIELD_WRAP}>
      <label htmlFor={id} style={LABEL_STYLE}>{label}</label>
      <input
        id={id}
        data-testid={id}
        type="text"
        maxLength={maxLength}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? e.target.value.toUpperCase() : null)}
        style={INPUT_STYLE}
      />
      {helper && <p style={HELPER_STYLE}>{helper}</p>}
    </div>
  );
}

function SelectField({ id, label, helper, value, onChange, options, allowEmpty = true }) {
  return (
    <div style={FIELD_WRAP}>
      <label htmlFor={id} style={LABEL_STYLE}>{label}</label>
      <select
        id={id}
        data-testid={id}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        style={INPUT_STYLE}
      >
        {allowEmpty && <option value="">— select —</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {helper && <p style={HELPER_STYLE}>{helper}</p>}
    </div>
  );
}

function CheckboxField({ id, label, helper, checked, onChange }) {
  return (
    <div style={FIELD_WRAP}>
      <label
        htmlFor={id}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          fontFamily: T.FONT_BODY,
          fontSize: 14,
          fontWeight: 600,
          color: T.NAVY,
        }}
      >
        <input
          id={id}
          data-testid={id}
          type="checkbox"
          checked={!!checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        {label}
      </label>
      {helper && <p style={HELPER_STYLE}>{helper}</p>}
    </div>
  );
}

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

  return (
    <div data-testid="hda-inputs" style={{ fontFamily: T.FONT_BODY }}>
      {/* ── §9.3.1 Shared inputs (always visible) ── */}
      <FieldSection title="Shared inputs" testid="hda-inputs-shared">
        <NumberField
          id="hda-input-currentFMV"
          label="Current home value (FMV estimate)"
          helper="Your best estimate. For high-stakes scenarios, an appraisal may be warranted."
          value={inputs.currentFMV}
          onChange={(v) => onChange('currentFMV', v)}
          min={0}
        />
        <NumberField
          id="hda-input-existingMortgageBalance"
          label="Existing mortgage balance ($)"
          helper="Pre-populated from your M2 marital estate inventory when available."
          value={inputs.existingMortgageBalance}
          onChange={(v) => onChange('existingMortgageBalance', v)}
          min={0}
        />
        <NumberField
          id="hda-input-existingMortgageRate"
          label="Existing mortgage rate (% APR)"
          helper="Manual entry. Used for interim cashflow and deferred-sale continuity."
          value={inputs.existingMortgageRate}
          onChange={(v) => onChange('existingMortgageRate', v)}
          min={0}
          step={0.01}
        />
        <NumberField
          id="hda-input-existingMortgageRemainingTermMonths"
          label="Existing mortgage remaining term (months)"
          helper="Defaults to 360 (30 years) if unknown."
          value={inputs.existingMortgageRemainingTermMonths}
          onChange={(v) => onChange('existingMortgageRemainingTermMonths', v)}
          min={0}
          step={1}
        />
        <NumberField
          id="hda-input-monthlyPropertyTax"
          label="Monthly property tax ($)"
          helper="Pre-populated from M3 budget modeler when available."
          value={inputs.monthlyPropertyTax}
          onChange={(v) => onChange('monthlyPropertyTax', v)}
          min={0}
        />
        <NumberField
          id="hda-input-monthlyInsurance"
          label="Monthly home insurance ($)"
          helper="Pre-populated from M3 budget modeler when available."
          value={inputs.monthlyInsurance}
          onChange={(v) => onChange('monthlyInsurance', v)}
          min={0}
        />
        <NumberField
          id="hda-input-monthlyHOA"
          label="Monthly HOA ($)"
          helper="Default 0 if no source data."
          value={inputs.monthlyHOA}
          onChange={(v) => onChange('monthlyHOA', v)}
          min={0}
        />
        <NumberField
          id="hda-input-userPostDivorceGrossMonthlyIncome"
          label="Post-divorce gross monthly income ($)"
          helper="Pre-populated from M1 Budget Gap (household × your share %). DTI denominator."
          value={inputs.userPostDivorceGrossMonthlyIncome}
          onChange={(v) => onChange('userPostDivorceGrossMonthlyIncome', v)}
          min={0}
        />
        <NumberField
          id="hda-input-userTotalMonthlyDebtPayments"
          label="Other monthly debt payments ($)"
          helper="Non-housing debt (auto, student loans, cards). Manual entry at v1. Used for back-end DTI."
          value={inputs.userTotalMonthlyDebtPayments}
          onChange={(v) => onChange('userTotalMonthlyDebtPayments', v)}
          min={0}
        />
        <NumberField
          id="hda-input-startingLiquidCash"
          label="Starting liquid cash ($)"
          helper="Checking + savings + non-retirement brokerage. Pre-populated from M2. Retirement excluded."
          value={inputs.startingLiquidCash}
          onChange={(v) => onChange('startingLiquidCash', v)}
          min={0}
        />
        <SelectField
          id="hda-input-userCreditScoreBand"
          label="Credit score band"
          helper="Drives the qualification verdict, banded refi-rate estimate, and PMI lookup."
          value={inputs.userCreditScoreBand}
          onChange={(v) => onChange('userCreditScoreBand', v)}
          options={CREDIT_BAND_OPTIONS}
        />
        <TextField
          id="hda-input-userState"
          label="State (USPS code)"
          helper="Drives the state-aware refi closing-cost default."
          value={inputs.userState}
          onChange={(v) => onChange('userState', v)}
          maxLength={2}
        />
        <NumberField
          id="hda-input-homeAcquisitionYear"
          label="Home acquisition year"
          helper="Required for the deferred-sale ownership test and sell-now use-test calibration."
          value={inputs.homeAcquisitionYear}
          onChange={(v) => onChange('homeAcquisitionYear', v)}
          step={1}
        />
        <NumberField
          id="hda-input-propertyAppreciationRateReal"
          label="Real property appreciation rate (fraction)"
          helper="Real-dollar terms. Default 0 (≈ 2.5% nominal). 0.01 = 1% real."
          value={inputs.propertyAppreciationRateReal}
          onChange={(v) => onChange('propertyAppreciationRateReal', v)}
          step={0.005}
        />
        <NumberField
          id="hda-input-spouseEquityShare"
          label="Spouse equity share (fraction 0–1)"
          helper="Default 0.5 (equal split). 0.5 = spouse receives 50% of net equity."
          value={inputs.spouseEquityShare}
          onChange={(v) => onChange('spouseEquityShare', v)}
          min={0}
          max={1}
          step={0.01}
        />
      </FieldSection>

      {/* ── §9.3.2 Per-scenario inputs (accordion, collapsed by default) ── */}
      <Accordion
        id="hda-scenario-keepAndRefi"
        title="Keep & refinance inputs"
        expanded={open.keepAndRefi}
        onToggle={() => toggle('keepAndRefi')}
      >
        <NumberField
          id="hda-input-buyoutAmount"
          label="Buyout amount ($)"
          helper="Defaults to (FMV − mortgage) × spouse equity share if left blank. Override per settlement."
          value={inputs.buyoutAmount}
          onChange={(v) => onChange('buyoutAmount', v)}
        />
        <NumberField
          id="hda-input-refiRate"
          label="Refi rate (% APR)"
          helper="Enter your quoted rate. (Banded-estimate opt-in UX ships in a later update.)"
          value={inputs.refiRate}
          onChange={(v) => onChange('refiRate', v)}
          min={0}
          step={0.01}
        />
        <NumberField
          id="hda-input-refiClosingCostsPercent"
          label="Refi closing costs (fraction)"
          helper="State-aware default (2–5%). 0.03 = 3%. Distinct from sale closing costs."
          value={inputs.refiClosingCostsPercent}
          onChange={(v) => onChange('refiClosingCostsPercent', v)}
          min={0}
          step={0.005}
        />
        <SelectField
          id="hda-input-refiTerm"
          label="Refi term"
          helper="v1 lock: 30-year fixed conventional only."
          value={inputs.refiTerm ?? '30-year'}
          onChange={(v) => onChange('refiTerm', v ?? '30-year')}
          options={REFI_TERM_OPTIONS}
          allowEmpty={false}
        />
      </Accordion>

      <Accordion
        id="hda-scenario-sellNow"
        title="Sell now inputs"
        expanded={open.sellNow}
        onToggle={() => toggle('sellNow')}
      >
        <NumberField
          id="hda-input-realtorCommissionPercent"
          label="Realtor commission (fraction)"
          helper="Default 0.05 (5%). Shared with deferred-sale per the v1 store schema."
          value={inputs.realtorCommissionPercent}
          onChange={(v) => onChange('realtorCommissionPercent', v)}
          min={0}
          step={0.005}
        />
        <NumberField
          id="hda-input-saleClosingCostsPercent"
          label="Sale closing costs (fraction)"
          helper="Default 0.02 (2%). Shared with deferred-sale per the v1 store schema."
          value={inputs.saleClosingCostsPercent}
          onChange={(v) => onChange('saleClosingCostsPercent', v)}
          min={0}
          step={0.005}
        />
        <SelectField
          id="hda-input-expectedFilingStatusAtSellNow"
          label="Expected filing status at sale"
          helper="Optional override. Defaults from your M4 divorce-year filing status. Captures sale-slippage cases."
          value={inputs.expectedFilingStatusAtSellNow}
          onChange={(v) => onChange('expectedFilingStatusAtSellNow', v)}
          options={FILING_STATUS_OPTIONS}
        />
        <NumberField
          id="hda-input-userMovedOutYearsAgo"
          label="Years since you moved out"
          helper="Default 0 (currently occupying). Fractional allowed. >3 at sale triggers a §121 use-test callout."
          value={inputs.userMovedOutYearsAgo}
          onChange={(v) => onChange('userMovedOutYearsAgo', v)}
          min={0}
          step={0.5}
        />
      </Accordion>

      <Accordion
        id="hda-scenario-deferredSale"
        title="Deferred sale inputs"
        expanded={open.deferredSale}
        onToggle={() => toggle('deferredSale')}
      >
        <NumberField
          id="hda-input-occupancyYears"
          label="Years until trigger sale"
          helper="Typically: youngest child's high-school graduation year − current year."
          value={inputs.occupancyYears}
          onChange={(v) => onChange('occupancyYears', v)}
          min={0}
          step={0.5}
        />
        <NumberField
          id="hda-input-interimCostSharePct"
          label="Your interim cost share (%)"
          helper="Percent 0–100 (50 = 50%). Interim costs = mortgage P&I + tax + insurance + HOA."
          value={inputs.interimCostSharePct}
          onChange={(v) => onChange('interimCostSharePct', v)}
          min={0}
          max={100}
          step={1}
        />
        <CheckboxField
          id="hda-input-stressTestUserPays100Pct"
          label="Stress test: assume I pay 100% of interim costs"
          helper="Runs a parallel projection assuming you cover all interim costs."
          checked={inputs.stressTestUserPays100Pct}
          onChange={(v) => onChange('stressTestUserPays100Pct', v)}
        />
        <SelectField
          id="hda-input-deferredSaleMortgageContinuity"
          label="Mortgage continuity at deferred sale"
          helper="Default: refinance at current rate. Assumable for FHA/VA/USDA edge cases."
          value={inputs.deferredSaleMortgageContinuity ?? 'refi-at-current'}
          onChange={(v) => onChange('deferredSaleMortgageContinuity', v ?? 'refi-at-current')}
          options={MORTGAGE_CONTINUITY_OPTIONS}
          allowEmpty={false}
        />
      </Accordion>
    </div>
  );
}
