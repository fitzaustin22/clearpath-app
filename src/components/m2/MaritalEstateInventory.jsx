'use client';

import { useState, useEffect, useMemo, useRef, useId } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  Calendar,
  Check,
  ChevronDown,
  Home,
  Wallet,
  Landmark,
  Shield,
  TrendingUp,
  Briefcase,
  Building2,
  Car,
  Gem,
  MinusCircle,
  CreditCard,
} from 'lucide-react';
import { useM2Store } from '@/src/stores/m2Store';
import useBlueprintStore from '@/src/stores/blueprintStore';
import {
  ASSET_SECTIONS,
  LIABILITY_SECTIONS,
  ALL_SECTIONS,
  LIABILITY_KEYS,
  computeCategoryTotals,
} from '@/src/lib/m2Sections';
import { buildAssetInventoryPayload } from '@/src/lib/blueprintM2Payload';
import { T, ALLOC } from '@/src/lib/brand/tokens';
import {
  itemNetValue,
  intentAlloc,
  titleholderForAlloc,
  allocOneSided,
  splitFromCategoryTotals,
} from '@/src/lib/m2/estateRollup';
import SplitBar from '@/src/components/wizard/SplitBar';
import AllocControl from '@/src/components/wizard/AllocControl';
import StepChapters from '@/src/components/wizard/StepChapters';
import GuidedStepperRail from '@/src/components/wizard/GuidedStepperRail';
import GuidedFooterNav from '@/src/components/wizard/GuidedFooterNav';
import PrefillBadge from '@/src/components/wizard/PrefillBadge';

const PLAYFAIR = "var(--font-playfair), 'Playfair Display', Georgia, serif";
const STEP_KEY = 'mei-guided-step';

// ─── Category metadata: Lucide icon + the "Guided Path" intro copy ───────────
// (DirectionB STEP_INTRO, keyed to the store's section keys). Verbatim except
// the retirement + pension intros, whose original copy asserted prefill "from"
// M3/M5 — but the real data flow is M2 → M3/M5 (M2 is the source; there is no
// inbound prefill), so those two clauses were reworded to invite entry instead
// of promising a carry-over we don't perform.
const CATEGORY_META = {
  realEstate: { Icon: Home, intro: "Let's start with property — often the biggest, most emotional asset. Your home counts here at its net equity." },
  workingCapital: { Icon: Wallet, intro: 'Cash you can reach: checking, savings, and any taxable investment accounts.' },
  retirement: { Icon: Landmark, intro: 'Retirement accounts are usually marital to the extent they grew during the marriage. Add each account and its current balance — your most recent statements will have the figures.' },
  pensions: { Icon: Shield, intro: 'Pensions are easy to undervalue. Enter the present value of the marital share — your QDRO work is the best place to find that figure.' },
  stockOptions: { Icon: TrendingUp, intro: 'Equity comp can vest over years. Add what you know — vesting details can come later.' },
  corporateIncentives: { Icon: Briefcase, intro: 'Deferred comp, bonuses, or carried interest. Skip if none apply.' },
  businessInterests: { Icon: Building2, intro: 'A privately-held business interest. A rough estimate is fine for now.' },
  otherAssets: { Icon: Car, intro: 'Vehicles, collectibles, and anything else of value that doesn’t fit above.' },
  personalProperty: { Icon: Gem, intro: 'Furnishings, jewelry, and household goods. A lump estimate is okay to start.' },
  loans: { Icon: MinusCircle, intro: 'Money you owe that’s secured or borrowed — HELOCs, personal and auto loans.' },
  creditCards: { Icon: CreditCard, intro: 'Revolving balances. Note whose name each card is in.' },
  otherDebt: { Icon: MinusCircle, intro: 'Anything else owed — taxes, judgments, medical debt.' },
};

// Store classification → guided-path pill label.
const CLASSIFICATION_LABELS = {
  marital: 'Marital',
  separate: 'Separate',
  commingled: 'Mixed',
  disputed: 'Disputed',
  unknown: 'Unclassified',
};
const CLASSIFICATION_CHOICES = [
  { value: 'marital', label: 'Marital' },
  { value: 'separate', label: 'Separate' },
  { value: 'commingled', label: 'Mixed' },
  { value: 'disputed', label: 'Disputed' },
  { value: 'unknown', label: 'Unclassified' },
];

// ─── Formatters ───────────────────────────────────────────────────────────────
function formatMoney(n) {
  const v = Math.round(Number(n) || 0);
  const s = '$' + Math.abs(v).toLocaleString('en-US');
  return v < 0 ? '−' + s : s; // U+2212 minus for negative net
}
function formatMarriageDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}
function allocStatus(alloc) {
  if (alloc === 'you') return 'Goes to you';
  if (alloc === 'spouse') return 'Goes to your spouse';
  if (alloc === 'split') return 'Divided equally';
  return 'Not decided yet';
}

// ─── Classification rationale (Navigator hover) ───────────────────────────────
function getRationale(item) {
  if (!item.classification || item.classification === 'unknown') {
    return 'Cannot classify: marriage date or acquisition date not provided.';
  }
  if (item.classification === 'marital') {
    return 'Classified as marital: acquired during marriage with marital funds.';
  }
  if (item.classification === 'separate') {
    if (item.sourceOfPayment === 'gift') return 'Classified as separate: acquired as a gift and kept in your name.';
    if (item.sourceOfPayment === 'inheritance') return 'Classified as separate: acquired as an inheritance and kept in your name.';
    return 'Classified as separate: acquired before marriage and titled in your name.';
  }
  if (item.classification === 'commingled') {
    if (item.sourceOfPayment === 'mixed') return 'Flagged as commingled: funded with a mix of marital and separate funds.';
    if (item.sourceOfPayment === 'gift') return 'Flagged as commingled: gift deposited into a joint account.';
    if (item.sourceOfPayment === 'inheritance') return 'Flagged as commingled: inheritance deposited into a joint account.';
    return 'Flagged as commingled: acquired before marriage but retitled to joint names.';
  }
  if (item.classification === 'disputed') {
    return 'Marked as disputed. This item is excluded from You and Spouse totals.';
  }
  return '';
}
function getCommingledPrompt(item) {
  if (item.sourceOfPayment === 'mixed') {
    return "When marital and separate funds are mixed together — for example, using salary to pay down a pre-marital mortgage — the asset may be partly marital and partly separate. This is called commingling, and it's one of the most common complications in property division.";
  }
  if ((item.sourceOfPayment === 'gift' || item.sourceOfPayment === 'inheritance') && item.titleholder === 'joint') {
    return 'Gifts and inheritances are generally separate property — but depositing them into a joint account can convert them to marital property. The key question is whether the funds can still be traced.';
  }
  return "When separate property is retitled into joint names, many states treat that as a 'presumptive gift' to the marriage — meaning it may become marital property. Your attorney can clarify how your state handles this.";
}
function isPreMarital(item, marriageDate) {
  if (!marriageDate || !item.dateAcquired) return false;
  return new Date(item.dateAcquired) < new Date(marriageDate);
}
function showAppreciationWarning(item, marriageDate) {
  if (!isPreMarital(item, marriageDate)) return false;
  if (item.costBasis == null || item.costBasis === '') return false;
  const cv = Number(item.currentValue);
  const cb = Number(item.costBasis);
  if (!Number.isFinite(cv) || !Number.isFinite(cb)) return false;
  return cv > cb;
}
function genId(category) {
  return `${category}-${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36).padStart(2, '0')}`;
}

// ─── Field primitives (reskinned to brand tokens) ─────────────────────────────
const inputStyle = (focused) => ({
  width: '100%',
  height: 38,
  boxSizing: 'border-box',
  borderRadius: 7,
  border: `1px solid ${focused ? T.GOLD : T.LINE_STRONG}`,
  outline: focused ? `3px solid ${T.GOLD_FOCUS_RING}` : 'none',
  padding: '0 12px',
  fontSize: 14,
  color: T.INK,
  background: T.CARD,
  fontFamily: T.FONT_BODY,
  fontVariantNumeric: 'tabular-nums',
  transition: 'border-color 120ms ease',
});

function Field({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: T.INK, fontFamily: T.FONT_BODY }}>{label}</span>
      {children}
    </label>
  );
}

function TextInput({ value, onCommit, multiline }) {
  const [local, setLocal] = useState(value ?? '');
  const [focused, setFocused] = useState(false);
  const initialRef = useRef(value ?? '');
  useEffect(() => {
    if (value !== initialRef.current) {
      initialRef.current = value ?? '';
      setLocal(value ?? '');
    }
  }, [value]);
  const commit = () => {
    setFocused(false);
    if (local !== initialRef.current) {
      initialRef.current = local;
      onCommit(local);
    }
  };
  if (multiline) {
    return (
      <textarea
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={commit}
        rows={2}
        style={{ ...inputStyle(focused), height: 'auto', minHeight: 64, padding: '8px 12px', resize: 'vertical' }}
      />
    );
  }
  return (
    <input
      type="text"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={commit}
      style={inputStyle(focused)}
    />
  );
}

function CurrencyInput({ value, onCommit, allowNull = false }) {
  const emptyDisplay = allowNull ? '' : '0';
  const initial = value == null || value === '' ? emptyDisplay : String(value);
  const [local, setLocal] = useState(initial);
  const [focused, setFocused] = useState(false);
  const initialRef = useRef(initial);
  useEffect(() => {
    const next = value == null || value === '' ? emptyDisplay : String(value);
    if (next !== initialRef.current) {
      initialRef.current = next;
      setLocal(next);
    }
  }, [value, emptyDisplay]);
  const handleBlur = () => {
    setFocused(false);
    const stripped = local.replace(/[$,]/g, '').trim();
    if (stripped === '') {
      initialRef.current = emptyDisplay;
      setLocal(emptyDisplay);
      onCommit(allowNull ? null : 0);
      return;
    }
    const num = Number(stripped);
    if (!Number.isFinite(num)) {
      setLocal(initialRef.current);
      return;
    }
    const nextStr = String(num);
    initialRef.current = nextStr;
    setLocal(nextStr);
    onCommit(num);
  };
  const display = focused
    ? local
    : local === '' || local == null
    ? ''
    : (() => {
        const n = Number(local);
        return Number.isFinite(n) ? '$' + Math.round(n).toLocaleString('en-US') : local;
      })();
  return (
    <input
      type="text"
      inputMode="decimal"
      value={display}
      onFocus={() => setFocused(true)}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={handleBlur}
      placeholder={allowNull ? 'Optional' : '$0'}
      style={inputStyle(focused)}
    />
  );
}

function SelectField({ value, onChange, children }) {
  const [focused, setFocused] = useState(false);
  return (
    <select
      value={value}
      onChange={onChange}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{ ...inputStyle(focused), appearance: 'auto' }}
    >
      {children}
    </select>
  );
}

// DEF-9 unvested equity-comp stub form (verbatim flow, reskinned).
function DeferredCompStubForm({ category, initialCompany, initialGrantDate, onSave }) {
  const [company, setCompany] = useState(initialCompany || '');
  const [grantDate, setGrantDate] = useState(initialGrantDate || '');
  const [sharesGranted, setSharesGranted] = useState('');
  const [vestingSchedule, setVestingSchedule] = useState('');
  const [strikePrice, setStrikePrice] = useState('');
  const [errors, setErrors] = useState({});
  const isStockOptions = category === 'stockOptions';
  const handleSave = () => {
    const nextErrors = {};
    if (!company.trim()) nextErrors.company = 'Required.';
    const sharesNum = Number(sharesGranted);
    if (sharesGranted === '' || !Number.isFinite(sharesNum) || sharesNum < 0) {
      nextErrors.sharesGranted = 'Enter 0 or a positive number.';
    }
    let strikeNum = null;
    if (isStockOptions) {
      const stripped = String(strikePrice).replace(/[$,]/g, '').trim();
      strikeNum = Number(stripped);
      if (stripped === '' || !Number.isFinite(strikeNum)) nextErrors.strikePrice = 'Required for stock options.';
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    onSave({
      company: company.trim(),
      grantDate: grantDate || null,
      sharesGranted: sharesNum,
      vestingSchedule: vestingSchedule.trim(),
      strikePrice: isStockOptions ? strikeNum : null,
    });
  };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
      <Field label="Company">
        <input type="text" value={company} onChange={(e) => { setCompany(e.target.value); if (errors.company) setErrors((p) => ({ ...p, company: undefined })); }} style={inputStyle(false)} />
        {errors.company && <span style={{ fontSize: 12, color: T.RED }}>{errors.company}</span>}
      </Field>
      <Field label="Grant date">
        <input type="date" value={grantDate} onChange={(e) => setGrantDate(e.target.value)} style={inputStyle(false)} />
      </Field>
      <Field label="Shares granted">
        <input type="number" min="0" inputMode="numeric" value={sharesGranted} onChange={(e) => { setSharesGranted(e.target.value); if (errors.sharesGranted) setErrors((p) => ({ ...p, sharesGranted: undefined })); }} style={inputStyle(false)} />
        {errors.sharesGranted && <span style={{ fontSize: 12, color: T.RED }}>{errors.sharesGranted}</span>}
      </Field>
      {isStockOptions && (
        <Field label="Strike price">
          <input type="text" inputMode="decimal" value={strikePrice} onChange={(e) => { setStrikePrice(e.target.value); if (errors.strikePrice) setErrors((p) => ({ ...p, strikePrice: undefined })); }} placeholder="$0.00" style={inputStyle(false)} />
          {errors.strikePrice && <span style={{ fontSize: 12, color: T.RED }}>{errors.strikePrice}</span>}
        </Field>
      )}
      <Field label="Vesting schedule">
        <textarea value={vestingSchedule} onChange={(e) => setVestingSchedule(e.target.value)} rows={2} placeholder="e.g., 4-year graded, 25%/year" style={{ ...inputStyle(false), height: 'auto', minHeight: 60, padding: '8px 12px', resize: 'vertical' }} />
      </Field>
      <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" onClick={handleSave} style={{ background: T.GOLD, border: 'none', color: T.NAVY, padding: '10px 20px', borderRadius: 8, fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: T.FONT_BODY }}>
          Save as deferred-comp placeholder →
        </button>
      </div>
    </div>
  );
}

// ─── Item card: design-forward header + progressive detail editor ─────────────
function ItemCard({ item, section, expanded, onToggleExpand, onUpdate, onRemove, onAlloc, onConvertDeferredComp, isNavigator, marriageDate }) {
  const [classifyOpen, setClassifyOpen] = useState(false);
  const [rationaleOpen, setRationaleOpen] = useState(false);
  const rationaleId = useId();
  const isLiab = !!section.isLiability;
  const isCreditCard = section.key === 'creditCards';
  const isEquityComp = section.key === 'stockOptions' || section.key === 'corporateIncentives';
  const isVested = !isEquityComp || item.vested !== false;
  const hideAssetOnlyFields = isLiab || (isEquityComp && !isVested);

  const intent = intentAlloc(item);
  const oneSided = allocOneSided(intent);
  const net = itemNetValue(item);
  const classLabel = CLASSIFICATION_LABELS[item.classification] || CLASSIFICATION_LABELS.unknown;
  const isGatedOut = item.classification === 'disputed' || item.classification === 'unknown';

  useEffect(() => {
    if (!classifyOpen) return;
    const close = () => setClassifyOpen(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [classifyOpen]);

  return (
    <div style={{ background: T.CARD, border: `1px solid ${T.LINE}`, borderRadius: 12, padding: '20px 22px', boxShadow: T.SHADOW_CARD }}>
      {/* Header: name + classification pill + provenance, and the value */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: T.INK, fontFamily: T.FONT_BODY }}>
              {item.description || <span style={{ color: T.MUTED }}>(untitled)</span>}
            </span>
            <span style={{ position: 'relative', display: 'inline-flex' }}>
              <button
                type="button"
                aria-label={`Classification: ${classLabel}. Activate to change.`}
                aria-haspopup="true"
                aria-expanded={classifyOpen}
                aria-describedby={isNavigator && rationaleOpen ? rationaleId : undefined}
                onClick={(e) => { e.stopPropagation(); setClassifyOpen((v) => !v); }}
                onMouseEnter={() => isNavigator && setRationaleOpen(true)}
                onMouseLeave={() => setRationaleOpen(false)}
                onFocus={() => isNavigator && setRationaleOpen(true)}
                onBlur={() => setRationaleOpen(false)}
                style={{ fontSize: 11.5, fontWeight: 600, color: isGatedOut ? T.MUTED : T.INK, background: T.PARCHMENT_DEEP, border: 'none', borderRadius: 999, padding: '3px 11px', cursor: 'pointer', fontFamily: T.FONT_BODY }}
              >
                {classLabel}
              </button>
              {isNavigator && rationaleOpen && !classifyOpen && (
                <span id={rationaleId} role="tooltip" style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, width: 240, background: T.NAVY, color: '#FFFFFF', fontSize: 11.5, lineHeight: 1.45, padding: '8px 11px', borderRadius: 6, boxShadow: T.SHADOW_TOOLTIP, zIndex: 40, fontFamily: T.FONT_BODY }}>
                  {getRationale(item)}
                </span>
              )}
              {classifyOpen && (
                <span role="group" aria-label="Set classification" onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, background: T.CARD, border: `1px solid ${T.LINE_STRONG}`, borderRadius: 8, boxShadow: T.SHADOW_TOOLTIP, zIndex: 50, minWidth: 150, overflow: 'hidden' }}>
                  {CLASSIFICATION_CHOICES.map((c) => (
                    <button key={c.value} type="button" aria-pressed={item.classification === c.value} onClick={() => { onUpdate(item.id, { classification: c.value }); setClassifyOpen(false); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', background: item.classification === c.value ? T.GOLD_TINT_SUBTLE : 'none', border: 'none', fontSize: 13.5, color: T.INK, cursor: 'pointer', fontFamily: T.FONT_BODY }}>
                      {c.label}
                    </button>
                  ))}
                </span>
              )}
            </span>
            {item.from && <PrefillBadge from={item.from} />}
          </div>
          {isGatedOut && (
            <div style={{ fontSize: 12.5, color: T.MUTED, marginTop: 4, fontFamily: T.FONT_BODY }}>
              {item.classification === 'disputed'
                ? 'Disputed — not yet counted in your totals.'
                : 'Add a date so we can classify this and count it in your totals.'}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: T.MUTED, fontFamily: T.FONT_BODY, marginBottom: 2 }}>
            {isLiab ? 'Balance' : 'Value'}
          </div>
          <div style={{ fontFamily: T.FONT_NUMERIC, fontSize: 23, fontWeight: 700, color: T.NAVY, fontVariantNumeric: 'tabular-nums' }}>{formatMoney(net)}</div>
        </div>
      </div>

      {/* Allocation block */}
      <div style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: T.INK, fontFamily: T.FONT_BODY }}>Who keeps it?</span>
          <span style={{ fontSize: 12, color: T.MUTED, fontFamily: T.FONT_BODY }}>{allocStatus(intent)}</span>
        </div>
        <SplitBar you={oneSided.you} spouse={oneSided.spouse} unalloc={oneSided.unalloc} height={14} radius={8} />
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <AllocControl value={intent} onChange={(a) => onAlloc(item.id, a)} />
          <button
            type="button"
            onClick={() => onToggleExpand(item.id)}
            aria-expanded={expanded}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: T.INK_2, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: T.FONT_BODY, padding: '6px 2px' }}
          >
            {expanded ? 'Hide details' : 'Details'}
            <ChevronDown size={15} strokeWidth={2} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s ease' }} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Progressive detail editor */}
      {expanded && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${T.LINE}` }}>
          {isEquityComp && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.INK, marginBottom: 8, fontFamily: T.FONT_BODY }}>Vesting / exercise status</div>
              <div role="group" aria-label="Vesting status" style={{ display: 'inline-flex', border: `1px solid ${T.GOLD}`, borderRadius: 8, overflow: 'hidden' }}>
                <button type="button" onClick={() => onUpdate(item.id, { vested: true })} aria-pressed={isVested} style={{ fontFamily: T.FONT_BODY, fontSize: 13, fontWeight: isVested ? 700 : 500, color: isVested ? T.NAVY : T.INK_2, background: isVested ? T.GOLD : 'transparent', border: 'none', padding: '7px 14px', cursor: 'pointer' }}>Vested / exercised</button>
                <button type="button" onClick={() => onUpdate(item.id, { vested: false, currentValue: 0, costBasis: null })} aria-pressed={!isVested} style={{ fontFamily: T.FONT_BODY, fontSize: 13, fontWeight: !isVested ? 700 : 500, color: !isVested ? T.NAVY : T.INK_2, background: !isVested ? T.GOLD : 'transparent', border: 'none', padding: '7px 14px', cursor: 'pointer' }}>Unvested</button>
              </div>
              {!isVested && (
                <p style={{ marginTop: 12, fontSize: 13, color: T.INK_2, lineHeight: 1.5, fontFamily: T.FONT_BODY }}>
                  This grant has no current value to divide today. Fill in the identifying fields and save it as a deferred-comp placeholder so it appears in your Blueprint as <em>pending</em> — without inflating today’s total.
                </p>
              )}
            </div>
          )}

          {isEquityComp && !isVested ? (
            <DeferredCompStubForm category={item.category} initialCompany={item.description || ''} initialGrantDate={item.dateAcquired || ''} onSave={(stub) => onConvertDeferredComp(item, stub)} />
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
                <Field label={isCreditCard ? 'Creditor name' : 'Description'}>
                  <TextInput value={item.description || ''} onCommit={(v) => onUpdate(item.id, { description: v })} />
                </Field>
                <Field label={isCreditCard || isLiab ? 'Outstanding balance' : 'Current value'}>
                  <CurrencyInput value={item.currentValue} onCommit={(v) => onUpdate(item.id, { currentValue: v })} />
                </Field>
                {!hideAssetOnlyFields && (
                  <Field label="Loan against this asset">
                    <CurrencyInput value={item.outstandingBalance} onCommit={(v) => onUpdate(item.id, { outstandingBalance: v })} allowNull />
                  </Field>
                )}
                {!hideAssetOnlyFields && (
                  <Field label="Cost basis (original price)">
                    <CurrencyInput value={item.costBasis} onCommit={(v) => onUpdate(item.id, { costBasis: v })} allowNull />
                  </Field>
                )}
                <Field label="Date acquired">
                  <input type="date" value={item.dateAcquired || ''} onChange={(e) => onUpdate(item.id, { dateAcquired: e.target.value || null })} style={inputStyle(false)} />
                </Field>
                {!hideAssetOnlyFields && (
                  <Field label="Source of payment">
                    <SelectField value={item.sourceOfPayment || ''} onChange={(e) => onUpdate(item.id, { sourceOfPayment: e.target.value || null })}>
                      <option value="">(not specified)</option>
                      <option value="marital-funds">Marital funds</option>
                      <option value="separate-funds">Separate funds</option>
                      <option value="mixed">Mixed marital and separate</option>
                      <option value="gift">Gift</option>
                      <option value="inheritance">Inheritance</option>
                      <option value="unknown">Unknown</option>
                    </SelectField>
                  </Field>
                )}
                <Field label="Notes">
                  <TextInput value={item.notes || ''} onCommit={(v) => onUpdate(item.id, { notes: v })} multiline />
                </Field>
              </div>

              {isNavigator && showAppreciationWarning(item, marriageDate) && (
                <div style={{ marginTop: 14, padding: '10px 14px', background: T.AMBER_BG, borderLeft: `3px solid ${T.AMBER}`, borderRadius: 6, fontSize: 13, color: T.INK, lineHeight: 1.5, fontFamily: T.FONT_BODY }}>
                  Even when an asset stays in your name alone, the increase in value during the marriage may be considered marital property in some states. The original value is separate; the growth is the question.
                </div>
              )}
              {isNavigator && item.classification === 'commingled' && (
                <div style={{ marginTop: 14, padding: '10px 14px', background: T.AMBER_BG, borderLeft: `3px solid ${T.AMBER}`, borderRadius: 6, fontSize: 13, color: T.INK, lineHeight: 1.5, fontFamily: T.FONT_BODY }}>
                  {getCommingledPrompt(item)}
                </div>
              )}

              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button type="button" onClick={() => onRemove(item.id)} style={{ background: 'none', border: `1px solid ${T.LINE_STRONG}`, color: T.INK_2, padding: '7px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: T.FONT_BODY }}>Remove</button>
                <button type="button" onClick={() => onToggleExpand(item.id)} style={{ background: T.GOLD, border: 'none', color: T.NAVY, padding: '8px 20px', borderRadius: 8, fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: T.FONT_BODY }}>Done</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Marriage-date bar (writes the same classification field, ISO date) ───────
function CompactMarriageBar({ marriageDate, onSet }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState('');
  const [focused, setFocused] = useState(false);
  if (marriageDate) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: T.GOLD_TINT, border: `1px solid ${T.GOLD_BORDER}`, borderRadius: 10, padding: '10px 16px', flexWrap: 'wrap' }}>
        <Check size={15} strokeWidth={2} color={T.PILL_TEXT} aria-hidden="true" />
        <span style={{ fontSize: 13, color: T.INK, fontFamily: T.FONT_BODY }}>
          Married <strong style={{ fontWeight: 600 }}>{formatMarriageDate(marriageDate)}</strong> — marital vs. separate classification is on.
        </span>
        {!editing && (
          <button type="button" onClick={() => { setVal(marriageDate); setEditing(true); }} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: T.INK_2, fontSize: 12.5, fontWeight: 600, textDecoration: 'underline', cursor: 'pointer', fontFamily: T.FONT_BODY }}>Edit</button>
        )}
        {editing && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
            <input type="date" autoFocus value={val} onChange={(e) => setVal(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={{ ...inputStyle(focused), width: 160, height: 34 }} aria-label="Marriage date" />
            <button type="button" onClick={() => { if (val) { onSet(val); setEditing(false); } }} style={{ height: 34, padding: '0 14px', background: T.NAVY, color: '#FFFFFF', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: T.FONT_BODY }}>Save</button>
          </span>
        )}
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', background: T.CARD, border: `1px solid ${T.LINE}`, borderLeft: `3px solid ${T.AMBER}`, borderRadius: 10, padding: '10px 14px 10px 16px', boxShadow: T.SHADOW_CARD }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <Calendar size={16} strokeWidth={2} color={T.AMBER} style={{ flexShrink: 0 }} aria-hidden="true" />
        <span style={{ fontSize: 13, color: T.INK, fontFamily: T.FONT_BODY }}>
          Set your <strong style={{ fontWeight: 600 }}>marriage date</strong> to turn on automatic marital-vs-separate classification.
        </span>
      </div>
      {editing ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <input type="date" autoFocus value={val} onChange={(e) => setVal(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={{ ...inputStyle(focused), width: 160, height: 34 }} aria-label="Marriage date" />
          <button type="button" onClick={() => { if (val) { onSet(val); setEditing(false); } }} style={{ height: 34, padding: '0 14px', background: T.NAVY, color: '#FFFFFF', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: T.FONT_BODY }}>Save</button>
        </span>
      ) : (
        <button type="button" onClick={() => setEditing(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 34, padding: '0 16px', background: 'transparent', color: T.NAVY, border: `1px solid ${T.LINE_STRONG}`, borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: T.FONT_BODY }}>
          Add marriage date
        </button>
      )}
    </div>
  );
}

// ─── Review step ──────────────────────────────────────────────────────────────
function ReviewStage({ categoryTotals, adjustedSummary, onJump }) {
  const s = adjustedSummary;
  const rows = ALL_SECTIONS.map((sec) => ({
    key: sec.key,
    label: sec.label,
    isLiability: !!sec.isLiability,
    Icon: (CATEGORY_META[sec.key] || {}).Icon,
    split: splitFromCategoryTotals(categoryTotals[sec.key]),
  })).filter((r) => r.split.total > 0);

  const hasAllocated = s.clientNetEstate !== 0 || s.spouseNetEstate !== 0;
  const youPct = hasAllocated ? Math.round(s.clientPercentage) : 0;
  const spousePct = hasAllocated ? Math.round(s.spousePercentage) : 0;
  const unalloc = (s.unallocatedAssets || 0) - (s.unallocatedLiabilities || 0);

  return (
    <div>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: T.PILL_TEXT, fontFamily: T.FONT_BODY }}>The full picture</span>
      <h2 style={{ margin: '6px 0 8px', fontFamily: PLAYFAIR, fontWeight: 700, fontSize: 32, color: T.NAVY, lineHeight: 1.08, letterSpacing: '-.01em' }}>Your estate, divided</h2>
      <p style={{ margin: '0 0 22px', fontFamily: T.FONT_BODY, fontSize: 15.5, lineHeight: 1.6, color: T.INK_2, maxWidth: 560 }}>Here’s where things stand today. Each bar shows how that category splits — tap any to revisit it.</p>

      {rows.length > 0 ? (
        <div style={{ background: T.CARD, border: `1px solid ${T.LINE}`, borderRadius: 14, boxShadow: T.SHADOW_CARD, padding: 8 }}>
          {rows.map((r) => {
            const Icon = r.Icon;
            return (
              <button key={r.key} type="button" onClick={() => onJump(r.key)} style={{ width: '100%', display: 'block', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 16, borderRadius: 10 }}
                onMouseEnter={(e) => (e.currentTarget.style.background = T.GOLD_TINT_SUBTLE)} onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 10 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 14.5, fontWeight: 600, color: T.INK, fontFamily: T.FONT_BODY }}>
                    {Icon && <Icon size={16} strokeWidth={2} color={T.INK_2} aria-hidden="true" />}
                    {r.label}
                    {r.isLiability && <span style={{ fontSize: 11, color: T.RED, fontWeight: 600 }}>debt</span>}
                  </span>
                  <span style={{ fontFamily: T.FONT_NUMERIC, fontSize: 16, fontWeight: 700, color: T.NAVY, fontVariantNumeric: 'tabular-nums' }}>{formatMoney(r.split.total)}</span>
                </div>
                <SplitBar you={r.split.you} spouse={r.split.spouse} unalloc={r.split.unalloc} height={12} radius={7} />
              </button>
            );
          })}
        </div>
      ) : (
        <div style={{ background: T.CARD, border: `1.5px dashed ${T.LINE_STRONG}`, borderRadius: 14, padding: '30px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: T.INK, fontFamily: T.FONT_BODY }}>Nothing here yet</div>
          <div style={{ fontSize: 13.5, color: T.MUTED, marginTop: 4, fontFamily: T.FONT_BODY }}>Add a few assets or debts in the earlier steps and your divided estate will appear here.</div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 18 }}>
        <div style={{ background: ALLOC.YOU_SOFT, border: `1px solid ${T.GOLD_BORDER}`, borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: T.PILL_TEXT, fontFamily: T.FONT_BODY }}>You keep (net)</div>
          <div style={{ fontFamily: T.FONT_NUMERIC, fontSize: 30, fontWeight: 700, color: T.NAVY, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{formatMoney(s.clientNetEstate)}</div>
          <div style={{ fontSize: 13, color: T.INK_2, marginTop: 2, fontFamily: T.FONT_BODY }}>{youPct}% of what’s been allocated</div>
        </div>
        <div style={{ background: ALLOC.SPOUSE_SOFT, border: `1px solid ${T.NAVY_12}`, borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: T.INK_2, fontFamily: T.FONT_BODY }}>Spouse keeps (net)</div>
          <div style={{ fontFamily: T.FONT_NUMERIC, fontSize: 30, fontWeight: 700, color: T.NAVY, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{formatMoney(s.spouseNetEstate)}</div>
          <div style={{ fontSize: 13, color: T.INK_2, marginTop: 2, fontFamily: T.FONT_BODY }}>{spousePct}% of what’s been allocated</div>
        </div>
      </div>

      {unalloc > 0 && (
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 12, background: T.CARD, border: `1px solid ${T.LINE}`, borderRadius: 12, padding: '14px 18px' }}>
          <span style={{ width: 30, height: 30, borderRadius: 8, background: ALLOC.HATCH, flexShrink: 0 }} aria-hidden="true" />
          <div style={{ flexGrow: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: T.INK, fontFamily: T.FONT_BODY }}>{formatMoney(unalloc)} still to divide</div>
            <div style={{ fontSize: 12.5, color: T.MUTED, fontFamily: T.FONT_BODY }}>Assign “Who keeps it?” on the unassigned items — or classify the ones still pending — to place them.</div>
          </div>
        </div>
      )}
    </div>
  );
}

// Personal Property is its own dedicated tool; the step links out and reflects
// the running total that flows back into the estate summary.
function PersonalPropertyStep({ summary, started }) {
  const pp = summary || {};
  const total = Number(pp.totalValue) || 0;
  const count = Number(pp.totalItems) || 0;
  const hasStarted = !!started;
  return (
    <div>
      <div style={{ background: T.CARD, border: `1px solid ${T.LINE}`, borderRadius: 12, boxShadow: T.SHADOW_CARD, padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: T.MUTED, fontFamily: T.FONT_BODY, marginBottom: 2 }}>Personal property</div>
          <div style={{ fontFamily: T.FONT_NUMERIC, fontSize: 23, fontWeight: 700, color: T.NAVY, fontVariantNumeric: 'tabular-nums' }}>
            {formatMoney(total)} <span style={{ fontSize: 13, fontWeight: 400, color: T.MUTED, fontFamily: T.FONT_BODY }}>{hasStarted ? `· ${count} ${count === 1 ? 'item' : 'items'}` : '· not yet inventoried'}</span>
          </div>
        </div>
        <Link href="/modules/m2/personal-property" style={{ display: 'inline-flex', alignItems: 'center', height: 38, padding: '0 18px', background: 'transparent', color: T.NAVY, border: `1px solid ${T.LINE_STRONG}`, borderRadius: 8, fontWeight: 600, fontSize: 13, textDecoration: 'none', fontFamily: T.FONT_BODY }}>
          {hasStarted ? 'View / edit inventory →' : 'Start room-by-room →'}
        </Link>
      </div>
      {hasStarted && pp.appraisalRecommended && (
        <div style={{ marginTop: 12, padding: '10px 14px', background: T.AMBER_BG, borderLeft: `3px solid ${T.AMBER}`, borderRadius: 6, fontSize: 13, color: T.INK, lineHeight: 1.5, fontFamily: T.FONT_BODY }}>
          One or more high-value items may need a professional appraisal. Review flagged items in the Personal Property Inventory.
        </div>
      )}
    </div>
  );
}

// ─── Breadcrumb (hover → navy text + navy-38 underline, per spec §1) ──────────
function Breadcrumb() {
  const [hover, setHover] = useState(false);
  return (
    <Link
      href="/modules/m2"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: hover ? T.NAVY : T.INK_2, textDecoration: 'none', fontSize: 13.5, fontWeight: 500, fontFamily: T.FONT_BODY }}
    >
      <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
      <span style={{ borderBottom: `1px solid ${hover ? T.NAVY_38 : 'transparent'}` }}>Know What You Own</span>
    </Link>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Orchestrator
// ═══════════════════════════════════════════════════════════════════════════════
export default function MaritalEstateInventory({ userTier = 'essentials' }) {
  const router = useRouter();
  const maritalEstateInventory = useM2Store((s) => s.maritalEstateInventory);
  const addInventoryItem = useM2Store((s) => s.addInventoryItem);
  const updateInventoryItem = useM2Store((s) => s.updateInventoryItem);
  const removeInventoryItem = useM2Store((s) => s.removeInventoryItem);
  const setMarriageDateAction = useM2Store((s) => s.setMarriageDate);
  const resetMaritalEstateInventory = useM2Store((s) => s.resetMaritalEstateInventory);
  const personalPropertySummary = useM2Store((s) => s.personalPropertyInventory.summary);
  const personalPropertyStarted = useM2Store((s) => s.personalPropertyInventory.startedAt);
  const personalPropertyRooms = useM2Store((s) => s.personalPropertyInventory.rooms);
  const checklistItems = useM2Store((s) => s.documentChecklist.items);

  const { marriageDate, items, completenessScore } = maritalEstateInventory;
  const summary = maritalEstateInventory.summary;
  const autoClassify = userTier !== 'essentials';
  const isNavigator = userTier === 'navigator' || userTier === 'signature';
  const isEssentials = userTier === 'essentials';

  const steps = useMemo(
    () => [...ALL_SECTIONS.map((sec) => ({ ...sec, review: false })), { key: '__review', label: 'Review & divide', review: true, isLiability: false }],
    []
  );
  const assetCount = ASSET_SECTIONS.length;
  const liabilityCount = LIABILITY_SECTIONS.length;

  const [currentStep, setCurrentStep] = useState(0);
  const [expandedItemId, setExpandedItemId] = useState(null);

  // Current step survives reload. Mount-only localStorage restore — the inline
  // set-state-in-effect suppression follows the M3 mount-hydration precedent.
  useEffect(() => {
    const saved = parseInt(window.localStorage.getItem(STEP_KEY) || '', 10);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!Number.isNaN(saved)) setCurrentStep(Math.max(0, Math.min(steps.length - 1, saved)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    window.localStorage.setItem(STEP_KEY, String(currentStep));
  }, [currentStep]);

  // ── Derived data (identical division math to the persisted summary) ──────────
  const itemsBySection = useMemo(() => {
    const grouped = {};
    for (const section of ALL_SECTIONS) grouped[section.key] = [];
    for (const item of items) if (grouped[item.category]) grouped[item.category].push(item);
    return grouped;
  }, [items]);

  const categoryTotals = useMemo(() => {
    const base = computeCategoryTotals(items);
    const pp = personalPropertySummary || {};
    base.personalProperty = {
      total: Number(pp.totalValue) || 0,
      client: Number(pp.clientValue) || 0,
      spouse: Number(pp.spouseValue) || 0,
      unallocated: (Number(pp.disputedValue) || 0) + (Number(pp.undecidedValue) || 0),
    };
    return base;
  }, [items, personalPropertySummary]);

  const adjustedSummary = useMemo(() => {
    const s = summary || {};
    const pp = personalPropertySummary || {};
    const ppTotal = Number(pp.totalValue) || 0;
    const ppClient = Number(pp.clientValue) || 0;
    const ppSpouse = Number(pp.spouseValue) || 0;
    const ppUnallocated = (Number(pp.disputedValue) || 0) + (Number(pp.undecidedValue) || 0);
    const totalAssets = (s.totalAssets || 0) + ppTotal;
    const clientAssets = (s.clientAssets || 0) + ppClient;
    const spouseAssets = (s.spouseAssets || 0) + ppSpouse;
    const unallocatedAssets = (s.unallocatedAssets || 0) + ppUnallocated;
    const clientNetEstate = clientAssets - (s.clientLiabilities || 0);
    const spouseNetEstate = spouseAssets - (s.spouseLiabilities || 0);
    const netMaritalEstate = totalAssets - (s.totalLiabilities || 0);
    const allocatedTotal = clientNetEstate + spouseNetEstate;
    const clientPercentage = allocatedTotal !== 0 ? (clientNetEstate / allocatedTotal) * 100 : 0;
    const spousePercentage = allocatedTotal !== 0 ? (spouseNetEstate / allocatedTotal) * 100 : 0;
    return { ...s, totalAssets, clientAssets, spouseAssets, unallocatedAssets, clientNetEstate, spouseNetEstate, netMaritalEstate, clientPercentage, spousePercentage };
  }, [summary, personalPropertySummary]);

  const estate = useMemo(
    () => ({
      you: adjustedSummary.clientNetEstate || 0,
      spouse: adjustedSummary.spouseNetEstate || 0,
      unalloc: (adjustedSummary.unallocatedAssets || 0) - (adjustedSummary.unallocatedLiabilities || 0),
    }),
    [adjustedSummary]
  );

  const railSteps = useMemo(
    () => steps.map((s) => ({ id: s.key, name: s.label, review: s.review, total: s.review ? 0 : categoryTotals[s.key]?.total || 0 })),
    [steps, categoryTotals]
  );

  const totalItemCount = items.length;

  // ── Blueprint §3 autosave (preserved: debounced 500ms → updateAssetInventory)
  const buildPayload = () =>
    buildAssetInventoryPayload({
      items,
      summary,
      categoryTotals,
      itemsBySection,
      adjustedSummary,
      checklistItems,
      personalPropertySummary,
      personalPropertyRooms,
      ALL_SECTIONS,
      LIABILITY_KEYS,
    });

  useEffect(() => {
    if (items.length === 0 && (!personalPropertySummary || personalPropertySummary.totalItems === 0)) return;
    const timer = setTimeout(() => {
      useBlueprintStore.getState().updateAssetInventory(buildPayload());
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, adjustedSummary, summary, categoryTotals, itemsBySection, checklistItems, personalPropertySummary, personalPropertyRooms]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleAddItem = (sectionKey) => {
    const newItem = {
      id: genId(sectionKey),
      category: sectionKey,
      description: '',
      dateAcquired: null,
      titleholder: 'unknown',
      sourceOfPayment: null,
      currentValue: 0,
      costBasis: null,
      outstandingBalance: null,
      classification: 'unknown',
      classificationSource: null,
      notes: '',
    };
    addInventoryItem(newItem, autoClassify);
    setExpandedItemId(newItem.id);
  };
  const handleUpdate = (id, update) => updateInventoryItem(id, update, autoClassify);
  const handleRemove = (id) => {
    if (expandedItemId === id) setExpandedItemId(null);
    removeInventoryItem(id);
  };
  const handleAlloc = (id, alloc) => updateInventoryItem(id, { titleholder: titleholderForAlloc(alloc) }, autoClassify);
  const handleConvertToDeferredComp = (item, stubData) => {
    useBlueprintStore.getState().addDeferredCompStub({
      category: item.category,
      company: stubData.company,
      grantDate: stubData.grantDate,
      sharesGranted: stubData.sharesGranted,
      vestingSchedule: stubData.vestingSchedule,
      strikePrice: stubData.strikePrice,
    });
    if (expandedItemId === item.id) setExpandedItemId(null);
    removeInventoryItem(item.id);
  };
  const handleSetMarriageDate = (iso) => setMarriageDateAction(iso, autoClassify);
  const handleReset = () => {
    if (window.confirm('This will clear all entries in the Marital Estate Inventory. You will start with a blank inventory. Are you sure?')) {
      resetMaritalEstateInventory();
      setExpandedItemId(null);
      setCurrentStep(0);
    }
  };
  const toggleExpand = (id) => setExpandedItemId((cur) => (cur === id ? null : id));

  const back = () => setCurrentStep((c) => Math.max(0, c - 1));
  const next = () => setCurrentStep((c) => Math.min(steps.length - 1, c + 1));
  const jumpToKey = (key) => {
    const idx = steps.findIndex((s) => s.key === key);
    if (idx >= 0) setCurrentStep(idx);
  };
  const saveToBlueprint = () => {
    useBlueprintStore.getState().updateAssetInventory(buildPayload());
    router.push('/modules/m2');
  };

  const step = steps[currentStep];
  const isReview = !!step.review;
  const sectionItems = isReview ? [] : itemsBySection[step.key] || [];
  const meta = CATEGORY_META[step.key] || {};
  const StepIcon = meta.Icon;

  return (
    <div style={{ minHeight: '100%', background: T.PARCHMENT }}>
      <style>{`@media (max-width: 900px){.mei-2col{grid-template-columns:1fr !important;}.mei-rail{position:static !important;}}`}</style>
      <main style={{ maxWidth: 1180, width: '100%', margin: '0 auto', padding: '24px 32px 40px' }}>
        {/* Breadcrumb */}
        <Breadcrumb />

        {/* Title row + Chapters viz */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 28, flexWrap: 'wrap', marginTop: 12, marginBottom: 16 }}>
          <div style={{ maxWidth: 480, flexGrow: 1 }}>
            <h1 style={{ margin: 0, fontFamily: PLAYFAIR, fontWeight: 700, fontSize: 30, color: T.NAVY, lineHeight: 1.05, letterSpacing: '-.01em' }}>Marital Estate Inventory</h1>
            <p style={{ margin: '8px 0 0', fontFamily: T.FONT_BODY, fontSize: 14.5, lineHeight: 1.5, color: T.INK_2 }}>One piece at a time. We’ll walk through everything you own and owe — you can skip anything that doesn’t apply.</p>
          </div>
          <div style={{ width: 'min(100%, 430px)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: T.MUTED, fontFamily: T.FONT_BODY, marginBottom: 8 }}>Your progress</div>
            <StepChapters current={currentStep} assetCount={assetCount} liabilityCount={liabilityCount} />
          </div>
        </div>

        {/* Marriage-date bar */}
        <div style={{ marginBottom: 20 }}>
          <CompactMarriageBar marriageDate={marriageDate} onSet={handleSetMarriageDate} />
        </div>

        {/* Rail + stage */}
        <div className="mei-2col" style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 256px) 1fr', gap: 28, alignItems: 'start' }}>
          <GuidedStepperRail steps={railSteps} current={currentStep} onPick={setCurrentStep} completion={completenessScore} estate={estate} formatMoney={formatMoney} />

          <div style={{ minWidth: 0 }}>
            <div style={{ maxWidth: 620 }}>
              {isReview ? (
                <ReviewStage categoryTotals={categoryTotals} adjustedSummary={adjustedSummary} onJump={jumpToKey} />
              ) : (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ width: 30, height: 30, borderRadius: 8, background: T.PARCHMENT_DEEP, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                      {StepIcon && <StepIcon size={17} strokeWidth={2} color={T.NAVY} aria-hidden="true" />}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: T.PILL_TEXT, fontFamily: T.FONT_BODY }}>{step.isLiability ? 'What you owe' : 'What you own'}</span>
                  </div>
                  <h2 style={{ margin: '0 0 8px', fontFamily: PLAYFAIR, fontWeight: 700, fontSize: 32, color: T.NAVY, lineHeight: 1.08, letterSpacing: '-.01em' }}>{step.label}</h2>
                  <p style={{ margin: '0 0 22px', fontFamily: T.FONT_BODY, fontSize: 15.5, lineHeight: 1.6, color: T.INK_2, maxWidth: 560 }}>{meta.intro}</p>

                  {step.isPersonalProperty ? (
                    <PersonalPropertyStep summary={personalPropertySummary} started={personalPropertyStarted} />
                  ) : (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {sectionItems.length === 0 && (
                          <div style={{ background: T.CARD, border: `1.5px dashed ${T.LINE_STRONG}`, borderRadius: 12, padding: '30px 24px', textAlign: 'center' }}>
                            <div style={{ fontSize: 15, fontWeight: 600, color: T.INK, fontFamily: T.FONT_BODY }}>Nothing here yet</div>
                            <div style={{ fontSize: 13.5, color: T.MUTED, marginTop: 4, fontFamily: T.FONT_BODY }}>If none of this applies, that’s fine — just continue. Otherwise, add an item.</div>
                          </div>
                        )}
                        {sectionItems.map((it) => (
                          <ItemCard
                            key={it.id}
                            item={it}
                            section={step}
                            expanded={expandedItemId === it.id}
                            onToggleExpand={toggleExpand}
                            onUpdate={handleUpdate}
                            onRemove={handleRemove}
                            onAlloc={handleAlloc}
                            onConvertDeferredComp={handleConvertToDeferredComp}
                            isNavigator={isNavigator}
                            marriageDate={marriageDate}
                          />
                        ))}
                      </div>
                      <button type="button" onClick={() => handleAddItem(step.key)} style={{ marginTop: 14, width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, background: 'none', border: `1.5px dashed ${T.LINE_STRONG}`, borderRadius: 12, color: T.NAVY, fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: T.FONT_BODY }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.GOLD; e.currentTarget.style.background = T.GOLD_TINT_SUBTLE; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.LINE_STRONG; e.currentTarget.style.background = 'none'; }}>
                        <Plus size={16} strokeWidth={2} aria-hidden="true" /> Add {(step.subcategories && step.subcategories[0] ? step.subcategories[0] : step.label).toLowerCase()}
                      </button>

                      {isEssentials && (
                        <p style={{ marginTop: 14, fontSize: 12.5, color: T.INK_2, lineHeight: 1.5, fontFamily: T.FONT_BODY }}>
                          Not sure if something is marital or separate? Full Access classifies your assets automatically and explains the rules.{' '}
                          <a href="/upgrade" style={{ color: T.NAVY, fontWeight: 600, textDecoration: 'underline' }}>Unlock with Full Access →</a>
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Sticky footer nav */}
            <div style={{ position: 'sticky', bottom: 0, marginTop: 24, maxWidth: 620 }}>
              <GuidedFooterNav
                title={isReview ? 'You’ve mapped your estate' : `Step ${currentStep + 1} of ${steps.length}`}
                subtitle={isReview ? 'Revisit any category anytime' : step.label + (step.isLiability ? ' · debt' : '')}
                showBack={currentStep > 0}
                onBack={back}
                onContinue={isReview ? saveToBlueprint : next}
                continueLabel={isReview ? 'Save to Blueprint →' : 'Continue →'}
              />
            </div>

            {/* Footer row + disclaimer */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginTop: 20, maxWidth: 620, flexWrap: 'wrap' }}>
              <button type="button" onClick={handleReset} onMouseEnter={(e) => (e.currentTarget.style.borderBottomColor = T.NAVY_38)} onMouseLeave={(e) => (e.currentTarget.style.borderBottomColor = T.LINE_STRONG)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.INK_2, fontFamily: T.FONT_BODY, fontSize: 13, fontWeight: 500, borderBottom: `1px solid ${T.LINE_STRONG}`, padding: '0 0 1px' }}>Start over</button>
              <span style={{ fontSize: 12.5, color: T.MUTED, fontFamily: T.FONT_BODY }}>{totalItemCount} {totalItemCount === 1 ? 'item' : 'items'} entered</span>
            </div>

            <div style={{ maxWidth: 620, marginTop: 18, padding: '14px 16px', border: `1px solid ${T.GOLD_BORDER}`, borderLeft: `3px solid ${T.GOLD}`, borderRadius: 8, background: T.GOLD_TINT }}>
              <div style={{ fontWeight: 700, fontSize: 10.5, letterSpacing: '.08em', textTransform: 'uppercase', color: T.PILL_TEXT, marginBottom: 6, fontFamily: T.FONT_BODY }}>Not legal or tax advice</div>
              <p style={{ margin: 0, fontFamily: T.FONT_BODY, fontSize: 12.5, lineHeight: 1.55, color: T.INK_2 }}>
                This inventory is for educational and organizational purposes only. Values are your best estimates and may not reflect fair market value; classification suggestions follow general property-law principles and may not apply in your state. ClearPath Divorce Financial LLC is not a law firm. For guidance specific to your situation, consult a Certified Divorce Financial Analyst® or attorney.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
