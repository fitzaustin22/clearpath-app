'use client';
import { useState } from 'react';
import { T } from '@/src/lib/brand/tokens';
import RangeTrack from './RangeTrack';
import { Disclaimer, PrimaryButton, SecondaryButton } from './ui';
import {
  RESULTS_EYEBROW, WHAT_CHANGES, SHOW_THE_MATH, SHOW_THE_MATH_LEADS, mathNote,
  DISCLAIMER_LABEL, DISCLAIMER_BODY, SAVE_LABEL, SAVED_LABEL, EDIT_LABEL,
} from './copy';

const money = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('en-US');
const labelCss = { fontFamily: T.FONT_BODY, fontSize: 11, fontWeight: 700, letterSpacing: '0.9px', textTransform: 'uppercase', color: T.INK };
const Card = ({ children }) => (<div style={{ backgroundColor: T.CARD, border: `1px solid ${T.LINE}`, borderRadius: 12, padding: '18px 32px' }}>{children}</div>);

function CheckIcon() {
  return (<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.GREEN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>);
}

function Block({ label, band, driver, duration }) {
  if (band.direction === 'none') {
    return (
      <div>
        <div style={labelCss}>{label.toUpperCase()}</div>
        <div style={{ fontFamily: T.FONT_BODY, fontSize: 14, color: T.INK_2, marginTop: 8 }}>{driver}</div>
      </div>
    );
  }
  return (
    <div>
      <div style={labelCss}>{label.toUpperCase()}</div>
      <RangeTrack low={band.low} likely={band.likely} high={band.high} />
      <div style={{ fontFamily: T.FONT_BODY, fontSize: 14, color: T.INK_2, maxWidth: 620, marginTop: 12 }}>{driver}</div>
      {duration && (
        <div style={{ fontFamily: T.FONT_BODY, fontSize: 12.5, color: T.MUTED, marginTop: 6 }}>
          Likely duration: <span style={{ fontWeight: 600, color: T.INK_2 }}>{duration}</span>
        </div>
      )}
    </div>
  );
}

export default function StepResults({ estimate, saved, onSave, onEdit }) {
  const [showMath, setShowMath] = useState(false);
  const e = estimate;
  return (
    <div data-testid="se-step-results" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Headline */}
      <div style={{ backgroundColor: T.PARCHMENT, border: `1px solid ${T.GOLD}`, borderRadius: 12, padding: '30px 34px' }}>
        <div style={{ fontFamily: T.FONT_BODY, fontSize: 12, fontWeight: 700, letterSpacing: '1.4px', textTransform: 'uppercase', color: T.MUTED }}>{RESULTS_EYEBROW}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span data-testid="se-headline"
            aria-label={`${Math.round(Number(e.combined.headline) || 0).toLocaleString('en-US')} dollars per month`}
            style={{ fontFamily: T.FONT_DISPLAY, fontWeight: 700, fontSize: 52, color: T.GOLD }}>{money(e.combined.headline)}</span>
          <span style={{ fontFamily: T.FONT_BODY, fontSize: 18, color: T.INK_2 }}>/ month</span>
        </div>
        <div style={{ width: 96, height: 2, backgroundColor: T.GOLD, margin: '8px 0 12px' }} />
        <div style={{ fontFamily: T.FONT_BODY, fontSize: 15, color: T.INK_2 }}>{e.combined.sub}</div>
        <div style={{ fontFamily: T.FONT_BODY, fontSize: 12.5, color: T.MUTED, marginTop: 6 }}>{e.summaryLine}</div>
      </div>

      {/* Breakdown */}
      <div style={{ backgroundColor: T.CARD, border: `1px solid ${T.LINE}`, borderRadius: 12, padding: '20px 32px 26px' }}>
        <Block label={e.spousal.label} band={e.spousal} driver={e.spousal.driver} duration={e.duration !== '—' ? e.duration : null} />
        <div style={{ borderTop: `1px solid ${T.LINE}`, marginTop: 20, paddingTop: 20 }}>
          <Block label={e.child.label} band={e.child} driver={e.child.driver} />
        </div>
      </div>

      {/* What changes this number */}
      <Card>
        <div style={labelCss}>WHAT CHANGES THIS NUMBER</div>
        {WHAT_CHANGES.map(([lead, rest]) => (
          <div key={lead} style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: T.GOLD, marginTop: 7, flex: '0 0 auto' }} />
            <div style={{ fontFamily: T.FONT_BODY, fontSize: 14, color: T.INK_2 }}>
              <strong style={{ color: T.INK }}>{lead}</strong> {rest}
            </div>
          </div>
        ))}
      </Card>

      {/* Show the math */}
      <Card>
        <button type="button" aria-expanded={showMath} onClick={() => setShowMath((v) => !v)} data-testid="se-toggle-math"
          style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <span style={{ textAlign: 'left' }}>
            <span style={{ display: 'block', fontFamily: T.FONT_DISPLAY, fontWeight: 600, fontSize: 18, color: T.NAVY }}>Show the math</span>
            <span style={{ fontFamily: T.FONT_BODY, fontSize: 13, color: T.MUTED }}>how we arrived at this</span>
          </span>
          <span style={{ fontFamily: T.FONT_BODY, fontSize: 13, fontWeight: 600, color: T.PILL_TEXT }}>{showMath ? 'Hide ↑' : 'Show ↓'}</span>
        </button>
        {showMath && (
          <div style={{ borderTop: `1px solid ${T.LINE}`, marginTop: 14, paddingTop: 14 }}>
            {SHOW_THE_MATH.map((text, i) => {
              const lead = SHOW_THE_MATH_LEADS[i];
              const parts = lead ? text.split(lead) : null;
              return (
                <div key={i} style={{ display: 'flex', gap: 10, marginTop: i ? 12 : 0 }}>
                  <span style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: T.PARCHMENT_DEEP, color: T.PILL_TEXT, fontFamily: T.FONT_BODY, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>{i + 1}</span>
                  <span style={{ fontFamily: T.FONT_BODY, fontSize: 14, color: T.INK_2 }}>
                    {parts ? (<>{parts[0]}<strong style={{ color: T.INK }}>{lead}</strong>{parts[1]}</>) : text}
                  </span>
                </div>
              );
            })}
            <div style={{ marginTop: 14, borderLeft: `3px solid ${T.GOLD}`, backgroundColor: T.GOLD_TINT, borderRadius: 8, padding: '12px 14px', fontFamily: T.FONT_BODY, fontSize: 13, color: T.INK_2 }}>
              {mathNote(e.stateName)}
            </div>
          </div>
        )}
      </Card>

      {/* Disclaimer */}
      <Disclaimer label={DISCLAIMER_LABEL}>{DISCLAIMER_BODY}</Disclaimer>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {saved ? (
          <span data-testid="se-saved-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, backgroundColor: T.CARD, border: `1px solid ${T.GOLD}`, borderRadius: 999, padding: '10px 18px', fontFamily: T.FONT_BODY, fontSize: 14, fontWeight: 600, color: T.INK }}>
            <CheckIcon /> {SAVED_LABEL}
          </span>
        ) : (
          // TODO(design): disabled styling for Save on blank income — pending spec.
          <PrimaryButton onClick={onSave} data-testid="se-save">{SAVE_LABEL}</PrimaryButton>
        )}
        <SecondaryButton onClick={onEdit} data-testid="se-edit">{EDIT_LABEL}</SecondaryButton>
      </div>
    </div>
  );
}
