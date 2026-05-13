'use client';

/**
 * ResultsPanel — primary surface for the M5 Support Estimator.
 *
 * Renders the locked data contract returned by the calc engine:
 *   { combinedMonthly, childMonthly, spousalMonthly, metadata, breakdown }
 *
 * API (parent-decided variant per §6.5.2):
 *   <ResultsPanel
 *     data={results}                  // null | calc-engine output (merged metadata)
 *     variant="numeric"               // see deriveVariant in SupportEstimator.jsx
 *     partyFraming="abstract"         // 'abstract' | 'persona'
 *     defaultMathOpen={false}
 *   />
 */

import { useState } from 'react';
import { T } from '@/src/lib/brand/tokens';
import { CalloutStack, AlimonyFirstOrdering } from './callouts';

const fmtMoney = (n) => {
  if (n == null) return '—';
  if (n === 0) return '$0';
  return '$' + Math.round(n).toLocaleString();
};
const fmtMoneyMo = (n) => fmtMoney(n) + '/mo';

// ISO 'YYYY-MM-DD' parses as UTC midnight; format in UTC to avoid timezone drift.
const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
};

// Parse '3a' / '1b' / '5' out of stepId='step_3a_pro_rate_to_non_custodial'.
const stepDisplayId = (stepId) => {
  const m = /^step_([0-9a-z]+)_/.exec(stepId || '');
  return m ? m[1] : '';
};

const STATE_NAME = {
  VA: 'Virginia', MD: 'Maryland', DC: 'District of Columbia',
  NY: 'New York', CA: 'California', OTHER: 'Other state',
};
const TEMPORAL_LABEL = {
  pendente_lite: 'Pendente lite',
  post_divorce: 'Post-divorce',
};
const DEPTH_LABEL = {
  standard: 'Standard',
  full_worksheet: 'Full Worksheet',
};

function Pill({ children, tone = 'navy', size = 'md' }) {
  const palette = tone === 'amber'
    ? { bg: T.AMBER_BG, fg: T.AMBER, border: T.AMBER_BORDER }
    : tone === 'gold'
    ? { bg: T.GOLD_TINT, fg: T.GOLD, border: T.GOLD_BORDER }
    : { bg: T.NAVY_06, fg: T.NAVY_70, border: 'rgba(27, 42, 74, 0.14)' };
  const padding = size === 'sm' ? '2px 8px' : '3px 10px';
  const fs = size === 'sm' ? 10.5 : 11.5;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: palette.bg, color: palette.fg,
      border: `1px solid ${palette.border}`,
      borderRadius: 999, padding, fontFamily: T.FONT_BODY,
      fontSize: fs, fontWeight: 600,
      letterSpacing: '0.04em',
      whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}

function BadgeRow({ metadata }) {
  return (
    <div style={{
      display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center',
      alignItems: 'center',
    }}>
      <Pill>{STATE_NAME[metadata.state] || metadata.state}</Pill>
      <span style={{ color: T.NAVY_38, fontFamily: T.FONT_BODY, fontSize: 11 }}>·</span>
      <Pill>{TEMPORAL_LABEL[metadata.temporal]}</Pill>
      <span style={{ color: T.NAVY_38, fontFamily: T.FONT_BODY, fontSize: 11 }}>·</span>
      <Pill>{DEPTH_LABEL[metadata.depth]}</Pill>
    </div>
  );
}

function PartySentence({ metadata, combinedMonthly, framing = 'abstract' }) {
  const a = metadata.parties?.a;
  const b = metadata.parties?.b;
  const nameA = a?.name && a.name !== 'Party A' ? a.name : null;
  const nameB = b?.name && b.name !== 'Party B' ? b.name : null;

  let left = 'Party A';
  let right = 'Party B';
  if (framing === 'persona') {
    left = 'You';
    right = 'your spouse';
  } else if (nameA && nameB) {
    left = nameA;
    right = nameB;
  }

  const verb = framing === 'persona' ? 'pay' : 'pays';

  return (
    <div style={{
      fontFamily: T.FONT_BODY, fontSize: 16, color: T.NAVY,
      textAlign: 'center', lineHeight: 1.45, fontWeight: 500,
    }}>
      <span style={{ fontWeight: 700 }}>{left}</span> {verb}{' '}
      <span style={{
        fontFamily: T.FONT_NUMERIC, fontWeight: 500,
        color: T.GOLD, fontSize: 17,
        ...T.NUMERIC_STYLE,
        letterSpacing: '-0.005em',
      }}>
        {fmtMoneyMo(combinedMonthly)}
      </span>{' '}
      combined to{' '}
      <span style={{ fontWeight: 700 }}>{right}</span>.
    </div>
  );
}

function SplitLine({ label, amount, annotation, annotationTone = 'amber', muted = false, placeholder = false }) {
  const valueColor = muted ? T.NAVY_55 : T.NAVY;
  const aTone = annotationTone === 'amber' ? T.AMBER : T.NAVY_70;
  return (
    <div style={{ flex: 1, minWidth: 0, padding: '14px 18px' }}>
      <div style={{
        fontFamily: T.FONT_BODY, fontSize: 12.5, fontWeight: 600,
        color: T.NAVY_70, letterSpacing: '0.02em', marginBottom: 4,
      }}>{label}</div>
      <div style={{
        fontFamily: T.FONT_NUMERIC, fontWeight: 400, fontSize: 30,
        color: valueColor, lineHeight: 1.05,
        ...T.NUMERIC_STYLE,
        letterSpacing: '-0.005em',
      }}>
        {placeholder ? (
          <span style={{
            fontFamily: T.FONT_BODY, color: T.NAVY_38, fontSize: 16,
            fontStyle: 'italic', fontWeight: 500, letterSpacing: 0,
          }}>see disclosure</span>
        ) : fmtMoneyMo(amount)}
      </div>
      {annotation && (
        <div style={{
          fontFamily: T.FONT_BODY, fontSize: 12.5, color: aTone,
          marginTop: 6, paddingLeft: 9,
          borderLeft: `2px solid ${aTone === T.AMBER ? T.AMBER : T.NAVY_12}`,
          lineHeight: 1.4,
        }}>
          {annotation}
        </div>
      )}
    </div>
  );
}

function Hero({ data, variant = 'numeric', partyFraming = 'abstract' }) {
  // Placeholder — inputs incomplete; soft empty state.
  if (variant === 'placeholder' || !data) {
    return (
      <div style={{
        background: T.PARCHMENT,
        border: `1px dashed ${T.NAVY_12}`,
        borderRadius: 10, padding: '56px 32px',
        textAlign: 'center',
        fontFamily: T.FONT_BODY,
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 48, height: 48, borderRadius: '50%',
          border: `1.5px dashed ${T.NAVY_38}`, marginBottom: 16,
        }}>
          <span style={{
            fontFamily: T.FONT_NUMERIC, fontSize: 28, color: T.NAVY_38,
            ...T.NUMERIC_STYLE, fontWeight: 400,
          }}>$</span>
        </div>
        <div style={{
          fontFamily: T.FONT_DISPLAY, fontSize: 22, fontWeight: 600,
          color: T.NAVY_70, marginBottom: 6,
        }}>
          Your estimate appears here
        </div>
        <div style={{
          color: T.NAVY_55, fontSize: 14, maxWidth: 380, margin: '0 auto',
          lineHeight: 1.55,
        }}>
          Add gross income for both parties, state, and parenting time on the left
          to see a combined monthly support figure.
        </div>
      </div>
    );
  }

  const { combinedMonthly, childMonthly, spousalMonthly, metadata } = data;
  const asOf = fmtDate(metadata.asOfDateForStatutoryConstants);

  // Factor-test $0 combined — special primary surface (no "$0/mo" headline).
  if (variant === 'factor_test_zero') {
    return (
      <div style={{
        background: T.AMBER_BG,
        border: `1px solid ${T.AMBER_BORDER}`,
        borderRadius: 10, padding: '24px 28px 28px',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 4,
          background: T.AMBER, borderRadius: '10px 10px 0 0',
        }} />

        <BadgeRow metadata={metadata} />

        <div style={{ textAlign: 'center', marginTop: 24, marginBottom: 4 }}>
          <Pill tone="amber" size="sm">FACTOR TEST APPLIES</Pill>
        </div>

        <div style={{
          fontFamily: T.FONT_DISPLAY, fontSize: 30, fontWeight: 600, color: T.NAVY,
          textAlign: 'center', lineHeight: 1.18, padding: '16px 8px 8px',
          maxWidth: 520, margin: '0 auto',
        }}>
          No statutory formula applies to your case.
        </div>
        <div style={{
          fontFamily: T.FONT_BODY, fontSize: 14.5, color: T.NAVY_70,
          textAlign: 'center', lineHeight: 1.6, maxWidth: 480, margin: '0 auto',
        }}>
          {STATE_NAME[metadata.state]} {TEMPORAL_LABEL[metadata.temporal].toLowerCase()} spousal
          support is decided by statutory factor analysis, not a percentage formula. Without children
          of the marriage, there is no child-support calculation either — so this tool cannot produce
          a planning figure here. The show-the-math panel and notes below explain what your judge
          considers instead.
        </div>

        <div style={{
          marginTop: 22, padding: '14px 18px',
          background: 'rgba(255,255,255,0.55)',
          border: `1px solid ${T.AMBER_BORDER}`,
          borderRadius: 8,
          display: 'flex', gap: 20, alignItems: 'baseline', justifyContent: 'center',
          flexWrap: 'wrap', textAlign: 'center',
          fontFamily: T.FONT_BODY, fontSize: 13.5, color: T.NAVY_70,
        }}>
          <span style={{ whiteSpace: 'nowrap' }}>
            <strong style={{ color: T.NAVY }}>What to do next →</strong>
          </span>
          <span>Consult an attorney · Read the factor-test notes below</span>
        </div>
      </div>
    );
  }

  const isCapHit = variant === 'cap_hit';
  const isGeneric = variant === 'generic_fallback';
  const isBidir = variant === 'high_earner_custodial';
  const isPrePop = variant === 'pre_pop';

  // Inline banner above hero for generic-fallback (cannot be missed).
  const topBanner = isGeneric ? (
    <div style={{
      margin: '-26px -28px 22px',
      padding: '10px 24px',
      background: T.AMBER,
      color: '#FFFEF7',
      borderRadius: '10px 10px 0 0',
      fontFamily: T.FONT_BODY, fontSize: 11.5, fontWeight: 700,
      letterSpacing: '0.08em', textTransform: 'uppercase',
      display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'nowrap',
      whiteSpace: 'nowrap',
    }}>
      <span style={{
        width: 16, height: 16, borderRadius: '50%',
        background: 'rgba(255,255,255,0.22)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, flex: '0 0 auto', fontWeight: 700,
      }}>!</span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
        National approximation · not {STATE_NAME[metadata.state] === 'Other state'
          ? metadata.stateName || 'your state'
          : STATE_NAME[metadata.state]} law
      </span>
    </div>
  ) : null;

  return (
    <div style={{
      background: T.PARCHMENT,
      border: `1px solid ${T.NAVY_12}`,
      borderRadius: 10, padding: '26px 28px 22px',
      position: 'relative', overflow: 'hidden',
    }}>
      {topBanner}

      <BadgeRow metadata={metadata} />

      <div style={{ textAlign: 'center', padding: '18px 0 6px' }}>
        <div style={{
          fontFamily: T.FONT_NUMERIC,
          fontWeight: 400,
          fontSize: 56,
          lineHeight: 1.0,
          color: T.GOLD,
          ...T.NUMERIC_STYLE,
          letterSpacing: '-0.012em',
          display: 'inline-block',
        }}>
          {fmtMoneyMo(combinedMonthly)}
        </div>
        <div style={{
          marginTop: 18, fontFamily: T.FONT_DISPLAY, fontSize: 16,
          color: T.NAVY_70, letterSpacing: '0.005em',
          fontStyle: 'italic', fontWeight: 500,
        }}>
          Combined monthly support
        </div>
        {isCapHit && (
          <div style={{
            marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '5px 12px',
            background: T.AMBER_BG, border: `1px solid ${T.AMBER_BORDER}`,
            borderRadius: 999, fontFamily: T.FONT_BODY,
            fontSize: 12.5, color: T.AMBER, fontWeight: 600,
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%', background: T.AMBER,
            }} />
            Income above NY $193K cap · discretionary above
          </div>
        )}
      </div>

      <div style={{ padding: '6px 0 18px' }}>
        <PartySentence
          metadata={metadata}
          combinedMonthly={combinedMonthly}
          framing={partyFraming}
        />
      </div>

      {isPrePop && metadata.prePopSources?.partyA && (
        <div style={{
          display: 'flex', justifyContent: 'center', marginBottom: 12,
        }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '3px 10px',
            background: T.GOLD_TINT,
            border: `1px solid ${T.GOLD_BORDER}`,
            borderRadius: 999,
            fontFamily: T.FONT_BODY, fontSize: 11.5, color: T.GOLD,
            fontWeight: 600, letterSpacing: '0.04em',
          }}>
            <span style={{
              display: 'inline-block', width: 8, height: 8,
              background: T.GOLD, borderRadius: 2, transform: 'rotate(45deg)',
            }} />
            Party A income sourced from {metadata.prePopSources.partyA}
          </span>
        </div>
      )}

      <div style={{
        background: T.CARD,
        border: `1px solid ${T.NAVY_12}`,
        borderRadius: 8,
        display: 'flex',
        alignItems: 'stretch',
        overflow: 'hidden',
      }}>
        <SplitLine
          label="Child support"
          amount={isBidir ? null : childMonthly}
          placeholder={isBidir}
        />
        <div style={{ width: 1, background: T.NAVY_12, alignSelf: 'stretch' }} />
        <SplitLine
          label="Spousal support"
          amount={spousalMonthly}
          annotation={
            (data.metadata.state === 'VA' && data.metadata.temporal === 'post_divorce' && spousalMonthly > 0)
              ? 'National approximation — factor test'
              : null
          }
        />
      </div>

      <div style={{
        marginTop: 16, textAlign: 'center',
        fontFamily: T.FONT_BODY, fontSize: 12, color: T.NAVY_55,
        fontStyle: 'italic',
      }}>
        Calculated using statutory values effective {asOf}
        {metadata.imputationApplied?.partyA && ' · imputation applied to Party A'}
        {metadata.imputationApplied?.partyB && ' · imputation applied to Party B'}
      </div>
    </div>
  );
}

function CalculationStep({ label, computation, result, num }) {
  const wide = String(num).length > 1;
  return (
    <div style={{
      display: 'flex', gap: 14, alignItems: 'flex-start',
      padding: '10px 0',
    }}>
      <div style={{
        flex: '0 0 auto', minWidth: 28, height: 28,
        padding: wide ? '0 8px' : 0,
        borderRadius: wide ? 14 : '50%',
        border: `1.5px solid ${T.NAVY_12}`,
        background: T.PARCHMENT,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: T.FONT_NUMERIC, fontWeight: 500, color: T.NAVY_70,
        fontSize: 13,
        ...T.NUMERIC_STYLE,
      }}>
        {num}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: T.FONT_BODY, fontSize: 13.5,
          fontWeight: 600, color: T.NAVY, marginBottom: 3,
        }}>{label}</div>
        <div style={{
          fontFamily: T.FONT_DISPLAY, fontStyle: 'italic',
          fontSize: 13.5, color: T.NAVY_70, lineHeight: 1.5,
        }}>{computation}</div>
      </div>
      <div style={{
        flex: '0 0 auto', minWidth: 80, textAlign: 'right',
        fontFamily: T.FONT_NUMERIC, fontWeight: 500, fontSize: 19,
        color: result == null ? T.NAVY_38 : T.NAVY,
        ...T.NUMERIC_STYLE,
        letterSpacing: '-0.003em', paddingTop: 1,
      }}>
        {result == null ? '—' : fmtMoney(result)}
      </div>
    </div>
  );
}

function ShowTheMath({ data, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!data) return null;

  const steps = data.breakdown?.perStepNarrative || [];
  const callouts = data.breakdown?.callouts || [];

  return (
    <div style={{
      marginTop: 14,
      background: T.CARD,
      border: `1px solid ${T.NAVY_12}`,
      borderRadius: 10,
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', background: 'transparent', border: 0, cursor: 'pointer',
          fontFamily: T.FONT_BODY, color: T.NAVY, textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <span style={{
            fontFamily: T.FONT_DISPLAY, fontSize: 18, fontWeight: 600, color: T.NAVY,
            whiteSpace: 'nowrap',
          }}>Show the math</span>
          <span style={{
            fontFamily: T.FONT_BODY, fontSize: 12, color: T.NAVY_55,
            whiteSpace: 'nowrap',
          }}>
            {steps.length} step{steps.length === 1 ? '' : 's'} · {callouts.length} note{callouts.length === 1 ? '' : 's'}
          </span>
        </div>
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 24, height: 24,
          color: T.GOLD, fontSize: 14,
          transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'transform 180ms ease',
        }}>▸</span>
      </button>

      {open && (
        <div style={{ padding: '0 20px 20px' }}>
          <div style={{
            padding: '10px 0 4px',
            borderTop: `1px solid ${T.NAVY_06}`,
          }}>
            <div style={{
              fontFamily: T.FONT_BODY, fontSize: 10.5, fontWeight: 700,
              letterSpacing: '0.14em', textTransform: 'uppercase',
              color: T.GOLD, marginBottom: 4, paddingTop: 12,
            }}>
              Calculation
            </div>
            {[...steps].sort((a, b) => a.step - b.step).map((s) => {
              // Inline alimony-first narrative between step_1 and step_3.
              if (s.stepId === 'step_2_alimony_first_ordering') {
                return <AlimonyFirstOrdering key={s.stepId} />;
              }
              return (
                <CalculationStep
                  key={s.stepId}
                  num={stepDisplayId(s.stepId)}
                  label={s.label}
                  computation={s.computation}
                  result={s.result}
                />
              );
            })}
          </div>

          {callouts.length > 0 && (
            <div style={{ paddingTop: 18 }}>
              <div style={{
                fontFamily: T.FONT_BODY, fontSize: 10.5, fontWeight: 700,
                letterSpacing: '0.14em', textTransform: 'uppercase',
                color: T.GOLD, marginBottom: 10,
              }}>
                Notes & disclosures
              </div>
              <CalloutStack callouts={callouts} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ResultsPanel({ data, variant = 'numeric', partyFraming = 'abstract', defaultMathOpen = false }) {
  return (
    <div style={{
      width: '100%', maxWidth: 720,
      fontFamily: T.FONT_BODY,
    }}>
      <Hero data={data} variant={variant} partyFraming={partyFraming} />
      {data && variant !== 'placeholder' && (
        <ShowTheMath data={data} defaultOpen={defaultMathOpen} />
      )}
    </div>
  );
}
