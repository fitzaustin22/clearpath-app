'use client';

/**
 * Step 1 — Build Trades. Per trade: one "get" (what you want to win) paired with
 * one or more "gives" (what you'd offer). Gets come from the secure priorities
 * (selectSecureGets) plus free-text; gives come from the marital-estate asset
 * allowlist (selectTradeableGives) plus free-text. M2 gives show their value via
 * formatUSD — informational only, never summed or scored.
 *
 * Privacy invariant: willing-to-trade items render ONLY as a display-only
 * "Private" hint. They are never selectable into a give and never snapshotted —
 * to use one, the user retypes it as free-text. The give source is M2 assets, so
 * a willing-to-trade priority can never enter a trade through the picker.
 */

import { useMemo, useState } from 'react';
import { T } from '@/src/lib/brand/tokens';
import {
  useM6Store,
  selectSecureGets,
  selectTradeableGives,
  selectWillingToTrade,
} from '@/src/stores/m6Store';
import { useM2Store } from '@/src/stores/m2Store';
import { formatUSD } from '@/src/lib/format/currency';
import { TRADEOFF_COPY } from './copy';
import { PrimaryButton, SecondaryButton, ChipButton, LockBadge } from './ui';

const inputStyle = {
  width: '100%',
  fontFamily: T.FONT_BODY,
  fontSize: 15,
  color: T.INK,
  padding: '10px 12px',
  borderRadius: 8,
  border: `1px solid ${T.LINE_STRONG}`,
  backgroundColor: T.CARD,
  boxSizing: 'border-box',
};

const labelStyle = { fontFamily: T.FONT_BODY, fontWeight: 700, fontSize: 14, color: T.NAVY, margin: '0 0 4px 0' };
const helpStyle = { fontFamily: T.FONT_BODY, fontSize: 13, color: T.INK_2, margin: '0 0 10px 0' };
const valueStyle = { fontFamily: T.FONT_BODY, fontSize: 12, color: T.MUTED, marginLeft: 8 };

function TradeRow({ row, gives, onAddGive, onRemoveGive, onRemoveRow, onNote }) {
  const c = TRADEOFF_COPY.build;
  const [draft, setDraft] = useState('');
  const [showNote, setShowNote] = useState(Boolean(row.note));

  // Hide M2 assets already added to this row (avoid duplicate gives).
  const usedSourceIds = new Set(row.give.map((g) => g.sourceId).filter(Boolean));
  const available = gives.filter((g) => !usedSourceIds.has(g.id));

  const addCustom = () => {
    const label = draft.trim();
    if (!label) return;
    onAddGive(row.id, { label, value: null, source: 'free-text', sourceId: null });
    setDraft('');
  };

  return (
    <div
      data-testid="trade-off-row"
      style={{ border: `1px solid ${T.LINE}`, borderRadius: 8, padding: 16, marginBottom: 14 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ fontFamily: T.FONT_BODY, fontSize: 16, fontWeight: 700, color: T.NAVY }}>{row.get.label}</div>
        <SecondaryButton onClick={() => onRemoveRow(row.id)}>{TRADEOFF_COPY.common.remove}</SecondaryButton>
      </div>

      <div style={{ marginTop: 12 }}>
        <p style={labelStyle}>{c.giveLabel}</p>
        <p style={helpStyle}>{c.giveHelp}</p>
        {available.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            {available.map((g) => (
              <ChipButton
                key={g.id}
                onClick={() => onAddGive(row.id, { label: g.label, value: g.value, source: 'm2-asset', sourceId: g.id })}
              >
                + {g.label}
                {g.value != null && <span style={valueStyle}>{formatUSD(g.value)}</span>}
              </ChipButton>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <input
            aria-label={c.giveLabel}
            value={draft}
            placeholder={c.givePlaceholder}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustom();
              }
            }}
            style={inputStyle}
          />
          <PrimaryButton onClick={addCustom}>{TRADEOFF_COPY.common.add}</PrimaryButton>
        </div>
      </div>

      {row.give.length > 0 && (
        <ul style={{ listStyle: 'none', margin: '12px 0 0 0', padding: 0 }}>
          {row.give.map((g) => (
            <li
              key={g.id}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}
            >
              <span style={{ fontFamily: T.FONT_BODY, fontSize: 15, color: T.INK }}>
                {g.label}
                {g.source === 'm2-asset' && g.value != null && (
                  <span style={valueStyle}>{formatUSD(g.value)}</span>
                )}
              </span>
              <SecondaryButton onClick={() => onRemoveGive(row.id, g.id)}>
                {TRADEOFF_COPY.common.remove}
              </SecondaryButton>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setShowNote((v) => !v)}
        aria-expanded={showNote}
        style={{ backgroundColor: 'transparent', border: 'none', color: T.NAVY_55, fontFamily: T.FONT_BODY, fontSize: 13, cursor: 'pointer', padding: '8px 0' }}
      >
        {c.noteToggle}
      </button>
      {showNote && (
        <input
          aria-label={c.noteToggle}
          value={row.note || ''}
          placeholder={c.notePlaceholder}
          maxLength={140}
          onChange={(e) => onNote(row.id, e.target.value)}
          style={{ ...inputStyle, marginBottom: 4 }}
        />
      )}
    </div>
  );
}

export default function StepBuild({ onNext, onBack }) {
  const c = TRADEOFF_COPY.build;
  const priorityItems = useM6Store((s) => s.priorities.items);
  const m2Items = useM2Store((s) => s.maritalEstateInventory.items);
  const rows = useM6Store((s) => s.tradeOffs.rows);
  const addTradeOff = useM6Store((s) => s.addTradeOff);
  const addGiveToTrade = useM6Store((s) => s.addGiveToTrade);
  const removeGiveFromTrade = useM6Store((s) => s.removeGiveFromTrade);
  const removeTradeOff = useM6Store((s) => s.removeTradeOff);
  const updateTradeOffNote = useM6Store((s) => s.updateTradeOffNote);

  const gets = useMemo(() => selectSecureGets({ priorities: { items: priorityItems } }), [priorityItems]);
  const gives = useMemo(() => selectTradeableGives({ maritalEstateInventory: { items: m2Items } }), [m2Items]);
  const willing = useMemo(() => selectWillingToTrade(priorityItems), [priorityItems]);

  const [getDraft, setGetDraft] = useState('');

  const addCustomGet = () => {
    const label = getDraft.trim();
    if (!label) return;
    addTradeOff({ get: { label, sourceId: null } });
    setGetDraft('');
  };

  return (
    <div data-testid="trade-off-step-build">
      <h2 style={{ fontFamily: T.FONT_DISPLAY, fontWeight: 700, fontSize: 24, color: T.NAVY, margin: '0 0 8px 0' }}>
        {c.title}
      </h2>
      <p style={{ fontFamily: T.FONT_BODY, fontSize: 15, lineHeight: 1.55, color: T.INK_2, margin: '0 0 20px 0' }}>
        {c.subhead}
      </p>

      {/* Get-picker */}
      <section style={{ marginBottom: 20 }}>
        <p style={labelStyle}>{c.getLabel}</p>
        <p style={helpStyle}>{c.getHelp}</p>
        {gets.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            {gets.map((g) => (
              <ChipButton key={g.id} ariaLabel={`${TRADEOFF_COPY.common.add}: ${g.label}`} onClick={() => addTradeOff({ get: { label: g.label, sourceId: g.id } })}>
                + {g.label}
              </ChipButton>
            ))}
          </div>
        ) : (
          <p
            data-testid="trade-off-get-empty"
            style={{ fontFamily: T.FONT_BODY, fontSize: 14, lineHeight: 1.55, color: T.MUTED, margin: '0 0 10px 0' }}
          >
            {c.getEmpty}
          </p>
        )}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <input
            data-testid="trade-off-get-freetext"
            aria-label={c.getLabel}
            value={getDraft}
            placeholder={c.getPlaceholder}
            onChange={(e) => setGetDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustomGet();
              }
            }}
            style={inputStyle}
          />
          <PrimaryButton onClick={addCustomGet}>{TRADEOFF_COPY.common.add}</PrimaryButton>
        </div>
      </section>

      {/* Willing-to-trade private hint — display-only, never selectable */}
      {willing.length > 0 && (
        <div
          data-testid="trade-off-wt-hint"
          style={{ border: `1px solid ${T.LINE}`, borderRadius: 8, padding: 16, marginBottom: 20, backgroundColor: T.PARCHMENT }}
        >
          <div style={{ marginBottom: 8 }}>
            <LockBadge label={c.wtPrivateLabel} />
          </div>
          <p style={{ fontFamily: T.FONT_BODY, fontSize: 13, lineHeight: 1.5, color: T.INK_2, margin: '0 0 8px 0' }}>
            {c.wtHint}
          </p>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {willing.map((w) => (
              <li
                key={w.id}
                style={{ fontFamily: T.FONT_BODY, fontSize: 13, color: T.MUTED, border: `1px dashed ${T.LINE_STRONG}`, borderRadius: 999, padding: '4px 12px' }}
              >
                {w.item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Garage-sale note — factual, no fees-vs-value math, no steer */}
      <p
        style={{ fontFamily: T.FONT_BODY, fontSize: 13, lineHeight: 1.5, color: T.INK_2, fontStyle: 'italic', margin: '0 0 20px 0' }}
      >
        {c.garageSaleNote}
      </p>

      {/* Trades built so far — each its own give-picker */}
      <div>
        {rows.map((row) => (
          <TradeRow
            key={row.id}
            row={row}
            gives={gives}
            onAddGive={addGiveToTrade}
            onRemoveGive={removeGiveFromTrade}
            onRemoveRow={removeTradeOff}
            onNote={updateTradeOffNote}
          />
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 24 }}>
        <SecondaryButton onClick={onBack}>{TRADEOFF_COPY.common.back}</SecondaryButton>
        <PrimaryButton onClick={onNext}>{c.continue}</PrimaryButton>
      </div>
    </div>
  );
}
