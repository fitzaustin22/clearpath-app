'use client';

/**
 * BlueprintCover — the print-only cover / disclaimer page for the M7 Blueprint
 * Export (Phase B). Stateless: reads the user's name from Clerk and stamps the
 * export moment as "Generated: <date>". Writes nothing.
 *
 * Visibility is entirely marker-scoped (D13): hidden on screen and on a plain
 * Ctrl+P; shown as the first page ONLY when the gated Export action has set
 * `body.exporting-blueprint`. The display + page-break rules live in this
 * component's own <style> so the cover owns its visibility; the cross-cutting
 * print layout (chrome suppression, pagination) lives in BlueprintView.
 *
 * Leads with document identity (brand + "Financial Blueprint" + name). The
 * disclaimer is first-class in importance — real contrast, legible — but the
 * title remains the loudest element. The date is the EXPORT moment (not the
 * Blueprint's lastUpdated), computed after mount to avoid a hydration mismatch.
 */

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { T } from '@/src/lib/brand/tokens';
import { EXPORT_COVER_COPY, EXPORT_DISCLAIMER } from './exportCopy';

function formatGeneratedDate(d) {
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function BlueprintCover() {
  const { user } = useUser();

  // Date is the export moment. Computed after mount (client-only) so server and
  // client first render agree — mirrors the hydrated guard in BlueprintView and
  // the M3 affidavit print page.
  const [generatedDate, setGeneratedDate] = useState('');
  useEffect(() => {
    // Mount-only date stamp; mirrors the M3 affidavit print page's hydrated guard.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGeneratedDate(formatGeneratedDate(new Date()));
  }, []);

  const rawName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '';
  const preparedForName = rawName || EXPORT_COVER_COPY.fallbackName;

  return (
    <div className="blueprint-cover" data-testid="blueprint-cover">
      <style>{`
        .blueprint-cover { display: none; }
        @media print {
          body.exporting-blueprint .blueprint-cover {
            display: flex;
            flex-direction: column;
            justify-content: center;
            min-height: 9in;
            break-after: page;
            page-break-after: always;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      <div style={{ textAlign: 'center', padding: '0 24px' }}>
        <div
          style={{
            fontFamily: T.FONT_BODY,
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: T.GOLD,
            marginBottom: 20,
          }}
        >
          {EXPORT_COVER_COPY.brand}
        </div>

        <h1
          style={{
            fontFamily: T.FONT_DISPLAY,
            fontSize: 52,
            fontWeight: 700,
            lineHeight: 1.1,
            color: T.NAVY,
            margin: '0 0 28px',
          }}
        >
          {EXPORT_COVER_COPY.documentTitle}
        </h1>

        <div
          style={{
            width: 80,
            height: 2,
            backgroundColor: T.GOLD,
            margin: '0 auto 28px',
          }}
        />

        <p
          style={{
            fontFamily: T.FONT_BODY,
            fontSize: 20,
            fontWeight: 400,
            color: T.INK,
            margin: '0 0 8px',
          }}
        >
          {EXPORT_COVER_COPY.preparedForLabel} {preparedForName}
        </p>

        <p
          style={{
            fontFamily: T.FONT_BODY,
            fontSize: 15,
            fontWeight: 400,
            color: T.INK_2,
            margin: 0,
          }}
        >
          {EXPORT_COVER_COPY.generatedLabel} {generatedDate}
        </p>
      </div>

      <div
        style={{
          maxWidth: 520,
          margin: '56px auto 0',
          padding: '18px 22px',
          border: `1px solid ${T.LINE_STRONG}`,
          borderLeft: `3px solid ${T.GOLD}`,
          borderRadius: 4,
          backgroundColor: T.PARCHMENT,
        }}
      >
        <p
          style={{
            fontFamily: T.FONT_BODY,
            fontSize: 13,
            fontWeight: 400,
            lineHeight: 1.55,
            color: T.INK,
            margin: 0,
          }}
        >
          {EXPORT_DISCLAIMER}
        </p>
      </div>
    </div>
  );
}
