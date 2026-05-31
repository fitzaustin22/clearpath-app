'use client';

/**
 * Screen 2 — Map to Priorities. The ONLY place addressed/silent is decided, and
 * the USER decides it — the tool never guesses. The spine is the user's secure
 * priorities (the Phase 1 payload). For each, a binary segmented control writes
 * the tag (addressed) or clears it (silent) via tagPriority / untagPriority.
 *
 * With no priorities set, the offer is still fully recordable — a neutral
 * pointer sends the user to the Priorities Worksheet to map against later.
 */

import { T } from '@/src/lib/brand/tokens';
import { useM6Store, buildPrioritiesPayload } from '@/src/stores/m6Store';
import WizardRadio from '@/src/components/wizard/WizardRadio';
import { OFFER_COPY } from './copy';
import { PrimaryButton, SecondaryButton } from './ui';

export default function StepMap({ onNext, onBack }) {
  const c = OFFER_COPY.map;
  const items = useM6Store((s) => s.priorities.items);
  const offer = useM6Store((s) => s.offerOrganizer.offer);
  const tagPriority = useM6Store((s) => s.tagPriority);
  const untagPriority = useM6Store((s) => s.untagPriority);

  const priorities = buildPrioritiesPayload(items);
  const tags = (offer && offer.priorityTags) || {};

  const onChoose = (key, value) => {
    if (value === 'addressed') tagPriority(key);
    else untagPriority(key);
  };

  return (
    <div data-testid="offer-organizer-step-map">
      <h2 style={{ fontFamily: T.FONT_DISPLAY, fontWeight: 700, fontSize: 24, color: T.NAVY, margin: '0 0 8px 0' }}>
        {c.title}
      </h2>
      <p style={{ fontFamily: T.FONT_BODY, fontSize: 15, lineHeight: 1.55, color: T.INK_2, margin: '0 0 20px 0' }}>
        {c.subhead}
      </p>

      {priorities.length === 0 ? (
        <p
          data-testid="offer-organizer-map-empty"
          style={{ fontFamily: T.FONT_BODY, fontSize: 14, lineHeight: 1.6, color: T.MUTED, margin: '0 0 20px 0' }}
        >
          {c.empty}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
          {priorities.map((p, i) => (
            <div
              key={`${p.item}-${i}`}
              style={{ border: `1px solid ${T.LINE}`, borderRadius: 8, padding: 16 }}
            >
              <WizardRadio
                field={p.item}
                legend={p.item}
                variant="segmented"
                value={tags[p.item] === 'addressed' ? 'addressed' : 'silent'}
                onChange={onChoose}
                options={[
                  { value: 'addressed', label: c.addressed },
                  { value: 'silent', label: c.silent },
                ]}
              />
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
        <SecondaryButton onClick={onBack}>{OFFER_COPY.common.back}</SecondaryButton>
        <PrimaryButton onClick={onNext}>{c.continue}</PrimaryButton>
      </div>
    </div>
  );
}
