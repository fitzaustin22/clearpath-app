'use client';

import { useState, useEffect, useMemo } from 'react';
import { useM5Store } from '@/src/stores/m5Store';
import { clearPrePopSource } from '@/src/stores/prePopulate';
import {
  Banner, PrePopBadge, SectionCard,
} from './_fields.jsx';
import { NAVY, MUTED, SOURCE } from '../_styles.js';
import WizardCheckbox from '@/src/components/wizard/WizardCheckbox';
import WizardSelector from '@/src/components/wizard/WizardSelector';
import WizardRadio from '@/src/components/wizard/WizardRadio';
import WizardDate from '@/src/components/wizard/WizardDate';
import NumericFieldBridge from '@/src/components/m5/wizard-bridge/NumericFieldBridge.jsx';

const HINT_BELOW = {
  fontFamily: SOURCE,
  fontSize: 13,
  color: MUTED,
  margin: '6px 0 0',
};

const STATE_OPTIONS = [
  { value: 'VA',    label: 'Virginia (VA)' },
  { value: 'MD',    label: 'Maryland (MD)' },
  { value: 'DC',    label: 'District of Columbia (DC)' },
  { value: 'NY',    label: 'New York (NY)' },
  { value: 'CA',    label: 'California (CA)' },
  { value: 'OTHER', label: 'Other state (national approximation)' },
];

const NY_CUSTODY_OPTIONS = [
  { value: 'kids_with_payor', label: 'With higher earner' },
  { value: 'kids_with_payee', label: 'With lower earner' },
  { value: 'shared',          label: 'Shared (~50/50)' },
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
      </div>

      {showPrePopBadge && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 2 }}>
          <PrePopBadge text="from M3 Pay Stub Decoder — review or override" />
        </div>
      )}
      <div style={{ marginBottom: 14 }}>
        <NumericFieldBridge
          label="Gross monthly income"
          field={`${partyKey}.grossMonthly`}
          value={party.grossMonthly}
          onChange={(_, num) => onGrossChange(num)}
          parser="currency"
          prefix="$"
          tooltip={
            isPartyA
              ? 'Pre-fills from M3 Pay Stub Decoder when available.'
              : 'Spouse income — typically sourced from discovery, financial affidavit, or W-2 disclosure.'
          }
          data-testid={`${partyKey}-gross`}
        />
      </div>

      <div style={{ marginBottom: 14 }}>
        <WizardCheckbox
          label="Impute earning capacity for this party"
          field={`${partyKey}.imputeIncome`}
          value={party.imputeIncome}
          onChange={(_, v) => {
            const next = { imputeIncome: v };
            if (!v) next.imputedEarningCapacity = null;
            updateParty(next);
          }}
          variant="toggle"
          tooltip="Imputed earning capacity is the income a party could reasonably earn — derived from prior earnings, vocational expert, or attorney guidance."
          data-testid={`${partyKey}-impute`}
        />
      </div>

      {party.imputeIncome && (
        <div style={{ marginBottom: 14 }}>
          <NumericFieldBridge
            label="Imputed earning capacity (monthly)"
            field={`${partyKey}.imputedEarningCapacity`}
            value={party.imputedEarningCapacity}
            onChange={(_, num) => updateParty({ imputedEarningCapacity: num })}
            parser="currency"
            prefix="$"
            tooltip="Used in place of actual gross at calc entry."
            data-testid={`${partyKey}-imputed`}
          />
        </div>
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
      <div style={{ marginBottom: 14 }}>
        <NumericFieldBridge
          label="Health insurance premium (monthly)"
          field={`${partyKey}.healthInsurance`}
          value={party.healthInsurance}
          onChange={(_, num) => update({ healthInsurance: num ?? 0 })}
          parser="currency"
          prefix="$"
          data-testid={`${partyKey}-hi`}
        />
      </div>
      <div style={{ marginBottom: 14 }}>
        <NumericFieldBridge
          label="Childcare cost (monthly)"
          field={`${partyKey}.childcare`}
          value={party.childcare}
          onChange={(_, num) => update({ childcare: num ?? 0 })}
          parser="currency"
          prefix="$"
          data-testid={`${partyKey}-childcare`}
        />
      </div>
      <div style={{ marginBottom: 14 }}>
        <NumericFieldBridge
          label="Parenting time"
          field={`${partyKey}.parentingTimeNights`}
          value={party.parentingTimeNights}
          onChange={(_, num) => {
            update({ parentingTimeNights: num == null ? 0 : Math.max(0, Math.min(365, num)) });
          }}
          parser="number"
          suffix="overnights/yr"
          tooltip="0–365. Total across both parties cannot exceed 365."
          error={nightsError}
          data-testid={`${partyKey}-nights`}
        />
      </div>
      <div style={{ marginBottom: 14 }}>
        <NumericFieldBridge
          label="Other support obligations (monthly)"
          field={`${partyKey}.otherSupportObligations`}
          value={party.otherSupportObligations}
          onChange={(_, num) => update({ otherSupportObligations: num ?? 0 })}
          parser="currency"
          prefix="$"
          tooltip="Existing child support or spousal support orders."
          data-testid={`${partyKey}-other-support`}
        />
      </div>
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
        <div style={{ marginBottom: 14 }}>
          <NumericFieldBridge
            label="Federal income tax (monthly)"
            field={`${partyKey}.fedTax`}
            value={cascade.fedTax}
            onChange={(_, num) => updateCascade({ fedTax: num ?? 0 })}
            parser="currency"
            prefix="$"
            data-testid={`${partyKey}-fed-tax`}
          />
        </div>
        <div style={{ marginBottom: 14 }}>
          <NumericFieldBridge
            label="State income tax (monthly)"
            field={`${partyKey}.stateTax`}
            value={cascade.stateTax}
            onChange={(_, num) => updateCascade({ stateTax: num ?? 0 })}
            parser="currency"
            prefix="$"
            data-testid={`${partyKey}-state-tax`}
          />
        </div>
        <div style={{ marginBottom: 14 }}>
          <NumericFieldBridge
            label="FICA — Social Security + Medicare (monthly)"
            field={`${partyKey}.fica`}
            value={cascade.fica}
            onChange={(_, num) => updateCascade({ fica: num ?? 0 })}
            parser="currency"
            prefix="$"
            tooltip="Baseline 7.65% of gross; override if alternative withholding applies."
            data-testid={`${partyKey}-fica`}
          />
        </div>
        <div style={{ marginBottom: 14 }}>
          <NumericFieldBridge
            label="Other mandatory deductions (monthly)"
            field={`${partyKey}.otherDeductions`}
            value={cascade.otherDeductions}
            onChange={(_, num) => updateCascade({ otherDeductions: num ?? 0 })}
            parser="currency"
            prefix="$"
            data-testid={`${partyKey}-other-deductions`}
          />
        </div>
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
          <WizardDate
            label="Case-effective date"
            field="caseEffectiveDate"
            value={inputs.caseEffectiveDate ? inputs.caseEffectiveDate.slice(0, 10) : ''}
            onChange={(_, v) => setInputs({ caseEffectiveDate: v || null })}
            data-testid="case-effective-date"
          />
          <p style={HINT_BELOW}>
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
        <div style={{ marginBottom: 14 }}>
          <WizardSelector
            label="State"
            field="state"
            value={inputs.state}
            onChange={(_, v) => setInputs({ state: v })}
            options={STATE_OPTIONS}
            data-testid="state"
          />
        </div>
        {isOther && (
          <Banner variant="amber">
            <strong>Your state may not be in our launch list.</strong> We'll use a national
            approximation for child support. Spousal support estimates are limited for
            non-launch states — most calculations will return $0 with a factor-test note.
          </Banner>
        )}

        <div style={{ marginBottom: 14 }}>
          <NumericFieldBridge
            label="Number of children"
            field="numChildren"
            value={inputs.numChildren}
            onChange={(_, num) => {
              setInputs({ numChildren: num == null ? 0 : Math.max(0, Math.min(10, num)) });
            }}
            parser="number"
            tooltip="Children of the marriage. 0–10."
            data-testid="num-children"
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <NumericFieldBridge
            label="Marriage length"
            field="marriageLengthYears"
            value={inputs.marriageLengthYears}
            onChange={(_, num) => setInputs({ marriageLengthYears: num })}
            parser="number"
            suffix="years"
            tooltip="Used by NY for spousal duration schedule and MD/DC for AAML duration."
            data-testid="marriage-length"
          />
        </div>

        <div style={{ marginBottom: 18 }}>
          <WizardRadio
            field="temporal"
            legend="Order type"
            variant="segmented"
            value={inputs.temporal}
            onChange={(_, v) => setInputs({ temporal: v })}
            options={TEMPORAL_OPTIONS}
            data-testid="temporal"
          />
        </div>

        <div style={{ marginBottom: 18 }}>
          <WizardRadio
            field="depth"
            legend="Calculation depth"
            variant="segmented"
            value={inputs.depth}
            onChange={(_, v) => setInputs({ depth: v })}
            options={DEPTH_OPTIONS}
            data-testid="depth"
          />
          <p style={HINT_BELOW}>Most CDFAs and attorneys prefer the Full Worksheet level of detail.</p>
        </div>
      </SectionCard>

      {/* NY custody — conditional */}
      {showNYCustody && (
        <SectionCard title="New York custody configuration">
          <div style={{ marginBottom: 18 }}>
            <WizardRadio
              field="nyCustodyConfig"
              legend="Where do the children primarily live?"
              variant="segmented"
              value={inputs.nyCustodyConfig}
              onChange={(_, v) => setInputs({ nyCustodyConfig: v })}
              options={NY_CUSTODY_OPTIONS}
              data-testid="ny-custody"
            />
            <p style={HINT_BELOW}>Drives Formula A vs Formula B branching.</p>
          </div>
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
