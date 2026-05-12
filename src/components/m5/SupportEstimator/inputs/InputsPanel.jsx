'use client';

import { useState, useEffect, useMemo } from 'react';
import { useM5Store } from '@/src/stores/m5Store';
import { clearPrePopSource } from '@/src/stores/prePopulate';
import {
  CurrencyInput, NumberInput, SelectField, RadioGroup, Toggle,
  Banner, PrePopBadge, SectionCard,
} from './_fields.jsx';
import { NAVY, MUTED, SOURCE } from '../_styles.js';

const STATE_OPTIONS = [
  { value: 'VA',    label: 'Virginia (VA)' },
  { value: 'MD',    label: 'Maryland (MD)' },
  { value: 'DC',    label: 'District of Columbia (DC)' },
  { value: 'NY',    label: 'New York (NY)' },
  { value: 'CA',    label: 'California (CA)' },
  { value: 'OTHER', label: 'Other state (national approximation)' },
];

const NY_CUSTODY_OPTIONS = [
  { value: 'kids_with_payor', label: 'Children primarily live with the higher-earning spouse' },
  { value: 'kids_with_payee', label: 'Children primarily live with the lower-earning spouse' },
  { value: 'shared',          label: 'Shared (roughly 50–50) custody' },
];

const TEMPORAL_OPTIONS = [
  { value: 'pendente_lite', label: 'Pendente lite (during proceedings)' },
  { value: 'post_divorce',  label: 'Post-divorce (final order)' },
];

const DEPTH_OPTIONS = [
  { value: 'standard',       label: 'Standard (per-party gross income)' },
  { value: 'full_worksheet', label: 'Full Worksheet (gross-to-net cascade)' },
];

const SP3_TIE_ERROR_TEXT =
  "Equal parenting time isn't supported at v1 — please enter different overnight " +
  "counts (e.g., 183/182 for a near-50/50 split).";

function PartyInputs({ partyKey, label, prePopSource, onClearPrePop }) {
  const inputs = useM5Store((s) => s.supportEstimator.inputs);
  const setInputs = useM5Store((s) => s.setSupportEstimatorInputs);

  const party = inputs[partyKey];
  const isPartyA = partyKey === 'partyA';
  const showPrePopBadge = isPartyA && !!prePopSource;

  const updateParty = (patch) => {
    setInputs({ [partyKey]: { ...party, ...patch } });
  };

  const onGrossChange = (v) => {
    updateParty({ grossMonthly: v });
    if (showPrePopBadge) onClearPrePop();
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          fontFamily: SOURCE, fontSize: 14, fontWeight: 700,
          color: NAVY, marginBottom: 10, textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        {label}
        {showPrePopBadge && <PrePopBadge text="from M3 Pay Stub Decoder — review or override" />}
      </div>

      <CurrencyInput
        id={`${partyKey}-gross`}
        label="Gross monthly income"
        helper={
          isPartyA
            ? 'Pre-fills from M3 Pay Stub Decoder when available.'
            : 'Spouse income — typically sourced from discovery, financial affidavit, or W-2 disclosure.'
        }
        value={party.grossMonthly}
        onChange={onGrossChange}
      />

      <Toggle
        id={`${partyKey}-impute`}
        label="Impute earning capacity for this party"
        value={party.imputeIncome}
        onChange={(v) => {
          const next = { imputeIncome: v };
          if (!v) next.imputedEarningCapacity = null;
          updateParty(next);
        }}
        helper="Imputed earning capacity is the income a party could reasonably earn — derived from prior earnings, vocational expert, or attorney guidance."
      />

      {party.imputeIncome && (
        <CurrencyInput
          id={`${partyKey}-imputed`}
          label="Imputed earning capacity (monthly)"
          helper="Used in place of actual gross at calc entry."
          value={party.imputedEarningCapacity}
          onChange={(v) => updateParty({ imputedEarningCapacity: v })}
        />
      )}
    </div>
  );
}

function AddOnsForParty({ partyKey, label, parentingErrorActive }) {
  const inputs = useM5Store((s) => s.supportEstimator.inputs);
  const setInputs = useM5Store((s) => s.setSupportEstimatorInputs);
  const party = inputs[partyKey];

  const update = (patch) => setInputs({ [partyKey]: { ...party, ...patch } });

  const otherPartyKey = partyKey === 'partyA' ? 'partyB' : 'partyA';
  const otherNights = inputs[otherPartyKey]?.parentingTimeNights ?? 0;
  const totalNights = (party.parentingTimeNights ?? 0) + otherNights;
  const overTotalCap = totalNights > 365;
  const nightsError = parentingErrorActive
    ? SP3_TIE_ERROR_TEXT
    : overTotalCap
      ? `Total across both parties must not exceed 365 (currently ${totalNights}).`
      : null;

  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          fontFamily: SOURCE, fontSize: 14, fontWeight: 700,
          color: NAVY, marginBottom: 10, textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        {label}
      </div>
      <CurrencyInput
        id={`${partyKey}-hi`}
        label="Health insurance premium (monthly)"
        value={party.healthInsurance}
        onChange={(v) => update({ healthInsurance: v ?? 0 })}
      />
      <CurrencyInput
        id={`${partyKey}-childcare`}
        label="Childcare cost (monthly)"
        value={party.childcare}
        onChange={(v) => update({ childcare: v ?? 0 })}
      />
      <NumberInput
        id={`${partyKey}-nights`}
        label="Parenting time (overnights per year)"
        helper="0–365. Total across both parties cannot exceed 365."
        value={party.parentingTimeNights}
        onChange={(v) => update({ parentingTimeNights: v == null ? 0 : Math.max(0, Math.min(365, v)) })}
        min={0}
        max={365}
        step={1}
        errorText={nightsError}
      />
      <CurrencyInput
        id={`${partyKey}-other-support`}
        label="Other support obligations (monthly)"
        helper="Existing child support or spousal support orders."
        value={party.otherSupportObligations}
        onChange={(v) => update({ otherSupportObligations: v ?? 0 })}
      />
    </div>
  );
}

function FullWorksheetCascade() {
  const inputs = useM5Store((s) => s.supportEstimator.inputs);
  const setInputs = useM5Store((s) => s.setSupportEstimatorInputs);

  // Initialize fullWorksheet shape on first mount of cascade.
  useEffect(() => {
    if (inputs.fullWorksheet == null) {
      setInputs({
        fullWorksheet: {
          partyA: { fedTax: 0, stateTax: 0, fica: 0, otherDeductions: 0, net: 0 },
          partyB: { fedTax: 0, stateTax: 0, fica: 0, otherDeductions: 0, net: 0 },
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fw = inputs.fullWorksheet;
  if (!fw) return null;

  function PartyCascade({ partyKey, label }) {
    const party = inputs[partyKey];
    const cascade = fw[partyKey];

    // Compute net from gross - deductions. Update store so calc engine can read it.
    const derivedGross = party.imputeIncome
      ? party.imputedEarningCapacity ?? 0
      : party.grossMonthly ?? 0;
    const computedNet = useMemo(
      () => Math.max(
        0,
        derivedGross - (cascade.fedTax + cascade.stateTax + cascade.fica + cascade.otherDeductions),
      ),
      [derivedGross, cascade.fedTax, cascade.stateTax, cascade.fica, cascade.otherDeductions],
    );

    useEffect(() => {
      if (cascade.net !== computedNet) {
        setInputs({
          fullWorksheet: {
            ...inputs.fullWorksheet,
            [partyKey]: { ...cascade, net: computedNet },
          },
        });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [computedNet]);

    const updateCascade = (patch) => {
      setInputs({
        fullWorksheet: {
          ...inputs.fullWorksheet,
          [partyKey]: { ...cascade, ...patch },
        },
      });
    };

    return (
      <div style={{ marginBottom: 18 }}>
        <div
          style={{
            fontFamily: SOURCE, fontSize: 14, fontWeight: 700,
            color: NAVY, marginBottom: 10, textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          {label}
        </div>
        <CurrencyInput
          id={`${partyKey}-fed-tax`}
          label="Federal income tax (monthly)"
          value={cascade.fedTax}
          onChange={(v) => updateCascade({ fedTax: v ?? 0 })}
        />
        <CurrencyInput
          id={`${partyKey}-state-tax`}
          label="State income tax (monthly)"
          value={cascade.stateTax}
          onChange={(v) => updateCascade({ stateTax: v ?? 0 })}
        />
        <CurrencyInput
          id={`${partyKey}-fica`}
          label="FICA — Social Security + Medicare (monthly)"
          helper="Baseline 7.65% of gross; override if alternative withholding applies."
          value={cascade.fica}
          onChange={(v) => updateCascade({ fica: v ?? 0 })}
        />
        <CurrencyInput
          id={`${partyKey}-other-deductions`}
          label="Other mandatory deductions (monthly)"
          value={cascade.otherDeductions}
          onChange={(v) => updateCascade({ otherDeductions: v ?? 0 })}
        />
        <div
          style={{
            padding: '10px 12px',
            backgroundColor: '#F0F4FA',
            border: '1px solid #CBD5E1',
            borderRadius: 6,
            fontFamily: SOURCE, fontSize: 14, color: NAVY,
            marginTop: 4,
          }}
        >
          <strong>Net (computed):</strong> ${Math.round(computedNet).toLocaleString()}/mo
          <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>
            Gross ${Math.round(derivedGross).toLocaleString()} − deductions.
            Persisted to store; calc engine reads net directly.
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <PartyCascade partyKey="partyA" label="Party A — gross-to-net" />
      <PartyCascade partyKey="partyB" label="Party B — gross-to-net" />
    </>
  );
}

function AdvancedSettings() {
  const [open, setOpen] = useState(false);
  const inputs = useM5Store((s) => s.supportEstimator.inputs);
  const setInputs = useM5Store((s) => s.setSupportEstimatorInputs);

  const resolvedDate = inputs.caseEffectiveDate
    ? inputs.caseEffectiveDate.slice(0, 10)
    : 'today';

  return (
    <div style={{ marginTop: 8 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          background: 'none', border: 'none',
          fontFamily: SOURCE, fontSize: 13,
          color: NAVY, fontWeight: 600,
          cursor: 'pointer',
          padding: '4px 0',
        }}
      >
        {open ? '▼' : '▶'} Advanced settings — statutory values: {resolvedDate}
      </button>
      {open && (
        <div style={{ marginTop: 10 }}>
          <label
            htmlFor="case-effective-date"
            style={{
              display: 'block', fontFamily: SOURCE,
              fontSize: 14, fontWeight: 600, color: NAVY, marginBottom: 6,
            }}
          >
            Case-effective date
          </label>
          <input
            id="case-effective-date"
            type="date"
            value={inputs.caseEffectiveDate ? inputs.caseEffectiveDate.slice(0, 10) : ''}
            onChange={(e) => setInputs({ caseEffectiveDate: e.target.value || null })}
            style={{
              padding: '10px 12px', fontFamily: SOURCE, fontSize: 16,
              color: NAVY, border: '1px solid #CBD5E1', borderRadius: 6,
              backgroundColor: '#FFFFFF', outline: 'none',
            }}
          />
          <p style={{ fontFamily: SOURCE, fontSize: 13, color: MUTED, margin: '6px 0 0' }}>
            All statutory constant lookups use this date (NY caps, NY SSR, VA schedule top, etc.).
            Default: today.
          </p>
        </div>
      )}
    </div>
  );
}

export function InputsPanel({ sp3Violation }) {
  const inputs = useM5Store((s) => s.supportEstimator.inputs);
  const prePopSources = useM5Store((s) => s.supportEstimator._prePopSources);
  const setInputs = useM5Store((s) => s.setSupportEstimatorInputs);
  const setPrePopSources = useM5Store((s) => s.setSupportEstimatorPrePopSources);

  const partyAPrePopSource = prePopSources?.['partyA.grossMonthly'] ?? null;

  const onClearPartyAPrePop = () => {
    if (!prePopSources) return;
    setPrePopSources(clearPrePopSource(prePopSources, 'partyA.grossMonthly'));
  };

  const isNY = inputs.state === 'NY';
  const isOther = inputs.state === 'OTHER';
  const showNYCustody = isNY && inputs.numChildren > 0;
  const isFullWorksheet = inputs.depth === 'full_worksheet';

  // Reset Full Worksheet party cascade when imputation toggles ON, per F-8.
  useEffect(() => {
    if (!inputs.fullWorksheet) return;
    let next = inputs.fullWorksheet;
    let changed = false;
    for (const key of ['partyA', 'partyB']) {
      if (inputs[key].imputeIncome && next[key].fedTax === 0 && next[key].stateTax === 0
          && next[key].fica === 0 && next[key].otherDeductions === 0 && next[key].net === 0) {
        // already zeroed
        continue;
      }
      if (inputs[key].imputeIncome) {
        next = { ...next, [key]: { fedTax: 0, stateTax: 0, fica: 0, otherDeductions: 0, net: 0 } };
        changed = true;
      }
    }
    if (changed) setInputs({ fullWorksheet: next });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputs.partyA.imputeIncome, inputs.partyB.imputeIncome]);

  return (
    <div>
      {/* Parties */}
      <SectionCard title="Parties">
        <PartyInputs
          partyKey="partyA"
          label="Party A (typically the user)"
          prePopSource={partyAPrePopSource}
          onClearPrePop={onClearPartyAPrePop}
        />
        <PartyInputs
          partyKey="partyB"
          label="Party B (spouse)"
        />
      </SectionCard>

      {/* Case basics */}
      <SectionCard title="Case basics">
        <SelectField
          id="state"
          label="State"
          value={inputs.state}
          onChange={(v) => setInputs({ state: v })}
          options={STATE_OPTIONS}
        />
        {isOther && (
          <Banner variant="amber">
            <strong>Your state may not be in our launch list.</strong> We'll use a national
            approximation for child support. Spousal support estimates are limited for
            non-launch states — most calculations will return $0 with a factor-test note.
          </Banner>
        )}

        <NumberInput
          id="num-children"
          label="Number of children"
          helper="Children of the marriage. 0–10."
          value={inputs.numChildren}
          onChange={(v) => setInputs({ numChildren: v == null ? 0 : Math.max(0, Math.min(10, v)) })}
          min={0}
          max={10}
          step={1}
        />

        <NumberInput
          id="marriage-length"
          label="Marriage length (years)"
          helper="Used by NY for spousal duration schedule and MD/DC for AAML duration."
          value={inputs.marriageLengthYears}
          onChange={(v) => setInputs({ marriageLengthYears: v })}
          min={0}
          step={0.5}
        />

        <RadioGroup
          id="temporal"
          label="Order type"
          value={inputs.temporal}
          onChange={(v) => setInputs({ temporal: v })}
          options={TEMPORAL_OPTIONS}
        />

        <RadioGroup
          id="depth"
          label="Calculation depth"
          helper="Most CDFAs and attorneys prefer the Full Worksheet level of detail."
          value={inputs.depth}
          onChange={(v) => setInputs({ depth: v })}
          options={DEPTH_OPTIONS}
        />
      </SectionCard>

      {/* NY custody — conditional */}
      {showNYCustody && (
        <SectionCard title="New York custody configuration">
          <RadioGroup
            id="ny-custody"
            label="Where do the children primarily live?"
            helper="Drives Formula A vs Formula B branching."
            value={inputs.nyCustodyConfig}
            onChange={(v) => setInputs({ nyCustodyConfig: v })}
            options={NY_CUSTODY_OPTIONS}
          />
        </SectionCard>
      )}

      {/* SP-3 inline error surfaces here, above add-ons */}
      {sp3Violation && (
        <Banner variant="red">
          <strong>Parenting time required.</strong> {SP3_TIE_ERROR_TEXT}
        </Banner>
      )}

      {/* Add-ons */}
      <SectionCard title="Add-ons (per party)">
        <AddOnsForParty
          partyKey="partyA"
          label="Party A"
          parentingErrorActive={sp3Violation}
        />
        <AddOnsForParty
          partyKey="partyB"
          label="Party B"
          parentingErrorActive={sp3Violation}
        />
      </SectionCard>

      {/* Full Worksheet net cascade — conditional */}
      {isFullWorksheet && (
        <SectionCard title="Full Worksheet — gross-to-net cascade">
          <FullWorksheetCascade />
        </SectionCard>
      )}

      <AdvancedSettings />
    </div>
  );
}
