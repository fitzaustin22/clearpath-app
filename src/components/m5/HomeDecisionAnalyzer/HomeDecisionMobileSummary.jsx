'use client';

import { T } from '@/src/lib/brand/tokens';
import HomeDecisionVerdictBadge from './HomeDecisionVerdictBadge.jsx';

/**
 * §9.8.2 item 1 — compact mobile summary table.
 * 3 scenarios × 4 columns (name | 10-yr netWealth | 10-yr liquidCash | verdict).
 * tableLayout:'fixed' + width:'100%' prevents horizontal overflow at 375px (TC-HDA-9).
 */

function fmtUSD(n) {
  if (n == null || !Number.isFinite(n)) return '—';
  return (n < 0 ? '-' : '') + '$' + Math.abs(Math.round(n)).toLocaleString('en-US');
}

const SCENARIOS = [
  { id: 'keepAndRefi', label: 'Keep & refi' },
  { id: 'sellNow', label: 'Sell now' },
  { id: 'deferredSale', label: 'Deferred sale' },
];

const cellStyle = {
  padding: '8px 6px',
  fontSize: 12,
  color: T.NAVY,
  overflow: 'hidden',
  wordBreak: 'break-word',
  verticalAlign: 'middle',
};

const headerCellStyle = {
  ...cellStyle,
  fontFamily: T.FONT_BODY,
  fontWeight: 700,
  fontSize: 11,
  color: T.NAVY_55,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  borderBottom: `2px solid ${T.NAVY_12}`,
};

export default function HomeDecisionMobileSummary({ scenarios }) {
  if (!scenarios) return null;

  return (
    <div
      style={{
        background: T.PARCHMENT,
        borderRadius: 8,
        border: `1px solid ${T.NAVY_12}`,
        overflow: 'hidden',
        marginBottom: 16,
      }}
    >
      <table
        data-testid="hda-mobile-summary"
        style={{
          width: '100%',
          tableLayout: 'fixed',
          borderCollapse: 'collapse',
        }}
      >
        <thead>
          <tr>
            <th style={{ ...headerCellStyle, width: '30%', textAlign: 'left' }}>Scenario</th>
            <th style={{ ...headerCellStyle, width: '25%', textAlign: 'right' }}>10-yr net wealth</th>
            <th style={{ ...headerCellStyle, width: '25%', textAlign: 'right' }}>10-yr liquid cash</th>
            <th style={{ ...headerCellStyle, width: '20%', textAlign: 'center' }}>Verdict</th>
          </tr>
        </thead>
        <tbody>
          {SCENARIOS.map(({ id, label }) => {
            const scenario = scenarios[id];
            const horizon10 = scenario?.horizons?.[2];
            return (
              <tr
                key={id}
                data-testid={`hda-mobile-summary-row-${id}`}
                style={{ borderTop: `1px solid ${T.NAVY_12}` }}
              >
                <td
                  style={{
                    ...cellStyle,
                    fontFamily: T.FONT_BODY,
                    fontWeight: 600,
                    fontSize: 12,
                    textAlign: 'left',
                  }}
                >
                  {label}
                </td>
                <td
                  data-testid={`hda-mobile-summary-${id}-netWealth`}
                  style={{
                    ...cellStyle,
                    ...T.NUMERIC_STYLE,
                    textAlign: 'right',
                  }}
                >
                  {fmtUSD(horizon10?.netWealth)}
                </td>
                <td
                  data-testid={`hda-mobile-summary-${id}-liquidCash`}
                  style={{
                    ...cellStyle,
                    ...T.NUMERIC_STYLE,
                    textAlign: 'right',
                  }}
                >
                  {fmtUSD(horizon10?.liquidCash)}
                </td>
                <td style={{ ...cellStyle, textAlign: 'center' }}>
                  {id === 'keepAndRefi' ? (
                    <HomeDecisionVerdictBadge
                      verdictTier={scenarios.keepAndRefi?.refiQualification?.verdictTier}
                      bindingConstraint={scenarios.keepAndRefi?.refiQualification?.bindingConstraint}
                    />
                  ) : (
                    <span style={{ color: T.NAVY_55 }}>—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p
        style={{
          margin: 0,
          padding: '6px 10px',
          fontSize: 11,
          color: T.NAVY_55,
          borderTop: `1px solid ${T.NAVY_12}`,
          fontStyle: 'italic',
        }}
      >
        10-year horizon shown — open a scenario for 3- and 6-year detail.
      </p>
    </div>
  );
}
