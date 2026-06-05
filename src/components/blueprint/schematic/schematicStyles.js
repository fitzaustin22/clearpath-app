/**
 * Schematic CSS — one inline <style> block injected by SchematicInset so the
 * .lg-* and .schematic-* classes resolve only on the schematic surface. Verbatim
 * adaptation of design_handoff_blueprint_schematic/README.md.
 *
 * GLASS = baseline + progressive enhancement (Phase 2 spec):
 *   • Reliable baseline (every glass card):
 *       backdrop-filter: blur(2px) saturate(1.65)
 *     Firefox/Safari render this fine. The card reads as glass even without
 *     the SVG filter.
 *   • Enhancement (Chromium/WebKit when the inline SVG filter resolves):
 *       backdrop-filter: url(#glass-distortion) blur(2px) saturate(1.65) brightness(1.04)
 *     adds the displacement-mapped refraction. If the url() no-ops the
 *     baseline still holds.
 *
 * ACTIVE animation: gated behind `prefers-reduced-motion: reduce` — when the
 * user has reduced motion, NO glow keyframes, NO outer-glow box-shadow; the
 * card still reads ACTIVE via the gold pill + warmer gold tint + gold border.
 */

export const SCHEMATIC_STYLES = `
  /* === Liquid-glass card === */
  .schematic-root .lg-card {
    position: relative;
    border-radius: 22px;
    min-height: 108px;
    isolation: isolate;
    box-shadow: 0 18px 46px rgba(12,24,70,.48), 0 3px 10px rgba(44,66,150,.26);
    transition: transform .18s ease, box-shadow .18s ease;
    overflow: hidden;
  }
  .schematic-root .lg-card:hover {
    transform: translateY(-2px);
  }

  .schematic-root .lg-layer {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    opacity: .68;
    pointer-events: none;
  }

  /* Baseline frost — works in every modern browser. */
  .schematic-root .lg-effect {
    backdrop-filter: blur(2px) saturate(1.65);
    -webkit-backdrop-filter: blur(2px) saturate(1.65);
  }
  /* Enhancement: SVG displacement filter for the liquid refraction.
     Chromium/WebKit resolves the url(); other engines fall back to the baseline
     rule above. The cascade means the enhancement wins where it works. */
  @supports (backdrop-filter: url(#glass-distortion)) {
    .schematic-root .lg-effect {
      backdrop-filter: url(#glass-distortion) blur(2px) saturate(1.65) brightness(1.04);
      -webkit-backdrop-filter: url(#glass-distortion) blur(2px) saturate(1.65) brightness(1.04);
    }
  }

  .schematic-root .lg-tint {
    background-image: linear-gradient(135deg, rgba(224,194,140,.32), rgba(150,176,220,.14));
  }
  .schematic-root .lg-sheen {
    background-image:
      radial-gradient(125% 85% at 16% -12%, rgba(255,255,255,.42) 0%, rgba(255,255,255,.1) 24%, rgba(0,0,0,0) 52%),
      linear-gradient(rgba(255,255,255,.14) 0%, rgba(255,255,255,0) 40%);
  }
  .schematic-root .lg-shine {
    border: .5px solid rgba(216,196,150,.42);
    box-shadow:
      inset 1.6px 1.6px 1px rgba(206,232,255,.55),
      inset -1px -1px 1px 1px rgba(255,196,228,.16),
      inset 0 1px 10px rgba(255,255,255,.1),
      inset 0 -10px 22px rgba(6,14,38,.34);
  }

  /* === Card body === */
  .schematic-root .lg-body {
    position: relative;
    z-index: 1;
    padding: 15px 16px 16px;
    min-height: inherit;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  .schematic-root .lg-title {
    font-family: 'Newsreader', Georgia, serif;
    font-weight: 600;
    font-size: 16.5px;
    line-height: 1.12;
    letter-spacing: .1px;
    color: #fff;
    margin-top: auto;
    padding-right: 6px;
  }

  /* === Status pill === */
  .schematic-root .lg-pill {
    position: absolute;
    top: 13px;
    right: 13px;
    z-index: 2;
    font-family: monospace;
    font-size: 8.5px;
    font-weight: 700;
    letter-spacing: .5px;
    padding: 2px 8px;
    border-radius: 999px;
    white-space: nowrap;
    backdrop-filter: blur(4px) saturate(1.5);
    -webkit-backdrop-filter: blur(4px) saturate(1.5);
    background-image: linear-gradient(135deg, rgba(236,242,252,.64), rgba(214,226,245,.42));
    border-top: .5px solid rgba(255,255,255,.55);
    box-shadow:
      inset 1px 1px 0 rgba(255,255,255,.6),
      inset -1px -1px 0 rgba(0,0,0,.14),
      0 2px 7px rgba(0,0,0,.28);
  }
  .schematic-root .lg-pill.filled,
  .schematic-root .lg-pill.progress {
    color: #E3C488;
  }
  .schematic-root .lg-pill.pending {
    color: rgba(255,255,255,.7);
  }
  .schematic-root .lg-pill.active {
    color: #5B4715;
    background-image: linear-gradient(135deg, rgba(255,248,228,.6), rgba(255,236,196,.3));
    box-shadow:
      inset 1px 1px 0 rgba(255,255,255,.7),
      0 2px 7px rgba(120,90,30,.3);
  }

  /* === ACTIVE card (gold glow) === */
  .schematic-root .lg-card.is-active {
    box-shadow: 0 18px 46px rgba(120,90,30,.4), 0 0 22px rgba(227,196,136,.42);
  }
  .schematic-root .lg-card.is-active .lg-tint {
    background-image: linear-gradient(135deg, rgba(230,202,142,.64), rgba(198,164,106,.42));
  }
  .schematic-root .lg-card.is-active .lg-shine {
    border-color: rgba(232,206,150,.6);
  }

  /* Animation only when motion is not reduced. */
  @media (prefers-reduced-motion: no-preference) {
    .schematic-root .lg-card.is-active {
      animation: schematicActiveGlow 3.6s ease-in-out infinite;
    }
    @keyframes schematicActiveGlow {
      0%, 100% {
        box-shadow: 0 18px 46px rgba(120,90,30,.4), 0 0 18px rgba(227,196,136,.38);
      }
      50% {
        box-shadow: 0 18px 50px rgba(120,90,30,.46), 0 0 30px rgba(227,196,136,.56);
      }
    }
  }

  /* === Zone group === */
  .schematic-root .schematic-zone {
    border: 1px dashed rgba(255,255,255,.16);
    border-radius: 14px;
    padding: 22px 18px 18px;
    margin-top: -7px;
    position: relative;
  }
  .schematic-root .schematic-zone-label {
    display: inline-block;
    font-family: monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #E3C488;
    background-color: #0C183B;
    padding-right: 12px;
    margin-left: 4px;
    z-index: 2;
    position: relative;
  }
  .schematic-root .schematic-zone-grid {
    display: grid;
    gap: 16px;
  }
  .schematic-root .schematic-zone-grid.cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .schematic-root .schematic-zone-grid.cols-5 { grid-template-columns: repeat(5, minmax(0, 1fr)); }
  .schematic-root .schematic-zone-grid.cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .schematic-root .schematic-zone-grid.cols-1 { grid-template-columns: 1fr; }

  /* === Title block === */
  .schematic-root .schematic-titleblock {
    width: 360px;
    border: 1px solid rgba(255,255,255,.3);
    border-radius: 10px;
    overflow: hidden;
    background: rgba(8,18,46,.35);
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
  }
  .schematic-root .schematic-tb-row {
    display: flex;
    border-bottom: 1px solid rgba(255,255,255,.16);
  }
  .schematic-root .schematic-tb-row:last-child {
    border-bottom: none;
  }
  .schematic-root .schematic-tb-label {
    flex: 0 0 110px;
    font-family: monospace;
    font-size: 9px;
    letter-spacing: 1px;
    color: rgba(255,255,255,.55);
    text-transform: uppercase;
    padding: 9px 10px;
    border-right: 1px solid rgba(255,255,255,.16);
  }
  .schematic-root .schematic-tb-val {
    font-family: monospace;
    font-size: 10.5px;
    letter-spacing: .5px;
    color: #fff;
    padding: 9px 10px;
    display: flex;
    align-items: center;
  }

  /* === Inset panel === */
  .schematic-root .schematic-panel {
    position: relative;
    background-color: #0C183B;
    background-image:
      linear-gradient(rgba(255,255,255,.043) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,.043) 1px, transparent 1px),
      linear-gradient(rgba(255,255,255,.024) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,.024) 1px, transparent 1px);
    background-size: 120px 120px, 120px 120px, 24px 24px, 24px 24px;
    border-radius: 16px;
    padding: 30px 30px 32px;
    box-shadow:
      inset 0 3px 16px rgba(0,0,0,.55),
      inset 0 0 0 1px rgba(255,255,255,.05),
      inset 0 -14px 30px rgba(0,0,0,.30),
      0 1px 0 rgba(255,255,255,.7);
    overflow: hidden;
  }
  .schematic-root .schematic-panel::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    box-shadow: inset 0 0 60px rgba(0,0,0,.35);
    pointer-events: none;
  }

  /* === Hero layout (warm cream page) === */
  .schematic-root {
    background-color: #FAF8F2;
  }
  .schematic-root .schematic-hero {
    max-width: 1320px;
    margin: 0 auto;
    padding: 52px 40px 80px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 372px;
    gap: 52px;
    align-items: start;
  }
  @media (max-width: 1024px) {
    .schematic-root .schematic-hero {
      grid-template-columns: 1fr;
      padding: 32px 24px 64px;
      gap: 32px;
    }
    .schematic-root .schematic-titleblock {
      width: 100%;
      max-width: 360px;
    }
  }
  @media (max-width: 720px) {
    .schematic-root .schematic-zone-grid.cols-4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .schematic-root .schematic-zone-grid.cols-5 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .schematic-root .schematic-zone-grid.cols-2 { grid-template-columns: 1fr; }
  }
`;
