'use client';

const NAVY = '#1B2A4A';
const GOLD = '#C8A96E';
const RED = '#C0392B';
const SANS = "var(--font-source-sans), 'Source Sans 3', sans-serif";

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
  if (!data || !data.faceValue) return null;

  const { faceValue, taxAdjusted, hiddenTax, totalMaritalEstate, hasCostBasis } = data;
  const faceTotal =
    (faceValue.client || 0) + (faceValue.spouse || 0) + (faceValue.undecided || 0);
  const total = totalMaritalEstate || faceTotal;

  const pct = (n) => (total > 0 ? Math.round((n / total) * 100) : 0);

  if (hasCostBasis && taxAdjusted && hiddenTax) {
    const adjustedTotal =
      (taxAdjusted.client || 0) +
      (taxAdjusted.spouse || 0) +
      (taxAdjusted.undecided || 0);
    const hiddenTotal =
      (hiddenTax.client || 0) + (hiddenTax.spouse || 0) + (hiddenTax.undecided || 0);
    const clientPercent = total > 0 ? Math.round((faceValue.client / total) * 100) : 0;
    const adjustedPercent =
      adjustedTotal > 0
        ? Math.round((taxAdjusted.client / adjustedTotal) * 1000) / 10
        : 0;
    const clientHiddenTax = Math.abs(hiddenTax.client || 0);

    return (
      <div>
        <div style={noteStyle}>
          Based on the allocations from your Asset Inventory (§3). Toggle to Tax-Adjusted
          view to reveal hidden taxes.
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
              <TaxRow
                label="Your Assets"
                face={faceValue.client}
                adj={taxAdjusted.client}
                hid={hiddenTax.client}
              />
              <TaxRow
                label="Spouse's Assets"
                face={faceValue.spouse}
                adj={taxAdjusted.spouse}
                hid={hiddenTax.spouse}
              />
              <TaxRow
                label="Undecided"
                face={faceValue.undecided}
                adj={taxAdjusted.undecided}
                hid={hiddenTax.undecided}
              />
              <TaxRow
                label="Total"
                face={faceTotal}
                adj={adjustedTotal}
                hid={hiddenTotal}
                bold
              />
            </tbody>
          </table>
        </div>

        <p style={{ ...bodyStyle, marginTop: 24, lineHeight: 1.55 }}>
          The face-value division appears to give you <strong>{clientPercent}%</strong> of
          marital assets. After accounting for hidden taxes, you receive{' '}
          <strong>{adjustedPercent}%</strong> — a difference of{' '}
          <strong style={{ color: RED }}>{currency(clientHiddenTax)}</strong> in built-in
          tax liability.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{ width: '100%', borderCollapse: 'collapse', fontFamily: SANS }}
        >
          <thead>
            <tr>
              <th style={{ ...headCellBase, textAlign: 'left' }}></th>
              <th style={headCellBase}>Face Value</th>
              <th style={{ ...headCellBase, width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            <FaceRow label="Your Assets" value={faceValue.client} pct={pct(faceValue.client)} />
            <FaceRow
              label="Spouse's Assets"
              value={faceValue.spouse}
              pct={pct(faceValue.spouse)}
            />
            <FaceRow
              label="Undecided"
              value={faceValue.undecided}
              pct={pct(faceValue.undecided)}
            />
            <FaceRow label="Total" value={faceTotal} pct={100} bold />
          </tbody>
        </table>
      </div>
      <div style={{ ...noteStyle, marginTop: 16 }}>
        Tax-adjusted values add with Module 4 — revealing hidden taxes in transferred assets.
      </div>
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
  const redStyle = { ...numStyle, color: RED };
  return (
    <tr>
      <td style={labelStyle}>{label}</td>
      <td style={numStyle}>{currency(face)}</td>
      <td style={numStyle}>{currency(adj)}</td>
      <td style={redStyle}>({currency(Math.abs(hid || 0))})</td>
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
