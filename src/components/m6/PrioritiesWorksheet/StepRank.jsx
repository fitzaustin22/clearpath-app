'use client';

/**
 * Step 3 — Rank. Two sealed zones (Must-Haves above Would-Likes), each
 * reorderable within itself via up/down arrows (disabled at the ends, no wrap,
 * no cross-zone). Willing-to-Trade is shown in a separate lock-badged block —
 * not ranked, no arrows, so it is excluded from the reorder tab order. A polite
 * live region announces the new position and zone after each move.
 */

import { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { T } from '@/src/lib/brand/tokens';
import { useM6Store } from '@/src/stores/m6Store';
import { PRIORITIES_COPY } from './copy';
import { PrimaryButton, SecondaryButton, LockBadge } from './ui';

const srOnly = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

const zoneHeaderStyle = {
  fontFamily: T.FONT_BODY,
  fontWeight: 700,
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: '0.6px',
  color: T.MUTED,
  margin: '0 0 8px 0',
};

function ArrowButton({ label, disabled, onClick, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 30,
        height: 30,
        borderRadius: 6,
        border: `1px solid ${T.LINE_STRONG}`,
        backgroundColor: T.CARD,
        color: disabled ? T.NAVY_38 : T.NAVY,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}

export default function StepRank({ onNext, onBack }) {
  const c = PRIORITIES_COPY.rank;
  const items = useM6Store((s) => s.priorities.items);
  const reorderWithin = useM6Store((s) => s.reorderWithin);
  const [announcement, setAnnouncement] = useState('');

  const mustHaves = items.filter((it) => it.importance === 'must-have');
  const wouldLikes = items.filter((it) => it.importance === 'would-like');
  const willing = items.filter((it) => it.importance === 'willing-to-trade');
  const privateLabel = PRIORITIES_COPY.sort.options['willing-to-trade'].privateLabel;

  const move = (importance, list, zoneName, index, dir) => {
    const ids = list.map((it) => it.id);
    const target = index + dir;
    if (target < 0 || target >= ids.length) return; // no wrap, no cross-zone
    const next = [...ids];
    [next[index], next[target]] = [next[target], next[index]];
    reorderWithin(importance, next);
    setAnnouncement(`${list[index].item} moved to position ${target + 1} of ${ids.length} in ${zoneName}.`);
  };

  const renderZone = (importance, header, zoneName, list) => (
    <div style={{ marginBottom: 24 }}>
      <p style={zoneHeaderStyle}>{header}</p>
      {list.length === 0 ? (
        <p style={{ fontFamily: T.FONT_BODY, fontSize: 14, color: T.MUTED, margin: 0 }}>—</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {list.map((it, i) => (
            <li
              key={it.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
                border: `1px solid ${T.LINE}`,
                borderRadius: 8,
                marginBottom: 8,
                backgroundColor: T.CARD,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 24,
                  height: 24,
                  borderRadius: 999,
                  backgroundColor: T.NAVY_06,
                  fontFamily: T.FONT_BODY,
                  fontWeight: 700,
                  fontSize: 13,
                  color: T.NAVY,
                }}
              >
                {i + 1}
              </span>
              <span style={{ flex: 1, fontFamily: T.FONT_BODY, fontSize: 15, color: T.INK }}>{it.item}</span>
              <ArrowButton
                label={`Move ${it.item} up in ${zoneName}, currently position ${i + 1} of ${list.length}`}
                disabled={i === 0}
                onClick={() => move(importance, list, zoneName, i, -1)}
              >
                <ChevronUp size={16} />
              </ArrowButton>
              <ArrowButton
                label={`Move ${it.item} down in ${zoneName}, currently position ${i + 1} of ${list.length}`}
                disabled={i === list.length - 1}
                onClick={() => move(importance, list, zoneName, i, 1)}
              >
                <ChevronDown size={16} />
              </ArrowButton>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div data-testid="priorities-step-rank">
      <h2 style={{ fontFamily: T.FONT_DISPLAY, fontWeight: 700, fontSize: 24, color: T.NAVY, margin: '0 0 8px 0' }}>
        {c.title}
      </h2>
      <p style={{ fontFamily: T.FONT_BODY, fontSize: 15, lineHeight: 1.55, color: T.INK_2, margin: '0 0 20px 0' }}>
        {c.subhead}
      </p>

      {renderZone('must-have', c.mustHavesHeader, 'Must-Haves', mustHaves)}
      {renderZone('would-like', c.wouldLikesHeader, 'Would-Likes', wouldLikes)}

      {willing.length > 0 && (
        <div
          data-testid="priorities-rank-willing"
          style={{ border: `1px solid ${T.LINE}`, borderRadius: 8, padding: 16, backgroundColor: T.PARCHMENT, marginBottom: 8 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontFamily: T.FONT_BODY, fontWeight: 700, fontSize: 14, color: T.NAVY }}>{c.willingBlockHeading}</span>
            <LockBadge label={privateLabel} />
          </div>
          <p style={{ fontFamily: T.FONT_BODY, fontSize: 13, lineHeight: 1.5, color: T.INK_2, margin: '0 0 10px 0' }}>
            {c.willingBlockBody}
          </p>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {willing.map((it) => (
              <li key={it.id} style={{ fontFamily: T.FONT_BODY, fontSize: 15, color: T.INK, padding: '4px 0' }}>
                {it.item}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div aria-live="polite" style={srOnly}>{announcement}</div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 28 }}>
        <SecondaryButton onClick={onBack}>{PRIORITIES_COPY.common.back}</SecondaryButton>
        <PrimaryButton onClick={onNext}>{c.continue}</PrimaryButton>
      </div>
    </div>
  );
}
