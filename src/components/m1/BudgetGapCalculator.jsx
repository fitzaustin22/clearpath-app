'use client';

import { useState, useEffect, useCallback } from 'react';
import { Lock, Shield } from 'lucide-react';
import { useM1Store } from '@/src/stores/m1Store';
import useBlueprintStore from '@/src/stores/blueprintStore';
import { T } from '@/src/lib/brand/tokens';
import {
  EXPENSE_FIELDS,
  computeBudgetGap,
  getVerdictPresentation,
  getBarModel,
  getDonutModel,
} from '@/src/lib/m1/budgetGapMath';

// ─── Fonts ─────────────────────────────────────────────────────
// Playfair is loaded by next/font/google (var --font-playfair, layout.tsx).
// Newsreader / Inter come from the brand tokens (T.FONT_NUMERIC / T.FONT_BODY).
const PLAYFAIR = 'var(--font-playfair), "Playfair Display", Georgia, serif';

// ─── Design-specific colors not covered by the brand token map T ──
// Per the hand-off README; reported to Fitz. SHORTFALL_RED (#C0392B) is the
// design's verdict red, intentionally distinct from brand T.RED (#A8351E).
const D = {
  CONTAINER_BORDER: '#DDD8CC', // stage card border
  DOTTED_LEADER: '#C9C2B2', // ledger dotted leaders
  TRACK_BG: '#EFECE3', // bar track background
  SHORTFALL_RED: '#C0392B', // verdict red + expense gap chip text
  RED_WASH: 'rgba(192, 57, 43, 0.13)', // uncovered expense slice
  // Rail (navy bg) white-opacity ramp
  RAIL_EYEBROW: 'rgba(255,255,255,0.45)',
  RAIL_SUB: 'rgba(255,255,255,0.6)',
  RAIL_CARD_BG: 'rgba(255,255,255,0.07)',
  RAIL_CARD_BORDER: 'rgba(255,255,255,0.14)',
  RAIL_HAIRLINE: 'rgba(255,255,255,0.12)',
  RAIL_GAP_VALUE: 'rgba(255,255,255,0.85)',
  RAIL_FOOT: 'rgba(255,255,255,0.55)',
};

// ─── Formatting ────────────────────────────────────────────────
const money = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('en-US');
const fmtInt = (n) => Math.round(Number(n) || 0).toLocaleString('en-US');

// Existing gate email validation — reused verbatim (not the README regex).
function isValidEmail(email) {
  const atIdx = email.indexOf('@');
  if (atIdx < 1) return false;
  const afterAt = email.slice(atIdx + 1);
  return afterAt.indexOf('.') > 0 && afterAt.indexOf('.') < afterAt.length - 1;
}

const srOnly = {
  position: 'absolute', width: 1, height: 1, padding: 0, margin: -1,
  overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', borderWidth: 0,
};

const RESULTS_DISCLAIMER =
  'For educational and planning purposes only. For guidance specific to your situation, consult a Certified Divorce Financial Analyst®.';
const LEGAL_LINE =
  'ClearPath Divorce Financial LLC is not a law firm and does not provide legal advice.';

// Pay-frequency pills.
const FREQUENCIES = [
  { value: 'weekly', label: 'Weekly', noun: 'weekly' },
  { value: 'biweekly', label: 'Biweekly', noun: 'biweekly' },
  { value: 'semimonthly', label: 'Semi-monthly', noun: 'semi-monthly' },
  { value: 'monthly', label: 'Monthly', noun: 'monthly' },
];

const railStatLabel = {
  fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px',
  color: 'rgba(255,255,255,0.5)', marginBottom: 3,
};

// ════════════════════════════════════════════════════════════════
// Scoped CSS — focus states + slider thumb can't be expressed inline.
// Namespaced cp-bgc-* to avoid collisions.
// ════════════════════════════════════════════════════════════════
function StyleBlock() {
  return (
    <style>{`
      .cp-bgc-uinput { border: none; border-bottom: 1px solid ${T.LINE_STRONG};
        background: transparent; outline: none; padding: 2px 4px;
        font-variant-numeric: lining-nums tabular-nums; transition: border-color 120ms ease; }
      .cp-bgc-uinput.lg { border-bottom-width: 1.5px; }
      .cp-bgc-uinput:focus { border-bottom: 1.5px solid ${T.GOLD}; }
      .cp-bgc-uinput::placeholder { color: ${T.MUTED}; opacity: 0.7; }

      .cp-bgc-email { border: 1px solid ${T.LINE_STRONG}; outline: none;
        transition: border-color 120ms ease, box-shadow 120ms ease; }
      .cp-bgc-email:focus { border: 1px solid ${T.GOLD};
        box-shadow: 0 0 0 3px ${T.GOLD_FOCUS_RING}; }

      .cp-bgc-primary { transition: background-color 120ms ease; }
      .cp-bgc-primary:hover:not(:disabled) { background: ${T.NAVY_DEEP}; }

      .cp-bgc-share { -webkit-appearance: none; appearance: none; height: 6px;
        border-radius: 999px; outline: none; width: 100%; cursor: pointer;
        border: none; padding: 0; }
      .cp-bgc-share::-webkit-slider-thumb { -webkit-appearance: none; appearance: none;
        width: 22px; height: 22px; border-radius: 50%; background: #FFFFFF;
        border: 1px solid ${T.LINE_STRONG}; box-shadow: 0 1px 4px rgba(27,42,74,0.28); cursor: grab; }
      .cp-bgc-share::-moz-range-thumb { width: 22px; height: 22px; border-radius: 50%;
        background: #FFFFFF; border: 1px solid ${T.LINE_STRONG};
        box-shadow: 0 1px 4px rgba(27,42,74,0.28); cursor: grab; }

      .cp-bgc-pill { transition: background-color 120ms ease, color 120ms ease, border-color 120ms ease; }
      .cp-bgc-link { color: ${T.INK_2}; text-decoration: underline; text-underline-offset: 3px;
        cursor: pointer; background: none; border: none; padding: 0; font: inherit; }
    `}</style>
  );
}

// ════════════════════════════════════════════════════════════════
// Underline currency input (ledger style). Stores a number; formats on blur,
// shows raw digits while focused (no cursor jump).
// ════════════════════════════════════════════════════════════════
function CurrencyInput({ value, onCommit, ariaLabel, fontSize, width, align = 'left', large }) {
  const [display, setDisplay] = useState('');
  const [focused, setFocused] = useState(false);
  const numericValue = value === '' || value == null ? '' : value;

  const handleChange = (e) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '');
    setDisplay(raw);
    onCommit(raw === '' ? 0 : parseFloat(raw) || 0);
  };

  const shown = focused ? display : numericValue !== '' ? fmtInt(numericValue) : '';

  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4, flexShrink: 0 }}>
      <span aria-hidden="true" style={{ fontFamily: T.FONT_NUMERIC, fontSize: large ? 22 : 14, color: T.MUTED }}>$</span>
      <input
        className={`cp-bgc-uinput${large ? ' lg' : ''}`}
        type="text"
        inputMode="decimal"
        value={shown}
        onChange={handleChange}
        onFocus={() => { setFocused(true); setDisplay(numericValue !== '' ? String(numericValue) : ''); }}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }}
        placeholder="0"
        aria-label={ariaLabel}
        style={{
          width, fontFamily: T.FONT_NUMERIC, fontSize, fontWeight: large ? 600 : 400,
          color: T.NAVY, textAlign: align,
        }}
      />
    </span>
  );
}

// ── Section header: gold numeral + uppercase label + flexing hairline ──
function SectionHeader({ numeral, label, style }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, ...style }}>
      <span style={{ fontFamily: T.FONT_NUMERIC, fontSize: 15, fontWeight: 600, color: T.PILL_TEXT, fontVariantNumeric: 'lining-nums' }}>{numeral}</span>
      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.9px', color: T.NAVY }}>{label}</span>
      <span style={{ flexGrow: 1, height: 1, background: T.LINE }} />
    </div>
  );
}

// ── Rail stat (income / expenses) ──
function RailStat({ label, value, color }) {
  return (
    <div>
      <div style={railStatLabel}>{label}</div>
      <div style={{ fontFamily: T.FONT_NUMERIC, fontSize: 26, fontWeight: 600, color, fontVariantNumeric: 'lining-nums tabular-nums' }}>{value}</div>
    </div>
  );
}

// ── Bar row label + value ──
function BarRow({ label, value, style }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: T.INK_2, marginBottom: 6, ...style }}>
      <span style={{ fontWeight: 600 }}>{label}</span>
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  );
}

// ── Top chrome: wordmark + non-clickable 3-step progress tracker ──
function Chrome({ screen }) {
  const order = { input: 1, gate: 2, results: 3 };
  const cur = order[screen];
  const steps = [
    { n: 1, label: 'Your numbers' },
    { n: 2, label: 'Verify email' },
    { n: 3, label: 'Your results' },
  ];
  return (
    <div style={{
      maxWidth: 1120, margin: '0 auto 20px', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', gap: 24, flexWrap: 'wrap',
    }}>
      <div style={{ fontFamily: PLAYFAIR, fontWeight: 700, fontSize: 22, color: T.NAVY }}>ClearPath</div>
      {/* Progress indicator only — not interactive (the flow drives navigation). */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} aria-hidden="true">
        {steps.map((st) => {
          const active = st.n === cur;
          const done = st.n < cur;
          return (
            <div key={st.n} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderRadius: 999,
              border: `1px solid ${active ? T.NAVY : T.LINE_STRONG}`,
              background: active ? T.NAVY : T.CARD,
              color: active ? '#FFFFFF' : done ? T.NAVY : T.MUTED,
              fontSize: 12.5, fontWeight: 600,
            }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 18, height: 18, borderRadius: '50%',
                background: active ? T.GOLD : done ? T.NAVY : T.LINE,
                color: active ? T.NAVY : done ? '#FFFFFF' : T.MUTED,
                fontSize: 11, fontWeight: 700, fontVariantNumeric: 'lining-nums',
              }}>{st.n}</span>
              {st.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Main component
// ════════════════════════════════════════════════════════════════
export default function BudgetGapCalculator({ entry = 'direct' }) {
  const {
    budgetGap,
    setBudgetGapInputs,
    completeBudgetGap,
    setEmailCaptured,
    resetBudgetGap,
    readinessAssessment,
  } = useM1Store();

  // ── Local UI state (per session; not persisted — copy promise) ──
  const [screen, setScreen] = useState('input'); // input | gate | results
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  // Newsletter opt-in retained for the existing gate payload; the hi-fi gate
  // omits the checkbox, so it stays false. (Reported to Fitz.)
  const [newsletter] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // ── Frozen-store inputs (read exactly as the existing tool wrote them) ──
  const inputs = budgetGap.inputs || {};
  const grossIncome = inputs.grossIncome ?? '';
  const payFrequency = inputs.payFrequency ?? 'monthly';
  const expectedShare = inputs.expectedShare ?? 50;
  const expenses = EXPENSE_FIELDS.reduce((o, f) => {
    o[f.key] = inputs[f.key] ?? '';
    return o;
  }, {});

  // ── Responsive ──
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 760);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // ── Hydrate: jump straight to results if already completed. Runs post-mount
  // (not a lazy initializer) so server + first client render both start at
  // 'input' and only then jump — avoiding an SSR hydration mismatch.
  useEffect(() => {
    const s = useM1Store.getState().budgetGap;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional post-hydration jump
    if (s.completed && s.results) setScreen('results');
  }, []);

  // ── Scroll to top on screen change ──
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [screen]);

  // ── Live model (display verdict via tightBand; see budgetGapMath) ──
  const model = computeBudgetGap({
    grossPerCheck: grossIncome, freq: payFrequency, share: expectedShare, expenses,
  });
  const adjustedMonthlyIncome = model.income;
  const totalExpenses = model.totalExpenses;
  const monthlyGap = model.gap;
  const gapPercent = adjustedMonthlyIncome === 0 ? null : (monthlyGap / adjustedMonthlyIncome) * 100;
  const grossNum = typeof grossIncome === 'number' ? grossIncome : parseFloat(grossIncome) || 0;
  const canSubmit = grossNum > 0;

  // ── Field updater ──
  const setField = useCallback((key, val) => setBudgetGapInputs({ [key]: val }), [setBudgetGapInputs]);

  // ── Cumulative-data-pipeline result (UNCHANGED contract — feeds Blueprint §1).
  // completedAt set at call time so it reflects when results are shown.
  const buildPipelineResults = useCallback(() => {
    const exp = useM1Store.getState().budgetGap.inputs || {};
    return {
      completedAt: new Date().toISOString(),
      grossMonthlyIncome: grossNum,
      expectedSharePercent: expectedShare,
      payFrequency,
      adjustedMonthlyIncome: Math.round(adjustedMonthlyIncome * 100) / 100,
      expenses: {
        housing: typeof exp.housing === 'number' ? exp.housing : parseFloat(exp.housing) || 0,
        utilities: typeof exp.utilities === 'number' ? exp.utilities : parseFloat(exp.utilities) || 0,
        groceries: typeof exp.groceries === 'number' ? exp.groceries : parseFloat(exp.groceries) || 0,
        transportation: typeof exp.transportation === 'number' ? exp.transportation : parseFloat(exp.transportation) || 0,
        healthInsurance: typeof exp.healthInsurance === 'number' ? exp.healthInsurance : parseFloat(exp.healthInsurance) || 0,
        childcare: typeof exp.childcare === 'number' ? exp.childcare : parseFloat(exp.childcare) || 0,
        debtPayments: typeof exp.debtPayments === 'number' ? exp.debtPayments : parseFloat(exp.debtPayments) || 0,
        personal: typeof exp.personal === 'number' ? exp.personal : parseFloat(exp.personal) || 0,
      },
      totalMonthlyExpenses: Math.round(totalExpenses * 100) / 100,
      monthlyGap: Math.round(monthlyGap * 100) / 100,
      gapPercent: gapPercent !== null ? Math.round(gapPercent * 100) / 100 : null,
    };
  }, [grossNum, expectedShare, payFrequency, adjustedMonthlyIncome, totalExpenses, monthlyGap, gapPercent]);

  // ── Write Budget Gap results to Blueprint §1 (UNCHANGED) ──
  const writeBlueprintProfile = useCallback((pipelineResults) => {
    const assessment = useM1Store.getState().readinessAssessment;
    useBlueprintStore.getState().updatePersonalProfile({
      assessment:
        assessment?.completed && assessment.results
          ? { ...assessment.results, completedAt: assessment.results.completedAt || new Date().toISOString() }
          : null,
      budgetGap: pipelineResults,
    });
  }, []);

  const persistAndReveal = useCallback(() => {
    const pipelineResults = buildPipelineResults();
    completeBudgetGap(pipelineResults);
    writeBlueprintProfile(pipelineResults);
    setScreen('results');
  }, [buildPipelineResults, completeBudgetGap, writeBlueprintProfile]);

  // ── See My Results → email gate (or straight to results for returning user) ──
  const handleSeeResults = useCallback(() => {
    if (!canSubmit) return;
    if (budgetGap.emailCaptured) {
      persistAndReveal();
    } else {
      setScreen('gate');
    }
  }, [canSubmit, budgetGap.emailCaptured, persistAndReveal]);

  // ── Email submit (existing gate logic; CRM capture is the existing stub) ──
  const handleEmailSubmit = useCallback(() => {
    if (!isValidEmail(email)) {
      setEmailError('Enter a valid email address.');
      return;
    }
    setEmailError('');

    const gapTier = gapPercent === null ? 'shortfall'
      : gapPercent > 20 ? 'comfortable'
      : gapPercent >= 0 ? 'moderate'
      : 'shortfall';

    // TODO: Replace with the production CRM/lead call. The existing gate logs a
    // stub here and never blocks the reveal on capture; left intact per the
    // reskin scope. (A real /api/leads exists for the marketing magnet but is
    // not wired to this gate — see handoff notes.)
    try {
      console.info('[BudgetGap] CRM stub: would send', {
        email, gapTier, monthlyGap, newsletter, zeroShare: expectedShare === 0,
      });
    } catch {
      // Never block results on CRM failure.
    }

    setEmailCaptured();
    persistAndReveal();
  }, [email, newsletter, expectedShare, monthlyGap, gapPercent, setEmailCaptured, persistAndReveal]);

  // ── Recalculate: keep inputs, clear completion, skip the gate next time ──
  const handleRecalculate = useCallback(() => {
    const currentInputs = useM1Store.getState().budgetGap.inputs;
    resetBudgetGap();
    setBudgetGapInputs(currentInputs);
    setEmailCaptured();
    setScreen('input');
  }, [resetBudgetGap, setBudgetGapInputs, setEmailCaptured]);

  // ── Entry context: 'ra' treatment if the route passed entry="ra" OR she has
  // completed the Readiness Assessment. TODO: the RA route links here with
  // ?from=ra (page.tsx) so the rail/banner flip without relying on store state.
  const isRA = entry === 'ra' || !!readinessAssessment?.completed;
  const railHead = isRA ? 'You’ve taken the first step.' : 'Can you afford to live on your own?';

  // ── Derived presentation ──
  const verdict = getVerdictPresentation(model.kind, monthlyGap);
  const posGap = monthlyGap >= 0;
  const bigNumber = (posGap ? '+' : '−') + money(Math.abs(monthlyGap));
  const bar = getBarModel({ income: adjustedMonthlyIncome, totalExpenses, gap: monthlyGap });
  const donut = getDonutModel(expenses);

  const perPay = payFrequency === 'monthly'
    ? 'per month'
    : `per ${FREQUENCIES.find((f) => f.value === payFrequency)?.noun ?? payFrequency} paycheck`;

  const pageWrap = {
    backgroundColor: T.PARCHMENT, minHeight: '100vh', boxSizing: 'border-box',
    padding: isMobile ? '20px 14px 48px' : '28px 28px 60px',
    fontFamily: T.FONT_BODY, color: T.NAVY,
  };
  const cardShadow = '0 20px 40px rgba(28,28,25,0.06)';

  // ════════════════════════════════════════════════════════════
  // STAGE 1 — Inputs ("The Quiet Ledger")
  // ════════════════════════════════════════════════════════════
  function renderInput() {
    return (
      <div style={{
        maxWidth: 1120, margin: '0 auto', background: T.PARCHMENT,
        border: `1px solid ${D.CONTAINER_BORDER}`, borderRadius: 16, boxShadow: cardShadow,
        overflow: 'hidden', display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '340px 1fr',
      }}>
        {/* ── Navy rail ── */}
        <div style={{ background: T.NAVY, padding: isMobile ? '30px 24px' : '38px 30px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.9px', color: D.RAIL_EYEBROW, marginBottom: 10 }}>
            Module 1 · Budget Gap
          </div>
          <div style={{ fontFamily: T.FONT_NUMERIC, fontSize: 26, fontWeight: 500, lineHeight: 1.25, color: '#FFFFFF', marginBottom: 12 }}>
            {railHead}
          </div>
          <p style={{ fontSize: 13.5, lineHeight: 1.6, color: D.RAIL_SUB, margin: '0 0 28px' }}>
            Two short sections, about five minutes. Nothing is saved or shared.
          </p>

          <div style={{ background: D.RAIL_CARD_BG, border: `1px solid ${D.RAIL_CARD_BORDER}`, borderRadius: 10, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <RailStat label="Monthly income — your share" value={money(adjustedMonthlyIncome)} color={T.GOLD} />
            <RailStat label="Expenses so far" value={money(totalExpenses)} color="#FFFFFF" />
            <div style={{ height: 1, background: D.RAIL_HAIRLINE }} />
            <div>
              <div style={railStatLabel}>Your monthly gap</div>
              <div style={{ fontFamily: T.FONT_NUMERIC, fontSize: 30, fontWeight: 600, color: D.RAIL_GAP_VALUE, filter: 'blur(9px)', userSelect: 'none' }}>
                $1,234
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                <Lock size={12} color={T.GOLD} strokeWidth={2} aria-hidden="true" />
                <span style={{ fontSize: 11.5, color: D.RAIL_FOOT }}>Revealed when you see your results</span>
              </div>
            </div>
          </div>

          <div style={{ flexGrow: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 28 }}>
            <Shield size={13} color={T.GOLD} strokeWidth={2} aria-hidden="true" />
            <span style={{ fontSize: 12, color: D.RAIL_FOOT }}>Private. We never store these numbers.</span>
          </div>
        </div>

        {/* ── Worksheet ── */}
        <div style={{ padding: isMobile ? '28px 22px 30px' : '40px 44px 36px' }}>
          {isRA && (
            <div style={{ marginBottom: 22, padding: '10px 16px', borderRadius: 8, background: T.GOLD_TINT, border: `1px solid ${T.GOLD_BORDER}`, fontSize: 13.5, color: T.NAVY }}>
              <strong>You&rsquo;ve taken the first step.</strong> Now let&rsquo;s look at the numbers.
            </div>
          )}

          <SectionHeader numeral="01" label="Income" style={{ marginBottom: 22 }} />

          <div style={{ display: 'flex', gap: 36, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: T.NAVY, marginBottom: 6 }}>
                Gross household income <span style={{ fontWeight: 400, color: T.MUTED }}>· {perPay}</span>
              </div>
              <CurrencyInput
                value={grossIncome}
                onCommit={(v) => setField('grossIncome', v)}
                ariaLabel="Gross household income per paycheck"
                fontSize={28}
                width={150}
                large
              />
            </div>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: T.NAVY, marginBottom: 8 }}>Pay frequency</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {FREQUENCIES.map((f) => {
                  const sel = payFrequency === f.value;
                  return (
                    <button
                      key={f.value}
                      type="button"
                      className="cp-bgc-pill"
                      onClick={() => setField('payFrequency', f.value)}
                      aria-pressed={sel}
                      style={{
                        padding: '8px 14px', borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap',
                        fontFamily: T.FONT_BODY, fontSize: 12.5, fontWeight: 600,
                        border: `1px solid ${sel ? T.NAVY : T.LINE_STRONG}`,
                        background: sel ? T.NAVY : T.CARD,
                        color: sel ? '#FFFFFF' : T.INK_2,
                      }}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div style={{ fontSize: 12.5, color: T.MUTED, lineHeight: 1.5, marginBottom: 26 }}>
            Before taxes or deductions. Biweekly = 26 paychecks a year · semi-monthly = 24 — we convert everything to one monthly number.
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
            <label htmlFor="cp-bgc-share" style={{ fontSize: 12.5, fontWeight: 600, color: T.NAVY }}>Your expected share of that income</label>
            <span style={{ fontFamily: T.FONT_NUMERIC, fontSize: 26, fontWeight: 600, color: T.PILL_TEXT, fontVariantNumeric: 'lining-nums tabular-nums' }}>{expectedShare}%</span>
          </div>
          <input
            id="cp-bgc-share"
            className="cp-bgc-share"
            type="range"
            min={0}
            max={100}
            step={1}
            value={expectedShare}
            onChange={(e) => setField('expectedShare', Math.max(0, Math.min(100, Number(e.target.value))))}
            aria-label="Your expected share of household income"
            style={{ background: `linear-gradient(90deg, ${T.GOLD} 0%, ${T.GOLD} ${expectedShare}%, ${T.LINE} ${expectedShare}%, ${T.LINE} 100%)` }}
          />
          <div style={{ fontSize: 12.5, color: T.MUTED, lineHeight: 1.5, marginTop: 8 }}>
            Not sure? 50% is a planning starting point — not a legal determination.
          </div>

          {expectedShare === 0 && (
            <div role="alert" style={{ marginTop: 14, padding: '12px 16px', borderRadius: 8, background: T.AMBER_BG, border: `1px solid ${T.AMBER_BORDER}`, fontSize: 13, lineHeight: 1.55, color: T.NAVY }}>
              With your share at 0%, your monthly income comes out to <strong>$0</strong>. If you&rsquo;re unsure, leave it at 50% for now — it&rsquo;s a planning number, nothing more.
            </div>
          )}

          <SectionHeader numeral="02" label="What life costs on your own" style={{ margin: '32px 0 8px' }} />
          <div style={{ fontSize: 12.5, color: T.MUTED, lineHeight: 1.5, marginBottom: 10 }}>
            Best guesses are fine. You can come back and refine any line.
          </div>

          {EXPENSE_FIELDS.map((f) => (
            <div key={f.key} style={{ display: 'flex', alignItems: 'flex-end', gap: 14, padding: '10px 0', borderBottom: '1px solid rgba(230,226,216,0.6)' }}>
              <div style={{ flexShrink: 0, maxWidth: 400 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.NAVY, lineHeight: 1.35 }}>{f.label}</div>
                {f.helper && <div style={{ fontSize: 12, color: T.MUTED, marginTop: 2, lineHeight: 1.45, maxWidth: 380 }}>{f.helper}</div>}
              </div>
              <div style={{ flex: 1, borderBottom: `1px dotted ${D.DOTTED_LEADER}`, marginBottom: 7, minWidth: 24 }} />
              <CurrencyInput
                value={expenses[f.key]}
                onCommit={(v) => setField(f.key, v)}
                ariaLabel={`${f.label} monthly cost`}
                fontSize={20}
                width={104}
                align="right"
              />
            </div>
          ))}

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, padding: '14px 0 0' }}>
            <span style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: T.NAVY }}>Adds up to</span>
            <span style={{ flex: 1, borderBottom: `1px dotted ${D.DOTTED_LEADER}`, marginBottom: 6 }} />
            <span style={{ fontFamily: T.FONT_NUMERIC, fontSize: 24, fontWeight: 700, color: T.PILL_TEXT, fontVariantNumeric: 'lining-nums tabular-nums' }}>
              {money(totalExpenses)}<span style={{ fontSize: 14, fontWeight: 400, color: T.MUTED }}> /month</span>
            </span>
          </div>

          <button
            type="button"
            className="cp-bgc-primary"
            onClick={handleSeeResults}
            disabled={!canSubmit}
            style={{
              width: '100%', marginTop: 26, padding: '15px 24px', borderRadius: 8, border: 'none',
              background: canSubmit ? T.NAVY : T.MUTED, color: '#FFFFFF', fontFamily: T.FONT_BODY,
              fontSize: 15, fontWeight: 600, cursor: canSubmit ? 'pointer' : 'not-allowed',
              opacity: canSubmit ? 1 : 0.6,
            }}
          >
            See My Results
          </button>
          <div style={{ fontSize: 12, color: T.MUTED, textAlign: 'center', marginTop: 8 }}>
            {canSubmit ? 'Your gap, explained — no judgment.' : 'Enter your gross income to see your results.'}
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // STAGE 2 — Email gate (restyled chrome over the existing gate logic)
  // ════════════════════════════════════════════════════════════
  function renderGate() {
    const emailOk = isValidEmail(email);
    return (
      <div style={{
        maxWidth: 1120, margin: '0 auto', background: T.PARCHMENT,
        border: `1px solid ${D.CONTAINER_BORDER}`, borderRadius: 16, boxShadow: cardShadow,
        position: 'relative', overflow: 'hidden', minHeight: 620,
      }}>
        {/* Blurred results preview */}
        <div style={{ position: 'absolute', inset: 0, filter: 'blur(14px)', opacity: 0.5, pointerEvents: 'none', padding: 56, boxSizing: 'border-box' }} aria-hidden="true">
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: PLAYFAIR, fontWeight: 700, fontSize: 76, lineHeight: 1, color: verdict.color }}>{bigNumber}</div>
            <div style={{ width: 96, height: 0, borderTop: `2px solid ${T.GOLD}`, margin: '18px auto' }} />
            <div style={{ height: 14, width: 320, background: '#E0DBCF', borderRadius: 6, margin: '0 auto 10px' }} />
            <div style={{ height: 14, width: 260, background: '#E0DBCF', borderRadius: 6, margin: '0 auto' }} />
          </div>
        </div>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(250,248,242,0.55)' }} />

        {/* Glass modal */}
        <div style={{ position: 'relative', zIndex: 2, minHeight: 620, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? 20 : 48 }}>
          <div style={{
            width: 440, maxWidth: '100%', background: 'rgba(255,255,255,0.82)',
            backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            border: `1px solid ${T.GOLD_BORDER}`, borderRadius: 14, boxShadow: '0 20px 40px rgba(28,28,25,0.10)',
            padding: '38px 38px 32px', boxSizing: 'border-box',
          }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 12px', borderRadius: 999, background: 'rgba(200,169,110,0.12)', border: `1px solid ${T.GOLD_BORDER}`, marginBottom: 18 }}>
              <Lock size={12} color={T.PILL_TEXT} strokeWidth={2} aria-hidden="true" />
              <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px', color: T.PILL_TEXT }}>One step from your number</span>
            </div>
            <h2 style={{ fontFamily: PLAYFAIR, fontWeight: 700, fontSize: 27, lineHeight: 1.15, margin: '0 0 10px', color: T.NAVY }}>
              Where should we send your results?
            </h2>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, color: T.INK_2, margin: '0 0 22px' }}>
              We&rsquo;ll show your monthly picture right away and email you a copy you can return to — along with the next step when you&rsquo;re ready. No spam, unsubscribe anytime.
            </p>

            <label htmlFor="cp-bgc-email" style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: T.NAVY, marginBottom: 6 }}>Email address</label>
            <input
              id="cp-bgc-email"
              className="cp-bgc-email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && emailOk) handleEmailSubmit(); }}
              placeholder="you@example.com"
              autoFocus
              aria-invalid={emailError ? 'true' : undefined}
              aria-describedby={emailError ? 'cp-bgc-email-err' : undefined}
              style={{ width: '100%', boxSizing: 'border-box', height: 44, borderRadius: 8, background: T.CARD, fontSize: 15, fontFamily: T.FONT_BODY, color: T.NAVY, padding: '0 14px', marginBottom: emailError ? 6 : 18 }}
            />
            {emailError && (
              <p id="cp-bgc-email-err" role="alert" style={{ fontSize: 12.5, color: D.SHORTFALL_RED, margin: '0 0 14px' }}>{emailError}</p>
            )}

            <button
              type="button"
              className="cp-bgc-primary"
              onClick={handleEmailSubmit}
              disabled={!emailOk}
              style={{
                width: '100%', padding: '14px 24px', borderRadius: 8, border: 'none',
                background: emailOk ? T.NAVY : T.MUTED, color: '#FFFFFF', fontFamily: T.FONT_BODY,
                fontSize: 15, fontWeight: 600, cursor: emailOk ? 'pointer' : 'not-allowed', opacity: emailOk ? 1 : 0.6,
              }}
            >
              Show me my results &rarr;
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 16, justifyContent: 'center' }}>
              <Shield size={13} color={T.MUTED} strokeWidth={2} aria-hidden="true" />
              <span style={{ fontSize: 12, color: T.MUTED, textAlign: 'center' }}>Your figures stay private — we never store the numbers you entered.</span>
            </div>
            <div style={{ textAlign: 'center', marginTop: 14 }}>
              <button type="button" className="cp-bgc-link" style={{ fontSize: 12.5 }} onClick={() => setScreen('input')}>&larr; Back to my numbers</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // STAGE 3 — Results ("Path to Clarity")
  // ════════════════════════════════════════════════════════════
  function renderResults() {
    const showGapSeg = bar.gapPct > 0.01;
    return (
      <div style={{
        maxWidth: 840, margin: '0 auto', background: T.PARCHMENT,
        border: `1px solid ${D.CONTAINER_BORDER}`, borderRadius: 16, boxShadow: cardShadow,
        padding: isMobile ? '36px 22px 32px' : '52px 56px 40px',
      }}>
        {/* Verdict */}
        <div style={{ textAlign: 'center', marginBottom: 34 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.4px', color: T.MUTED, marginBottom: 14 }}>Your monthly picture</div>
          <div style={{ fontFamily: PLAYFAIR, fontWeight: 700, fontSize: isMobile ? 52 : 76, lineHeight: 1, color: verdict.color, fontVariantNumeric: 'lining-nums tabular-nums' }}>
            {bigNumber}<span style={{ fontSize: isMobile ? 22 : 30, fontWeight: 500, color: verdict.color }}>/month</span>
          </div>
          <div style={{ width: 96, height: 0, borderTop: `2px solid ${T.GOLD}`, margin: '18px auto' }} />
          <p style={{ fontSize: 17, lineHeight: 1.55, color: T.INK_2, maxWidth: 470, margin: '0 auto' }}>{verdict.narrative}</p>
        </div>

        {/* Income vs. expense bars */}
        <div style={{ padding: '24px 28px', borderRadius: 12, background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: `1px solid ${T.GOLD_BORDER}`, marginBottom: 28 }}>
          <BarRow label="Your estimated monthly income" value={money(adjustedMonthlyIncome)} />
          <div style={{ height: 28, borderRadius: 6, background: D.TRACK_BG, overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: `${bar.coverPct}%`, background: T.GOLD }} />
            {posGap && showGapSeg && (
              <div style={{ width: `${bar.gapPct}%`, background: T.GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: '#FFFFFF', whiteSpace: 'nowrap' }}>{bigNumber}</span>
              </div>
            )}
          </div>
          <BarRow label="Your estimated monthly expenses" value={money(totalExpenses)} style={{ margin: '16px 0 6px' }} />
          <div style={{ height: 28, borderRadius: 6, background: D.TRACK_BG, overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: `${bar.coverPct}%`, background: T.NAVY }} />
            {!posGap && showGapSeg && (
              <div style={{ width: `${bar.gapPct}%`, background: D.RED_WASH, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: D.SHORTFALL_RED, whiteSpace: 'nowrap' }}>{bigNumber}</span>
              </div>
            )}
          </div>
          <div style={{ fontSize: 12, color: T.MUTED, marginTop: 10 }}>{verdict.barCaption}</div>
        </div>

        {/* Donut + legend */}
        {donut.segments.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 34, marginBottom: 8, flexDirection: isMobile ? 'column' : 'row' }}>
            <div style={{ position: 'relative', width: 170, height: 170, flexShrink: 0 }}>
              <div style={{ width: 170, height: 170, borderRadius: '50%', background: donut.gradient }} />
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 96, height: 96, borderRadius: '50%', background: T.PARCHMENT, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: T.MUTED }}>Expenses</span>
                <span style={{ fontFamily: T.FONT_NUMERIC, fontSize: 18, fontWeight: 700, color: T.NAVY }}>{money(donut.total)}</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px 28px', flex: 1, width: isMobile ? '100%' : undefined, fontSize: 12.5, color: T.NAVY }}>
              {donut.segments.map((seg) => (
                <div key={seg.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: seg.color, flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{seg.label}</span>
                  <span style={{ color: T.INK_2, fontVariantNumeric: 'tabular-nums' }}>{money(seg.value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div style={{ borderTop: `1px solid ${T.LINE}`, marginTop: 26, paddingTop: 26 }}>
          <div style={{ fontFamily: T.FONT_NUMERIC, fontSize: 23, fontWeight: 600, color: T.NAVY, marginBottom: 8 }}>Want to go deeper?</div>
          <p style={{ fontSize: 14.5, lineHeight: 1.6, color: T.INK_2, maxWidth: 520, margin: '0 0 16px' }}>{verdict.ctaBody}</p>
          <a href="/modules/m2" className="cp-bgc-primary" style={{
            display: 'inline-block', background: T.NAVY, color: '#FFFFFF', fontFamily: T.FONT_BODY,
            fontWeight: 600, fontSize: 15, padding: '13px 26px', borderRadius: 8, textDecoration: 'none',
          }}>
            Explore Module 2 &rarr;
          </a>
          <div style={{ marginTop: 14 }}>
            <a href="/modules/m1/readiness" style={{ fontSize: 13, color: T.INK_2, textDecoration: 'underline', textUnderlineOffset: 3 }}>
              Or start with the Life Transition Readiness Assessment
            </a>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 30 }}>
          <button type="button" className="cp-bgc-link" style={{ fontSize: 13.5 }} onClick={handleRecalculate}>Recalculate with new numbers</button>
        </div>
        <p style={{ fontSize: 12, lineHeight: 1.6, color: T.MUTED, textAlign: 'center', maxWidth: 560, margin: '18px auto 0' }}>{RESULTS_DISCLAIMER}</p>

        {/* Screen-reader summary */}
        <div style={srOnly}>
          <table>
            <caption>Your monthly budget summary</caption>
            <tbody>
              <tr><td>Estimated monthly income</td><td>{money(adjustedMonthlyIncome)}</td></tr>
              <tr><td>Estimated monthly expenses</td><td>{money(totalExpenses)}</td></tr>
              <tr><td>Monthly gap</td><td>{bigNumber}</td></tr>
            </tbody>
          </table>
          {donut.segments.length > 0 && (
            <table>
              <caption>Expense breakdown</caption>
              <tbody>
                {donut.segments.map((seg) => (
                  <tr key={seg.key}><td>{seg.label}</td><td>{money(seg.value)}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={pageWrap}>
      <StyleBlock />
      <Chrome screen={screen} />
      {screen === 'input' && renderInput()}
      {screen === 'gate' && renderGate()}
      {screen === 'results' && renderResults()}
      <p style={{ maxWidth: 1120, margin: '24px auto 0', fontSize: 11.5, color: T.MUTED, textAlign: 'center' }}>{LEGAL_LINE}</p>
    </div>
  );
}
