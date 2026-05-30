'use client';

/**
 * Step 2 — Sort. Per-item three-way single-select that moves each item from
 * 'unsorted' into one of the three tiers. Willing-to-Trade is marked Private
 * (lock icon + word, never colour alone). The reflection nudge is shown at most
 * once per mount; its once-seen flag is component-local React state, NOT a store
 * field, so persistence can never capture it and it resets on reload.
 */

import { useRef, useState } from 'react';
import { Lock } from 'lucide-react';
import { T } from '@/src/lib/brand/tokens';
import { useM6Store } from '@/src/stores/m6Store';
import { PRIORITIES_COPY, SORT_TIERS, OVERSIZED_MUST_HAVE_THRESHOLD } from './copy';
import { PrimaryButton, SecondaryButton, LockBadge } from './ui';

function TierPill({ label, selected, isPrivate, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontFamily: T.FONT_BODY,
        fontSize: 13,
        fontWeight: selected ? 700 : 500,
        color: T.INK,
        padding: '6px 12px',
        borderRadius: 999,
        border: selected ? `2px solid ${T.GOLD}` : `1px solid ${T.LINE_STRONG}`,
        backgroundColor: selected ? T.GOLD_TINT : T.CARD,
        cursor: 'pointer',
      }}
    >
      {isPrivate && <Lock size={11} aria-hidden="true" />}
      {label}
    </button>
  );
}

export default function StepSort({ onNext, onBack }) {
  const c = PRIORITIES_COPY.sort;
  const items = useM6Store((s) => s.priorities.items);
  const setPriorityImportance = useM6Store((s) => s.setPriorityImportance);

  // Once-seen flag for the reflection nudge — component-local, never persisted.
  const reflectionShownRef = useRef(false);
  const [showReflection, setShowReflection] = useState(false);

  const mustHaveCount = items.filter((it) => it.importance === 'must-have').length;
  const unsortedCount = items.filter((it) => it.importance === 'unsorted').length;

  const handleSet = (id, importance) => {
    setPriorityImportance(id, importance);
    if (importance === 'must-have' && !reflectionShownRef.current) {
      reflectionShownRef.current = true;
      setShowReflection(true);
    }
  };

  return (
    <div data-testid="priorities-step-sort">
      <h2 style={{ fontFamily: T.FONT_DISPLAY, fontWeight: 700, fontSize: 24, color: T.NAVY, margin: '0 0 8px 0' }}>
        {c.title}
      </h2>
      <p style={{ fontFamily: T.FONT_BODY, fontSize: 15, lineHeight: 1.55, color: T.INK_2, margin: '0 0 20px 0' }}>
        {c.subhead}
      </p>

      {/* Legend — tier labels + help, with the Private treatment + explainer. */}
      <div style={{ border: `1px solid ${T.LINE}`, borderRadius: 8, padding: 16, marginBottom: 24, backgroundColor: T.PARCHMENT }}>
        {SORT_TIERS.map((tier) => {
          const opt = c.options[tier];
          return (
            <div key={tier} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: T.FONT_BODY, fontWeight: 700, fontSize: 13, color: T.NAVY }}>{opt.label}</span>
                {opt.private && <LockBadge label={opt.privateLabel} />}
              </div>
              <div style={{ fontFamily: T.FONT_BODY, fontSize: 13, color: T.INK_2, marginTop: 2 }}>{opt.help}</div>
            </div>
          );
        })}
        <div style={{ fontFamily: T.FONT_BODY, fontSize: 12, lineHeight: 1.5, color: T.MUTED, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${T.LINE}` }}>
          {c.privacyExplainer}
        </div>
      </div>

      {/* Per-item three-way selector. */}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {items.map((it) => (
          <li key={it.id} style={{ borderTop: `1px solid ${T.LINE}`, padding: '14px 0' }}>
            <div style={{ fontFamily: T.FONT_BODY, fontSize: 15, color: T.INK, marginBottom: 8 }}>{it.item}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SORT_TIERS.map((tier) => {
                const opt = c.options[tier];
                return (
                  <TierPill
                    key={tier}
                    label={opt.label}
                    isPrivate={Boolean(opt.private)}
                    selected={it.importance === tier}
                    onClick={() => handleSet(it.id, tier)}
                  />
                );
              })}
            </div>
          </li>
        ))}
      </ul>

      {showReflection && (
        <div
          role="note"
          style={{ marginTop: 20, border: `1px solid ${T.GOLD_BORDER}`, backgroundColor: T.GOLD_TINT, borderRadius: 8, padding: 14 }}
        >
          <div style={{ fontFamily: T.FONT_BODY, fontSize: 14, lineHeight: 1.5, color: T.INK_2 }}>{c.reflectionNudge}</div>
          <div style={{ marginTop: 8 }}>
            <SecondaryButton onClick={() => setShowReflection(false)}>{c.reflectionDismiss}</SecondaryButton>
          </div>
        </div>
      )}

      {mustHaveCount >= OVERSIZED_MUST_HAVE_THRESHOLD && (
        <div
          role="note"
          style={{ marginTop: 16, border: `1px solid ${T.AMBER_BORDER}`, backgroundColor: T.AMBER_BG, borderRadius: 8, padding: 14, fontFamily: T.FONT_BODY, fontSize: 14, lineHeight: 1.5, color: T.INK_2 }}
        >
          {c.oversizedCoaching}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, gap: 16 }}>
        <SecondaryButton onClick={onBack}>{PRIORITIES_COPY.common.back}</SecondaryButton>
        <div style={{ textAlign: 'right' }}>
          {unsortedCount > 0 && (
            <div style={{ fontFamily: T.FONT_BODY, fontSize: 12, color: T.MUTED, marginBottom: 6 }}>{c.unsortedFlag(unsortedCount)}</div>
          )}
          <PrimaryButton onClick={onNext}>{c.continue}</PrimaryButton>
        </div>
      </div>
    </div>
  );
}
