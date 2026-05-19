'use client';

/**
 * QDGPacketReadyCallout — the §8.9.1 `qdg_packet_ready` callout and the
 * §8.7 packet emission surface (PR4-4).
 *
 * Renders only once selectQDROPacketReady === true (every asset's
 * decisions populated per its branch shape). Surfaces the LOCKED §8.9.1
 * body (consumed from the PR1 QDG_CALLOUTS constant — single source of
 * truth) plus "Download markdown" and "Download PDF" actions. Generation
 * is transient (PR4-6): build on click, download via a blob URL, no
 * storage. The combined cross-asset markdown + PDF are produced by the
 * PR4 packet module.
 *
 * @returns {JSX.Element | null}
 */

import { useM5Store } from '@/src/stores/m5Store';
import { QDG_CALLOUTS } from '@/src/lib/qdro';
import {
  selectQDROPacketReady,
  buildMarkdownPacket,
  QDROHandoffPacketPDF,
} from '@/src/lib/qdro/packet';
import { pdf } from '@react-pdf/renderer';
import { T } from '@/src/lib/brand/tokens';

const FILENAME_BASE = 'clearpath-qdro-handoff-packet';

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const buttonStyle = {
  appearance: 'none',
  cursor: 'pointer',
  fontFamily: T.FONT_BODY,
  fontSize: '13px',
  fontWeight: 600,
  padding: '8px 14px',
  borderRadius: '7px',
  border: `1px solid ${T.GOLD_BORDER}`,
  backgroundColor: T.GOLD_TINT,
  color: T.INK,
};

export default function QDGPacketReadyCallout() {
  const ready = useM5Store(selectQDROPacketReady);
  if (!ready) return null;

  const stamp = () => {
    const iso = new Date().toISOString();
    return { iso, day: iso.slice(0, 10) };
  };

  const onMarkdown = () => {
    const { iso, day } = stamp();
    const md = buildMarkdownPacket(useM5Store.getState(), { generatedAt: iso });
    triggerDownload(
      new Blob([md], { type: 'text/markdown' }),
      `${FILENAME_BASE}-${day}.md`,
    );
  };

  const onPdf = async () => {
    const { iso, day } = stamp();
    const blob = await pdf(
      <QDROHandoffPacketPDF state={useM5Store.getState()} generatedAt={iso} />,
    ).toBlob();
    triggerDownload(blob, `${FILENAME_BASE}-${day}.pdf`);
  };

  return (
    <div
      data-testid="qdg-packet-ready"
      role="status"
      aria-label="Attorney handoff packet ready"
      style={{
        background: T.PARCHMENT,
        color: T.INK,
        border: `1px solid ${T.GREEN}`,
        borderRadius: 6,
        padding: '14px 16px',
        fontFamily: T.FONT_BODY,
        fontSize: 13,
        lineHeight: 1.5,
        marginBottom: 20,
      }}
    >
      <p
        style={{
          margin: '0 0 4px',
          fontSize: '11px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.6px',
          color: T.GREEN,
        }}
      >
        Packet ready
      </p>
      <p style={{ margin: '0 0 12px', color: T.INK_2 }}>
        {QDG_CALLOUTS.qdg_packet_ready.body}
      </p>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button type="button" data-testid="qdg-download-md" onClick={onMarkdown} style={buttonStyle}>
          Download markdown
        </button>
        <button type="button" data-testid="qdg-download-pdf" onClick={onPdf} style={buttonStyle}>
          Download PDF
        </button>
      </div>
    </div>
  );
}
