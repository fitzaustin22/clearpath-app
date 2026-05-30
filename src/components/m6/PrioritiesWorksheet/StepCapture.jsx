'use client';

/**
 * Step 1 — Capture. Free-text add (items enter as 'unsorted'), optional in-tool
 * note (never written to the payload), forgettable-asset suggestion chips, and
 * an editable list. Continue is gated on having at least one item.
 */

import { useState } from 'react';
import { T } from '@/src/lib/brand/tokens';
import { useM6Store } from '@/src/stores/m6Store';
import { PRIORITIES_COPY } from './copy';
import { PrimaryButton, SecondaryButton, ChipButton } from './ui';

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

export default function StepCapture({ onNext, onBack }) {
  const c = PRIORITIES_COPY.capture;
  const items = useM6Store((s) => s.priorities.items);
  const addPriority = useM6Store((s) => s.addPriority);
  const updatePriority = useM6Store((s) => s.updatePriority);
  const removePriority = useM6Store((s) => s.removePriority);

  const [draft, setDraft] = useState('');
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editItem, setEditItem] = useState('');
  const [editNote, setEditNote] = useState('');

  const handleAdd = () => {
    const text = draft.trim();
    if (!text) return;
    addPriority({ item: text });
    if (note.trim()) {
      const list = useM6Store.getState().priorities.items;
      const justAdded = list[list.length - 1];
      if (justAdded) updatePriority(justAdded.id, { note: note.trim() });
    }
    setDraft('');
    setNote('');
    setShowNote(false);
  };

  const startEdit = (it) => {
    setEditingId(it.id);
    setEditItem(it.item);
    setEditNote(it.note || '');
  };

  const saveEdit = () => {
    updatePriority(editingId, { item: editItem, note: editNote });
    setEditingId(null);
  };

  return (
    <div data-testid="priorities-step-capture">
      <h2
        style={{
          fontFamily: T.FONT_DISPLAY,
          fontWeight: 700,
          fontSize: 24,
          color: T.NAVY,
          margin: '0 0 8px 0',
        }}
      >
        {c.title}
      </h2>
      <p style={{ fontFamily: T.FONT_BODY, fontSize: 15, lineHeight: 1.55, color: T.INK_2, margin: '0 0 20px 0' }}>
        {c.subhead}
      </p>

      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <input
          aria-label={c.inputPlaceholder}
          value={draft}
          placeholder={c.inputPlaceholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
          style={inputStyle}
        />
        <PrimaryButton onClick={handleAdd}>{c.add}</PrimaryButton>
      </div>

      <button
        type="button"
        onClick={() => setShowNote((v) => !v)}
        aria-expanded={showNote}
        style={{
          backgroundColor: 'transparent',
          border: 'none',
          color: T.NAVY_55,
          fontFamily: T.FONT_BODY,
          fontSize: 13,
          cursor: 'pointer',
          padding: '8px 0',
        }}
      >
        {c.noteToggle}
      </button>
      {showNote && (
        <input
          aria-label={c.noteToggle}
          value={note}
          placeholder={c.notePlaceholder}
          maxLength={140}
          onChange={(e) => setNote(e.target.value)}
          style={{ ...inputStyle, marginBottom: 4 }}
        />
      )}

      <div style={{ marginTop: 20 }}>
        <div
          style={{
            fontFamily: T.FONT_BODY,
            fontWeight: 600,
            fontSize: 12,
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
            color: T.MUTED,
            marginBottom: 10,
          }}
        >
          {c.suggestHeader}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {c.chips.map((label) => (
            <ChipButton key={label} onClick={() => addPriority({ item: label })} ariaLabel={`${c.add}: ${label}`}>
              + {label}
            </ChipButton>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        {items.length === 0 ? (
          <p
            data-testid="priorities-capture-empty"
            style={{ fontFamily: T.FONT_BODY, fontSize: 14, lineHeight: 1.55, color: T.MUTED, margin: 0 }}
          >
            {c.emptyState}
          </p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {items.map((it) => (
              <li
                key={it.id}
                style={{
                  borderTop: `1px solid ${T.LINE}`,
                  padding: '12px 0',
                }}
              >
                {editingId === it.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input aria-label={c.title} value={editItem} onChange={(e) => setEditItem(e.target.value)} style={inputStyle} />
                    <input
                      aria-label={c.noteToggle}
                      value={editNote}
                      placeholder={c.notePlaceholder}
                      maxLength={140}
                      onChange={(e) => setEditNote(e.target.value)}
                      style={inputStyle}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <PrimaryButton onClick={saveEdit}>{c.add}</PrimaryButton>
                      <SecondaryButton onClick={() => setEditingId(null)}>{PRIORITIES_COPY.common.back}</SecondaryButton>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: T.FONT_BODY, fontSize: 15, color: T.INK }}>{it.item}</div>
                      {it.note && (
                        <div style={{ fontFamily: T.FONT_BODY, fontSize: 13, color: T.MUTED, marginTop: 2 }}>{it.note}</div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <SecondaryButton onClick={() => startEdit(it)}>{PRIORITIES_COPY.common.edit}</SecondaryButton>
                      <SecondaryButton onClick={() => removePriority(it.id)}>{PRIORITIES_COPY.common.remove}</SecondaryButton>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 28 }}>
        <SecondaryButton onClick={onBack}>{PRIORITIES_COPY.common.back}</SecondaryButton>
        <div style={{ textAlign: 'right' }}>
          <PrimaryButton onClick={onNext} disabled={items.length === 0}>
            {c.continue}
          </PrimaryButton>
          {items.length === 0 && (
            <div style={{ fontFamily: T.FONT_BODY, fontSize: 12, color: T.MUTED, marginTop: 6 }}>{c.continueDisabled}</div>
          )}
        </div>
      </div>
    </div>
  );
}
