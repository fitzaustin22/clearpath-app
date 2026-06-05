'use client';

/**
 * BlueprintCard — a single liquid-glass card in the schematic inset.
 *
 * Pure presentational. All wiring happens in SchematicInset (which derives the
 * badge + isActive flag and feeds them in). Card itself is stateless.
 *
 * Structure mirrors the design's lg-card pattern:
 *   <div class="lg-card [is-active]">
 *     <div class="lg-layer lg-effect" />     ← backdrop-filter frost
 *     <div class="lg-layer lg-tint" />        ← warm gold tint
 *     <div class="lg-layer lg-sheen" />       ← highlight gradient
 *     <div class="lg-layer lg-shine" />       ← inner border + glow
 *     <span class="lg-pill {pillClass}">{label}</span>
 *     <div class="lg-body"><div class="lg-title">{name}</div></div>
 *   </div>
 *
 * Style rules live in schematicStyles.js (injected once by SchematicInset).
 */

export default function BlueprintCard({ label, badgeLabel, badgePillClass, isActive }) {
  const cardClassName = isActive ? 'lg-card is-active' : 'lg-card';
  return (
    <div
      className={cardClassName}
      data-testid="schematic-card"
      data-card-label={label}
      data-active={isActive ? 'true' : 'false'}
    >
      <div className="lg-layer lg-effect" aria-hidden="true" />
      <div className="lg-layer lg-tint" aria-hidden="true" />
      <div className="lg-layer lg-sheen" aria-hidden="true" />
      <div className="lg-layer lg-shine" aria-hidden="true" />
      <span className={`lg-pill ${badgePillClass}`} aria-label={`Status: ${badgeLabel}`}>
        {badgeLabel}
      </span>
      <div className="lg-body">
        <div className="lg-title">{label}</div>
      </div>
    </div>
  );
}
