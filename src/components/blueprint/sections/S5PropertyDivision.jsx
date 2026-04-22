'use client';

// Store import needed for cross-section cost basis toggle (shared with S3)
import useBlueprintStore from '@/src/stores/blueprintStore';

const NAVY = '#1B2A4A';
const GOLD = '#C8A96E';
const RED = '#C0392B';
const GREEN = '#2D8A4E';
const SANS = "var(--font-source-sans), 'Source Sans 3', sans-serif";
const MUTED = '#6B7280';

const currency = (n) =>
  (n || 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const bodyStyle = {
  fontFamily: SANS,
  fontWeight: 400,
  fontSize: 16,
  color: 'rgba(27,42,74,0.8)',
};

const noteStyle = {
  fontFamily: SANS,
  fontWeight: 400,
  fontSize: 14,
  color: 'rgba(27,42,74,0.5)',
  fontStyle: 'italic',
};

const cellBase = {
  fontFamily: SANS,
  fontWeight: 400,
  fontSize: 16,
  color: 'rgba(27,42,74,0.8)',
  padding: '10px 12px',
  textAlign: 'right',
};

const headCellBase = {
  fontFamily: SANS,
  fontWeight: 400,
  fontSize: 13,
  color: 'rgba(27,42,74,0.5)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  padding: '8px 12px',
  textAlign: 'right',
};

export default function S5PropertyDivision({ data, status }) {
  // Cost basis toggle (shared with S3)
  const costBasisViewEnabled = useBlueprintStore((s) => s.costBasisViewEnabled);
  const toggleCostBasisView = useBlueprintStore((s) => s.toggleCostBasisView);
  // DEF-9: Surface deferred-comp placeholders in §5 so the user knows there are
  // items still to negotiate that aren't reflected in either Face Value or
  // Tax-Adjusted columns.
  const deferredCompStubs = useBlueprintStore((s) => s.deferredCompStubs);

  if (!data || !data.faceValue) return null;

  const { faceValue, taxAdjusted, hiddenTax, totalMaritalEstate, hasCostBasis } = data;
  const faceTotal =
    (faceValue.client || 0) + (faceValue.spouse || 0) + (faceValue.undecided || 0);
  const total = totalMaritalEstate || faceTotal;

  const pct = (n) => (total > 0 ? Math.round((n / total) * 100) : 0);

  // Determine which view to show
  const showTaxView = costBasisViewEnabled && hasCostBasis && taxAdjusted && hiddenTax;
  const showNudge = costBasisViewEnabled && !hasCostBasis;

  return (
    <div>
      {/* Cost basis view toggle */}
      {data.faceValue && (
        <div
          style={{
            fontFamily: SANS,
            fontSize: 14,
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
          className="clearpath-blueprint-interactive"
        >
          <span style={{ color: 'rgba(27,42,74,0.5)', fontWeight: 400 }}>View:</span>
          <button
            type="button"
            onClick={costBasisViewEnabled ? toggleCostBasisView : undefined}
            style={{
              fontFamily: SANS,
              fontSize: 14,
              background: 'none',
              border: 'none',
              padding: '2px 4px',
              cursor: costBasisViewEnabled ? 'pointer' : 'default',
              color: !costBasisViewEnabled ? GOLD : NAVY,
              opacity: !costBasisViewEnabled ? 1 : 0.5,
              fontWeight: !costBasisViewEnabled ? 600 : 400,
            }}
          >
            Face Value
          </button>
          <span style={{ color: 'rgba(27,42,74,0.3)' }}>|</span>
          <button
            type="button"
            onClick={!costBasisViewEnabled ? toggleCostBasisView : undefined}
            style={{
              fontFamily: SANS,
              fontSize: 14,
              background: 'none',
              border: 'none',
              padding: '2px 4px',
              cursor: !costBasisViewEnabled ? 'pointer' : 'default',
              color: costBasisViewEnabled ? GOLD : NAVY,
              opacity: costBasisViewEnabled ? 1 : 0.5,
              fontWeight: costBasisViewEnabled ? 600 : 400,
            }}
          >
            Tax-Adjusted
          </button>
        </div>
      )}

      {showTaxView ? (
        <>
          <div style={noteStyle}>
            Based on the allocations from your Asset Inventory (§3). Hidden taxes estimated at
            15% long-term capital gains rate.
          </div>

          <div style={{ overflowX: 'auto', marginTop: 16 }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontFamily: SANS,
              }}
            >
              <thead>
                <tr>
                  <th style={{ ...headCellBase, textAlign: 'left' }}></th>
                  <th style={headCellBase}>Face Value</th>
                  <th style={headCellBase}>Tax-Adjusted</th>
                  <th style={headCellBase}>Hidden Tax</th>
                </tr>
              </thead>
              <tbody>
                <TaxRow label="Your Assets" face={faceValue.client} adj={taxAdjusted.client} hid={hiddenTax.client} />
                <TaxRow label="Spouse's Assets" face={faceValue.spouse} adj={taxAdjusted.spouse} hid={hiddenTax.spouse} />
                <TaxRow label="Undecided" face={faceValue.undecided} adj={taxAdjusted.undecided} hid={hiddenTax.undecided} />
                <TaxRow
                  label="Total"
                  face={faceTotal}
                  adj={(taxAdjusted.client || 0) + (taxAdjusted.spouse || 0) + (taxAdjusted.undecided || 0)}
                  hid={(hiddenTax.client || 0) + (hiddenTax.spouse || 0) + (hiddenTax.undecided || 0)}
                  bold
                />
              </tbody>
            </table>
          </div>

          <p style={{ ...bodyStyle, marginTop: 24, lineHeight: 1.55 }}>
            The face-value division appears to give you{' '}
            <strong>{total > 0 ? Math.round((faceValue.client / total) * 100) : 0}%</strong> of
            marital assets. After accounting for hidden taxes, you receive{' '}
            <strong>
              {(() => {
                const adjTotal =
                  (taxAdjusted.client || 0) + (taxAdjusted.spouse || 0) + (taxAdjusted.undecided || 0);
                return adjTotal > 0
                  ? Math.round((taxAdjusted.client / adjTotal) * 1000) / 10
                  : 0;
              })()}%
            </strong>{' '}
            — a difference of{' '}
            <strong style={{ color: RED }}>{currency(Math.abs(hiddenTax.client || 0))}</strong> in
            built-in tax liability.
          </p>
        </>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: SANS }}>
              <thead>
                <tr>
                  <th style={{ ...headCellBase, textAlign: 'left' }}></th>
                  <th style={headCellBase}>Face Value</th>
                  <th style={{ ...headCellBase, width: 80 }}></th>
                </tr>
              </thead>
              <tbody>
                <FaceRow label="Your Assets" value={faceValue.client} pct={pct(faceValue.client)} />
                <FaceRow label="Spouse's Assets" value={faceValue.spouse} pct={pct(faceValue.spouse)} />
                <FaceRow label="Undecided" value={faceValue.undecided} pct={pct(faceValue.undecided)} />
                <FaceRow label="Total" value={faceTotal} pct={100} bold />
              </tbody>
            </table>
          </div>
          {showNudge ? (
            <div
              style={{
                fontFamily: SANS,
                fontWeight: 400,
                fontSize: 13,
                color: MUTED,
                fontStyle: 'italic',
                marginTop: 12,
              }}
            >
              Enter cost basis in Section 3 above to see tax-adjusted values.
            </div>
          ) : (
            <div style={{ ...noteStyle, marginTop: 16 }}>
              Tax-adjusted values add with Module 4 — revealing hidden taxes in transferred assets.
            </div>
          )}
        </>
      )}

      {deferredCompStubs.length > 0 && (
        <div
          style={{
            fontFamily: SANS,
            fontSize: 14,
            color: NAVY,
            padding: '10px 14px',
            marginTop: 20,
            border: `1px solid ${GOLD}`,
            borderLeft: `3px solid ${GOLD}`,
            borderRadius: 6,
            backgroundColor: 'rgba(200, 169, 110, 0.08)',
            lineHeight: 1.5,
          }}
        >
          <strong>Deferred Comp Pending:</strong> {deferredCompStubs.length} item
          {deferredCompStubs.length === 1 ? '' : 's'}
          {' '}— unvested or unexercised equity isn&apos;t reflected in either column above
          and will need separate treatment in settlement.
        </div>
      )}
    </div>
  );
}

function TaxRow({ label, face, adj, hid, bold }) {
  const labelStyle = {
    fontFamily: SANS,
    fontWeight: bold ? 600 : 400,
    fontSize: 16,
    color: NAVY,
    padding: '10px 12px',
    textAlign: 'left',
    borderTop: bold ? '1px solid rgba(27,42,74,0.2)' : 'none',
  };
  const numStyle = {
    ...cellBase,
    fontWeight: bold ? 600 : 400,
    borderTop: bold ? '1px solid rgba(27,42,74,0.2)' : 'none',
  };
  const hidColor = (hid || 0) >= 0 ? RED : GREEN;
  const hidStyle = { ...numStyle, color: hidColor };
  return (
    <tr>
      <td style={labelStyle}>{label}</td>
      <td style={numStyle}>{currency(face)}</td>
      <td style={numStyle}>{currency(adj)}</td>
      <td style={hidStyle}>({currency(Math.abs(hid || 0))})</td>
    </tr>
  );
}

function FaceRow({ label, value, pct, bold }) {
  const labelStyle = {
    fontFamily: SANS,
    fontWeight: bold ? 600 : 400,
    fontSize: 16,
    color: NAVY,
    padding: '10px 12px',
    textAlign: 'left',
    borderTop: bold ? '1px solid rgba(27,42,74,0.2)' : 'none',
  };
  const numStyle = {
    ...cellBase,
    fontWeight: bold ? 600 : 400,
    borderTop: bold ? '1px solid rgba(27,42,74,0.2)' : 'none',
  };
  const pctStyle = {
    ...cellBase,
    color: 'rgba(27,42,74,0.5)',
    fontWeight: bold ? 600 : 400,
    borderTop: bold ? '1px solid rgba(27,42,74,0.2)' : 'none',
  };
  return (
    <tr>
      <td style={labelStyle}>{label}</td>
      <td style={numStyle}>{currency(value)}</td>
      <td style={pctStyle}>({pct}%)</td>
    </tr>
  );
}
