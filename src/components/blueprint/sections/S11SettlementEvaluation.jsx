'use client';

/**
 * §11 — Settlement Offer Overview (M6 Tool 3, Settlement Offer Organizer).
 *
 * REDESIGN (Phase 3): the dormant verdict UI (fairnessScore / strengths /
 * concerns / totalValue) is gone. This is an ORGANIZING readout, never an
 * evaluation — it never scores, grades, ranks, or says better/worse/fair/
 * accept/reject. It renders three neutral blocks:
 *   1. the offer summary (the displayed terms the user recorded),
 *   2. the priority map (each priority → addressed / silent, taken verbatim from
 *      the user's own tags — the tool never infers), and
 *   3. the neutral gap list (what the offer is silent on).
 *
 * Stable code id stays `S11SettlementEvaluation` (BlueprintView registry key);
 * only the rendered content + the user-facing label changed. Keeps the
 * { data, status } prop signature and the `if (!data) return null` guard so the
 * section stays dormant until the user saves an overview. Local color consts
 * mirror the sibling section renderers (S10) — the Blueprint surface does not
 * consume the wizard T tokens.
 */

const NAVY = '#1B2A4A';
const SANS = "var(--font-source-sans), 'Source Sans 3', sans-serif";

const currency = (n) =>
  (n || 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const labelStyle = {
  fontFamily: SANS,
  fontWeight: 400,
  fontSize: 13,
  color: 'rgba(27,42,74,0.5)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const bodyStyle = {
  fontFamily: SANS,
  fontWeight: 400,
  fontSize: 16,
  color: 'rgba(27,42,74,0.8)',
};

const subHeaderStyle = {
  fontFamily: SANS,
  fontWeight: 600,
  fontSize: 16,
  color: NAVY,
};

// Status chip. Both states are INFORMATIONAL, not evaluative: addressed uses a
// soft gold tint, silent a neutral gray. Deliberately NOT green/red — the tool
// never codes an offer as good or bad.
function StatusPill({ status }) {
  const addressed = status === 'addressed';
  return (
    <span
      style={{
        fontFamily: SANS,
        fontWeight: 600,
        fontSize: 12,
        letterSpacing: '0.02em',
        padding: '2px 10px',
        borderRadius: 999,
        whiteSpace: 'nowrap',
        color: addressed ? '#8A7028' : 'rgba(27,42,74,0.55)',
        backgroundColor: addressed ? 'rgba(200,169,110,0.16)' : 'rgba(27,42,74,0.06)',
      }}
    >
      {addressed ? 'Addressed' : 'Silent'}
    </span>
  );
}

// One labelled summary line. `to` is the optional recipient shown verbatim.
function SummaryLine({ text, to }) {
  return (
    <div style={{ ...bodyStyle, padding: '3px 0' }}>
      {text}
      {to ? <span style={{ color: 'rgba(27,42,74,0.5)' }}> — {to}</span> : null}
    </div>
  );
}

function OfferSummaryBlock({ summary }) {
  const assets = Array.isArray(summary.assetItems) ? summary.assetItems : [];
  const debts = Array.isArray(summary.debts) ? summary.debts : [];
  const support = summary.support || null;
  const supportBits = support
    ? [
        support.amount != null ? currency(support.amount) : null,
        support.durationMonths != null ? `${support.durationMonths} months` : null,
        support.kind ? support.kind : null,
      ].filter(Boolean)
    : [];

  return (
    <section>
      <div style={subHeaderStyle}>Offer summary</div>
      <div style={{ marginTop: 10 }}>
        {assets.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={labelStyle}>Assets</div>
            {assets.map((a, i) => (
              <SummaryLine key={i} text={a.label} to={a.toUser} />
            ))}
          </div>
        )}

        {supportBits.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={labelStyle}>Support</div>
            <SummaryLine text={supportBits.join(' · ')} />
          </div>
        )}

        {summary.residence && summary.residence.disposition && (
          <div style={{ marginBottom: 12 }}>
            <div style={labelStyle}>The home</div>
            <SummaryLine text={summary.residence.disposition} />
          </div>
        )}

        {summary.retirement && summary.retirement.divisionPct != null && (
          <div style={{ marginBottom: 12 }}>
            <div style={labelStyle}>Retirement</div>
            <SummaryLine text={`${summary.retirement.divisionPct}%`} />
          </div>
        )}

        {debts.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={labelStyle}>Debts</div>
            {debts.map((d, i) => (
              <SummaryLine key={i} text={d.label} to={d.toUser} />
            ))}
          </div>
        )}

        {summary.otherTerms && (
          <div style={{ marginBottom: 12 }}>
            <div style={labelStyle}>Other terms</div>
            <SummaryLine text={summary.otherTerms} />
          </div>
        )}
      </div>
    </section>
  );
}

// `status` is retained in the signature per the section-renderer contract
// (BlueprintView passes { data, status }); the neutral readout derives
// everything it needs from `data`.
export default function S11SettlementEvaluation({ data, status }) {
  if (!data) return null;

  const offerSummary = data.offerSummary || null;
  const map = Array.isArray(data.map) ? data.map : [];
  const gaps = Array.isArray(data.gaps) ? data.gaps : [];

  // Nothing recorded yet — stay quiet (mirrors S10's all-empty guard).
  if (!offerSummary && map.length === 0 && gaps.length === 0) return null;

  return (
    <div>
      {offerSummary && <OfferSummaryBlock summary={offerSummary} />}

      {map.length > 0 && (
        <section style={{ marginTop: offerSummary ? 24 : 0 }}>
          <div style={subHeaderStyle}>Your priorities and what the offer says</div>
          <div style={{ marginTop: 12 }}>
            {map.map((m, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '6px 0',
                  borderTop: i === 0 ? 'none' : '1px solid rgba(27,42,74,0.08)',
                }}
              >
                <span style={{ ...bodyStyle }}>{m.priority}</span>
                <StatusPill status={m.status} />
              </div>
            ))}
          </div>
        </section>
      )}

      {gaps.length > 0 && (
        <section style={{ marginTop: 24 }}>
          <div style={subHeaderStyle}>What the offer is silent on</div>
          <ul style={{ margin: '12px 0 0 0', paddingLeft: 20 }}>
            {gaps.map((g) => (
              <li key={g.key} style={{ ...bodyStyle, padding: '3px 0' }}>
                {g.text}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
