'use client';

/**
 * BlueprintReference — display-only reference panel for the Review step.
 *
 * Lays the offer beside the figures already in the user's Blueprint so they can
 * compare in one place. READ-ONLY: it never writes, scores, or compares — it
 * just surfaces what is already recorded:
 *   - the user's secure priorities (m6Store),
 *   - §3 asset category TOTALS and §5 division SPLITS (aggregates only — NO line
 *     items), and
 *   - §6 retirement figures (pit / pva / qdro).
 *
 * Out of scope for v1: M5 support is NOT in the Blueprint and is deliberately
 * NOT read here (it lives in m5Store).
 */

import { T } from '@/src/lib/brand/tokens';
import { useM6Store, buildPrioritiesPayload } from '@/src/stores/m6Store';
import useBlueprintStore from '@/src/stores/blueprintStore';
import { formatUSD } from '@/src/lib/format/currency';
import { OFFER_COPY } from './copy';

const humanize = (key) =>
  String(key)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (ch) => ch.toUpperCase());

const blockLabel = {
  fontFamily: T.FONT_BODY,
  fontWeight: 700,
  fontSize: 12,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: T.NAVY_55,
  margin: '0 0 6px 0',
};
const lineStyle = { fontFamily: T.FONT_BODY, fontSize: 14, color: T.INK_2, padding: '2px 0' };

function Block({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <p style={blockLabel}>{label}</p>
      {children}
    </div>
  );
}

export default function BlueprintReference() {
  const r = OFFER_COPY.reference;
  const items = useM6Store((s) => s.priorities.items);
  const sections = useBlueprintStore((s) => s.sections);

  const priorities = buildPrioritiesPayload(items);
  const assetsByCategory = sections.s3?.data?.assetsByCategory || null;
  const division = sections.s5?.data?.faceValue || null;
  const s6 = sections.s6?.data || {};

  const assetRows = assetsByCategory
    ? Object.entries(assetsByCategory).filter(([, v]) => v && typeof v.total === 'number')
    : [];

  const retirementRows = [];
  if (s6.pit && s6.pit.taxAdjustedValue != null) {
    retirementRows.push(['Tax-adjusted value', formatUSD(s6.pit.taxAdjustedValue)]);
  }
  if (s6.pva && s6.pva.maritalPV != null) {
    retirementRows.push(['Pension present value (marital)', formatUSD(s6.pva.maritalPV)]);
  }
  if (s6.qdro && s6.qdro.assets) {
    const n = Object.keys(s6.qdro.assets).length;
    if (n > 0) retirementRows.push(['Plans in QDRO modeler', String(n)]);
  }

  const hasAny =
    priorities.length > 0 || assetRows.length > 0 || division || retirementRows.length > 0;

  return (
    <div
      data-testid="offer-organizer-blueprint-reference"
      style={{
        border: `1px solid ${T.LINE}`,
        borderRadius: 8,
        padding: 16,
        backgroundColor: T.PARCHMENT,
      }}
    >
      <p
        style={{
          fontFamily: T.FONT_DISPLAY,
          fontWeight: 700,
          fontSize: 16,
          color: T.NAVY,
          margin: '0 0 14px 0',
        }}
      >
        {OFFER_COPY.review.referenceHeading}
      </p>

      {!hasAny && <p style={lineStyle}>{r.none}</p>}

      {priorities.length > 0 && (
        <Block label={r.priorities}>
          {priorities.map((p, i) => (
            <div key={i} style={lineStyle}>
              {p.item}
            </div>
          ))}
        </Block>
      )}

      {assetRows.length > 0 && (
        <Block label={r.assets}>
          {assetRows.map(([cat, v]) => (
            <div key={cat} style={{ ...lineStyle, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <span>{humanize(cat)}</span>
              <span style={{ color: T.INK }}>{formatUSD(v.total)}</span>
            </div>
          ))}
        </Block>
      )}

      {division && (
        <Block label={r.division}>
          {['client', 'spouse', 'undecided']
            .filter((k) => division[k] != null)
            .map((k) => (
              <div key={k} style={{ ...lineStyle, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span>{k === 'client' ? 'You' : humanize(k)}</span>
                <span style={{ color: T.INK }}>{formatUSD(division[k])}</span>
              </div>
            ))}
        </Block>
      )}

      {retirementRows.length > 0 && (
        <Block label={r.retirement}>
          {retirementRows.map(([label, val]) => (
            <div key={label} style={{ ...lineStyle, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <span>{label}</span>
              <span style={{ color: T.INK }}>{val}</span>
            </div>
          ))}
        </Block>
      )}
    </div>
  );
}
