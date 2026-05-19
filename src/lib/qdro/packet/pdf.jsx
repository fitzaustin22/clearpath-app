/**
 * QDRO Decision Guide — §8.7 Attorney Handoff Packet PDF document.
 *
 * PR4-1: @react-pdf/renderer, client-side generation (the caller turns this
 * element into a Blob via `pdf(...).toBlob()`). This module only declares
 * the document tree — it never rasterizes.
 *
 * Section ordering mirrors markdown.js per the LOCKED §8.7.2 schema
 * (summary header → private_db → dc → ira → specialist-routing →
 * disclaimer). The §8.9.2 bullets come from the PR1 QDG_DISCLAIMER_BULLETS
 * constant; the §8.6.3 / §8.7.5 packet literals are transcribed verbatim
 * from M5-Tool-Specs.md (the spec is the single source of truth — the
 * markdown + PDF renderers are kept in lockstep by their tests).
 *
 * The tree is built from plain element-returning helpers (no nested
 * function components) so it is a flat React-PDF primitive tree — pure and
 * walkable by structure-only tests, and hook-free.
 */

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import {
  QDG_DISCLAIMER_BULLETS,
  flagOnlyAssets,
  privateDbMissingPvSource,
  getFlagOnlyBranch,
} from '@/src/lib/qdro';

const ROUTING_HEADER =
  'The following retirement assets require specialist drafting. Engage attorneys experienced with each regime; generalist domestic-relations counsel often runs into rejection.';
const ROUTING_CROSS_CUTTING_NOTE =
  'Each of these regimes has its own statutory framework, drafting conventions, and plan-administrator pre-approval pathway. Decisions captured above are starting points for attorney conversation, not order language.';
const pvMissingWarning = (n) =>
  `**PV not yet computed for ${n} private DB asset(s).** This packet captures your decisions but does not include actuarial valuations. To produce a complete packet, run the Pension Valuation Analyzer (M5 Tool 2) for each pension before regenerating this handoff.`;

const PLAN_TYPE_LABEL = {
  private_db: 'Private defined-benefit pension',
  dc: 'Defined-contribution account (401(k)/403(b)/457(b))',
  ira: 'IRA',
  gov_civilian: 'Federal civilian (CSRS/FERS)',
  military: 'Military retired pay (USFSPA)',
  state_municipal: 'State / municipal retirement',
};
const FULL_BRANCH_ORDER = ['private_db', 'dc', 'ira'];

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 10, lineHeight: 1.4, fontFamily: 'Helvetica' },
  h1: { fontSize: 16, marginBottom: 12 },
  h2: { fontSize: 12, marginTop: 16, marginBottom: 6 },
  h3: { fontSize: 11, marginTop: 10, marginBottom: 4 },
  line: { marginBottom: 2 },
  warn: { marginTop: 6, marginBottom: 6 },
});

function perspectiveLabel(userRole) {
  if (userRole === 'participant') return 'Participant';
  if (userRole === 'alternatePayee') return 'Alternate payee';
  return 'Perspective not set';
}

function decisionLines(decisions) {
  const out = [];
  for (const [key, value] of Object.entries(decisions || {})) {
    if (key === 'starterQuestionResponses') continue;
    if (key === 'valuationDate' && value && typeof value === 'object') {
      out.push(`valuationDate: ${value.type ?? 'not set'}${value.date ? ` (${value.date})` : ''}`);
    } else if (key === 'receiptMethod' && value == null) {
      out.push('receiptMethod: n/a (participant — §8.5.4.2)');
    } else {
      out.push(`${key}: ${value === '' ? '(blank)' : value}`);
    }
  }
  return out.length > 0 ? out : ['(no decisions captured yet)'];
}

function summaryHeaderEls(assets, generatedAt) {
  const list = Object.entries(assets);
  const count = (pt) => list.filter(([, a]) => a.planType === pt).length;
  const flagOnly = count('gov_civilian') + count('military') + count('state_municipal');
  const participants = list.filter(([, a]) => a.userRole === 'participant').length;
  const alternates = list.filter(([, a]) => a.userRole === 'alternatePayee').length;
  const pvMissing = privateDbMissingPvSource(assets);
  const els = [
    <Text key="sh-h" style={styles.h2}>Cross-asset summary</Text>,
    <Text key="sh-a" style={styles.line}>
      {`Assets: ${count('private_db')} private DB pension(s), ${count('dc')} DC account(s), ${count('ira')} IRA(s), ${flagOnly} flag-only retirement asset(s)`}
    </Text>,
    <Text key="sh-p" style={styles.line}>
      {`Perspective: Participant on ${participants} asset(s); alternate payee on ${alternates} asset(s)`}
    </Text>,
    <Text key="sh-s" style={styles.line}>
      {`Specialist routing: ${flagOnly} flag-only asset(s) require specialist-attorney drafting`}
    </Text>,
    <Text key="sh-g" style={styles.line}>{`Generated: ${generatedAt}`}</Text>,
  ];
  if (pvMissing.length > 0) {
    els.push(
      <Text key="sh-w" style={styles.warn}>{pvMissingWarning(pvMissing.length)}</Text>,
    );
  }
  return els;
}

function fullBranchEls(assetId, asset) {
  const els = [
    <Text key={`${assetId}-n`} style={styles.h3}>{asset.planName ?? 'Unnamed asset'}</Text>,
    <Text key={`${assetId}-t`} style={styles.line}>{`Plan type: ${PLAN_TYPE_LABEL[asset.planType] ?? asset.planType}`}</Text>,
    <Text key={`${assetId}-e`} style={styles.line}>{`Employer: ${asset.employer ?? '—'}`}</Text>,
    <Text key={`${assetId}-pp`} style={styles.line}>{`Perspective: ${perspectiveLabel(asset.userRole)}`}</Text>,
  ];
  if (asset._prePopSources && Object.keys(asset._prePopSources).length > 0) {
    els.push(
      <Text key={`${assetId}-m2`} style={styles.line}>{`Inventoried in M2: pre-populated asset (${assetId})`}</Text>,
    );
  }
  if (asset.planType === 'private_db' && asset.pvSource == null) {
    els.push(
      <Text key={`${assetId}-pv`} style={styles.line}>
        PV: not computed (run the Pension Valuation Analyzer — §8.6.3)
      </Text>,
    );
  }
  els.push(<Text key={`${assetId}-dl`} style={styles.line}>Decisions captured:</Text>);
  decisionLines(asset.decisions).forEach((l, i) =>
    els.push(<Text key={`${assetId}-d${i}`} style={styles.line}>{`• ${l}`}</Text>),
  );
  return [<View key={`${assetId}-sec`}>{els}</View>];
}

function specialistRoutingEls(entries) {
  const els = [
    <Text key="sr-h2" style={styles.h2}>Specialist-routing assets</Text>,
    <Text key="sr-hdr" style={styles.line}>{ROUTING_HEADER}</Text>,
  ];
  for (const { assetId, asset } of entries) {
    const branch = getFlagOnlyBranch(asset.planType);
    const starterQuestions = branch?.starterQuestions ?? [];
    const wordingFor = (qid) => starterQuestions.find((q) => q.id === qid)?.wording ?? qid;
    const captured = asset.decisions?.starterQuestionResponses ?? [];
    const sub = [
      <Text key={`${assetId}-n`} style={styles.h3}>{asset.planName ?? 'Unnamed asset'}</Text>,
      <Text key={`${assetId}-pp`} style={styles.line}>{`Perspective: ${perspectiveLabel(asset.userRole)}`}</Text>,
      <Text key={`${assetId}-sr`} style={styles.line}>{`Specialist routing: ${branch?.consultSpecialistCallout ?? ''}`}</Text>,
      <Text key={`${assetId}-sq`} style={styles.line}>Starter questions captured:</Text>,
    ];
    if (captured.length > 0) {
      captured.forEach((r, i) =>
        sub.push(
          <Text key={`${assetId}-q${i}`} style={styles.line}>{`• ${wordingFor(r.questionId)} — ${r.response}`}</Text>,
        ),
      );
    } else {
      sub.push(
        <Text key={`${assetId}-q0`} style={styles.line}>• (none captured — deferred to attorney)</Text>,
      );
    }
    els.push(<View key={`${assetId}-sub`}>{sub}</View>);
  }
  els.push(<Text key="sr-note" style={styles.warn}>{ROUTING_CROSS_CUTTING_NOTE}</Text>);
  return els;
}

function disclaimerEls() {
  return [
    <Text key="dc-h" style={styles.h2}>Disclaimer</Text>,
    ...QDG_DISCLAIMER_BULLETS.map((b, i) => (
      <Text key={`dc-${i}`} style={styles.line}>{`• ${b}`}</Text>
    )),
  ];
}

export default function QDROHandoffPacketPDF({ state, generatedAt }) {
  const assets = state?.qdroDecision?.assets ?? {};
  const at = generatedAt ?? new Date().toISOString();
  const flagOnly = flagOnlyAssets(assets);

  const body = [
    <Text key="title" style={styles.h1}>
      ClearPath QDRO Decision Guide — Attorney Handoff Packet
    </Text>,
    <View key="summary">{summaryHeaderEls(assets, at)}</View>,
  ];
  for (const planType of FULL_BRANCH_ORDER) {
    for (const [assetId, asset] of Object.entries(assets)) {
      if (asset.planType === planType) body.push(...fullBranchEls(assetId, asset));
    }
  }
  if (flagOnly.length > 0) {
    body.push(<View key="routing">{specialistRoutingEls(flagOnly)}</View>);
  }
  body.push(<View key="disclaimer">{disclaimerEls()}</View>);

  return (
    <Document>
      <Page size="LETTER" style={styles.page} wrap>
        {body}
      </Page>
    </Document>
  );
}
