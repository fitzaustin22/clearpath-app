'use client';

/**
 * BlueprintExport — the gated Export trigger for the M7 Blueprint (Phase B).
 *
 * Gate (mirrors the M7 ActionPlan template): userTier is resolved server-side
 * by the /blueprint route and passed in; Free / Essentials see the
 * artifact-selling LockedTeaser, Full Access (navigator / legacy signature) get
 * the Export button. The /blueprint VIEW itself stays ungated — only this action
 * is gated.
 *
 * Flag-activation (D13): the button sets the `exporting-blueprint` marker class
 * on <body>, calls window.print(), and clears the marker on `afterprint`. The
 * premium artifact (cover, chrome suppression, pagination, color) is scoped
 * under that marker in CSS — so a plain Ctrl+P (which never sets the marker)
 * yields an ordinary print, not the premium PDF. This component is stateless: it
 * reads no store and writes nothing.
 *
 * The button + instruction carry the existing `clearpath-blueprint-interactive`
 * class so they never appear in any print (plain or exported), reusing
 * BlueprintView's interactive-affordance suppression.
 */

import { hasAccess } from '@/src/lib/plans';
import { T } from '@/src/lib/brand/tokens';
import BlueprintExportLockedTeaser from './BlueprintExportLockedTeaser';

export const EXPORTING_MARKER_CLASS = 'exporting-blueprint';

function triggerExport() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  document.body.classList.add(EXPORTING_MARKER_CLASS);
  const clear = () => {
    document.body.classList.remove(EXPORTING_MARKER_CLASS);
    window.removeEventListener('afterprint', clear);
  };
  window.addEventListener('afterprint', clear);
  window.print();
}

function ExportControl() {
  return (
    <div
      data-testid="blueprint-export"
      className="clearpath-blueprint-interactive"
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}
    >
      <button
        type="button"
        data-testid="blueprint-export-button"
        onClick={triggerExport}
        style={{
          backgroundColor: T.NAVY,
          color: T.CARD,
          fontFamily: T.FONT_BODY,
          fontWeight: 700,
          fontSize: 14,
          padding: '11px 24px',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
          letterSpacing: 0.3,
        }}
      >
        Export Blueprint (PDF)
      </button>
      <span
        style={{
          fontFamily: T.FONT_BODY,
          fontSize: 12,
          color: T.MUTED,
          lineHeight: 1.4,
          textAlign: 'right',
          maxWidth: 320,
        }}
      >
        In the print dialog, choose “Save as PDF” and turn off “Headers and
        footers.”
      </span>
    </div>
  );
}

export default function BlueprintExport({ userTier = 'essentials' }) {
  const isFullAccess = hasAccess(userTier, 'navigator');
  if (!isFullAccess) return <BlueprintExportLockedTeaser />;
  return <ExportControl />;
}
