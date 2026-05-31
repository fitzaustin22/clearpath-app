'use client';

/**
 * Screen 3 — Review & Save. Shows the neutral overview the user is about to keep:
 * the two-status priority map, the gap list (what the offer is silent on), and
 * the display-only Blueprint-figure reference. Saving is EXPLICIT (no auto-write)
 * via saveOfferToBlueprint → toast + inline confirmation. The repeated disclaimer
 * keeps the framing honest: an organizing overview, not an evaluation.
 */

import { useState } from 'react';
import Link from 'next/link';
import { T } from '@/src/lib/brand/tokens';
import { useM6Store, buildOfferMap, buildOfferGaps, buildPrioritiesPayload } from '@/src/stores/m6Store';
import useToastStore from '@/src/stores/toastStore';
import { OFFER_COPY } from './copy';
import { PrimaryButton, SecondaryButton, Disclaimer, StatusPill } from './ui';
import BlueprintReference from './BlueprintReference';

const subHeaderStyle = { fontFamily: T.FONT_DISPLAY, fontWeight: 700, fontSize: 16, color: T.NAVY, margin: '0 0 12px 0' };

export default function StepReview({ onBack }) {
  const c = OFFER_COPY.review;
  const offer = useM6Store((s) => s.offerOrganizer.offer);
  const items = useM6Store((s) => s.priorities.items);
  const saveOfferToBlueprint = useM6Store((s) => s.saveOfferToBlueprint);
  const [saved, setSaved] = useState(false);

  const map = buildOfferMap(offer, buildPrioritiesPayload(items));
  const gaps = buildOfferGaps(offer);

  const handleSave = () => {
    saveOfferToBlueprint();
    useToastStore.getState().show({ message: c.success, variant: 'success' });
    setSaved(true);
  };

  return (
    <div data-testid="offer-organizer-step-review">
      <h2 style={{ fontFamily: T.FONT_DISPLAY, fontWeight: 700, fontSize: 24, color: T.NAVY, margin: '0 0 20px 0' }}>
        {c.title}
      </h2>

      {/* Priority map */}
      <section style={{ marginBottom: 24 }}>
        <div style={subHeaderStyle}>{c.mapHeading}</div>
        {map.length > 0 ? (
          <div>
            {map.map((m, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '8px 0',
                  borderTop: i === 0 ? 'none' : `1px solid ${T.LINE}`,
                }}
              >
                <span style={{ fontFamily: T.FONT_BODY, fontSize: 15, color: T.INK }}>{m.priority}</span>
                <StatusPill status={m.status} />
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontFamily: T.FONT_BODY, fontSize: 14, lineHeight: 1.55, color: T.MUTED, margin: 0 }}>
            {c.emptyMap}
          </p>
        )}
      </section>

      {/* Gaps */}
      {gaps.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <div style={subHeaderStyle}>{c.gapsHeading}</div>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {gaps.map((g) => (
              <li key={g.key} style={{ fontFamily: T.FONT_BODY, fontSize: 15, color: T.INK_2, padding: '3px 0' }}>
                {g.text}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Display-only Blueprint reference */}
      <section style={{ marginBottom: 24 }}>
        <BlueprintReference />
      </section>

      <div style={{ marginBottom: 20 }}>
        <Disclaimer>{c.disclaimer}</Disclaimer>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <SecondaryButton onClick={onBack}>{OFFER_COPY.common.back}</SecondaryButton>
        <PrimaryButton onClick={handleSave}>{c.save}</PrimaryButton>
      </div>

      {saved && (
        <div
          data-testid="offer-organizer-save-success"
          role="status"
          style={{ marginTop: 16, border: `1px solid ${T.GREEN}`, backgroundColor: '#EAF5EE', borderRadius: 8, padding: 14 }}
        >
          <div style={{ fontFamily: T.FONT_BODY, fontSize: 14, color: T.INK, marginBottom: 6 }}>{c.success}</div>
          <Link href="/blueprint" style={{ fontFamily: T.FONT_BODY, fontSize: 14, fontWeight: 700, color: T.NAVY }}>
            {c.viewBlueprint} →
          </Link>
        </div>
      )}
    </div>
  );
}
