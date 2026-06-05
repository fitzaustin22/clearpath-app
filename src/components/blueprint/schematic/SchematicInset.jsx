'use client';

/**
 * SchematicInset — the dark recessed "blueprint paper" panel. Renders:
 *   • The single inline #glass-distortion SVG filter (one per page).
 *   • A one-shot <style> block with all .lg-* and .schematic-* CSS.
 *   • Four zones (A/B/C/D) with their labels and dashed-border grids.
 *   • 12 BlueprintCard children, mapped 1:1 from SCHEMATIC_CARDS to live store
 *     statuses via deriveBadge + deriveActiveStoreKey.
 *   • The title-block table at bottom-right (CLIENT = real Clerk userName,
 *     STATUS = verbatim "NOT LEGAL ADVICE").
 *
 * All wiring lives here; BlueprintCard is purely presentational.
 *
 * Reads:
 *   sections  — the blueprintStore.sections object (s1..s12)
 *   clientName — Clerk userName (already trimmed; "" → empty TBD value)
 *   lastUpdatedISO — store.lastUpdated (used for the ISSUED row)
 */

import { useMemo } from 'react';
import BlueprintCard from './BlueprintCard';
import { ZONES, SCHEMATIC_CARDS } from './sections';
import { deriveActiveStoreKey } from './deriveActive';
import { deriveBadge } from './deriveBadge';
import { SCHEMATIC_STYLES } from './schematicStyles';

function formatIssued(iso) {
  if (!iso) return '— · DRAFT';
  try {
    const d = new Date(iso);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} · DRAFT`;
  } catch {
    return '— · DRAFT';
  }
}

function GlassDistortionFilter() {
  // Inline SVG — one per page; referenced by .lg-effect via backdrop-filter: url(#glass-distortion).
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <filter id="glass-distortion" x="0%" y="0%" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.008 0.008" numOctaves="2" seed="92" result="noise" />
        <feGaussianBlur in="noise" stdDeviation="1.4" result="blur" />
        <feDisplacementMap in="SourceGraphic" in2="blur" scale="36" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  );
}

function ZoneGroup({ zone, cards, sections, activeKey }) {
  return (
    <div style={{ marginTop: 26 }}>
      <div className="schematic-zone-label">{zone.label}</div>
      <div className="schematic-zone">
        <div className={`schematic-zone-grid cols-${zone.columns}`}>
          {cards.map((card) => {
            const stored = sections?.[card.storeKey];
            const isActive = activeKey === card.storeKey;
            const badge = deriveBadge(stored?.status, isActive);
            return (
              <BlueprintCard
                key={card.storeKey}
                label={card.label}
                badgeLabel={badge.label}
                badgePillClass={badge.pillClass}
                isActive={isActive}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TitleBlock({ clientName, lastUpdatedISO }) {
  const displayClient = (clientName || '').trim() || '—';
  const issued = formatIssued(lastUpdatedISO);
  return (
    <div
      className="schematic-titleblock"
      style={{ display: 'block', marginLeft: 'auto', marginTop: 26 }}
    >
      <div className="schematic-tb-row">
        <div className="schematic-tb-label">PROJECT</div>
        <div className="schematic-tb-val">DIVORCE FINANCIAL PLAN</div>
      </div>
      <div className="schematic-tb-row">
        <div className="schematic-tb-label">CLIENT</div>
        <div className="schematic-tb-val">{displayClient.toUpperCase()}</div>
      </div>
      <div className="schematic-tb-row">
        <div className="schematic-tb-label">SHEET</div>
        <div className="schematic-tb-val">01 OF 01 · REV A</div>
      </div>
      <div className="schematic-tb-row">
        <div className="schematic-tb-label">ISSUED</div>
        <div className="schematic-tb-val">{issued}</div>
      </div>
      <div className="schematic-tb-row">
        <div className="schematic-tb-label">STATUS</div>
        <div className="schematic-tb-val">NOT LEGAL ADVICE</div>
      </div>
    </div>
  );
}

export default function SchematicInset({ sections, clientName, lastUpdatedISO }) {
  const activeKey = useMemo(() => deriveActiveStoreKey(sections), [sections]);

  const zoneA = ZONES[0];
  const zoneB = ZONES[1];
  const zoneC = ZONES[2];
  const zoneD = ZONES[3];

  const cardsA = SCHEMATIC_CARDS.filter((c) => c.zone === 'A');
  const cardsB = SCHEMATIC_CARDS.filter((c) => c.zone === 'B');
  const cardsC = SCHEMATIC_CARDS.filter((c) => c.zone === 'C');
  const cardsD = SCHEMATIC_CARDS.filter((c) => c.zone === 'D');

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: SCHEMATIC_STYLES }} />
      <GlassDistortionFilter />
      <div
        className="schematic-panel"
        data-testid="schematic-inset"
        role="region"
        aria-label="Blueprint sections schematic"
      >
        {/* Zone A: full width, first zone (margin-top 6 per design) */}
        <div style={{ marginTop: 6 }}>
          <div className="schematic-zone-label">{zoneA.label}</div>
          <div className="schematic-zone">
            <div className={`schematic-zone-grid cols-${zoneA.columns}`}>
              {cardsA.map((card) => {
                const stored = sections?.[card.storeKey];
                const isActive = activeKey === card.storeKey;
                const badge = deriveBadge(stored?.status, isActive);
                return (
                  <BlueprintCard
                    key={card.storeKey}
                    label={card.label}
                    badgeLabel={badge.label}
                    badgePillClass={badge.pillClass}
                    isActive={isActive}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Zone B: full width */}
        <ZoneGroup zone={zoneB} cards={cardsB} sections={sections} activeKey={activeKey} />

        {/* Zone C + D in a row (flex: C grows, D fixed 320px) */}
        <div style={{ display: 'flex', gap: 20, marginTop: 26, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 auto', minWidth: 0 }}>
            <div className="schematic-zone-label">{zoneC.label}</div>
            <div className="schematic-zone">
              <div className={`schematic-zone-grid cols-${zoneC.columns}`}>
                {cardsC.map((card) => {
                  const stored = sections?.[card.storeKey];
                  const isActive = activeKey === card.storeKey;
                  const badge = deriveBadge(stored?.status, isActive);
                  return (
                    <BlueprintCard
                      key={card.storeKey}
                      label={card.label}
                      badgeLabel={badge.label}
                      badgePillClass={badge.pillClass}
                      isActive={isActive}
                    />
                  );
                })}
              </div>
            </div>
          </div>
          <div style={{ flex: '0 0 320px', minWidth: 240 }}>
            <div className="schematic-zone-label">{zoneD.label}</div>
            <div className="schematic-zone">
              <div className={`schematic-zone-grid cols-${zoneD.columns}`}>
                {cardsD.map((card) => {
                  const stored = sections?.[card.storeKey];
                  const isActive = activeKey === card.storeKey;
                  const badge = deriveBadge(stored?.status, isActive);
                  return (
                    <BlueprintCard
                      key={card.storeKey}
                      label={card.label}
                      badgeLabel={badge.label}
                      badgePillClass={badge.pillClass}
                      isActive={isActive}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Title block — bottom-right */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <TitleBlock clientName={clientName} lastUpdatedISO={lastUpdatedISO} />
        </div>
      </div>
    </>
  );
}
