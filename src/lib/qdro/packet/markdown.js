/**
 * QDRO Decision Guide — §8.7 Attorney Handoff Packet markdown generator.
 *
 * Pure functions only (PR4-2: no template library). One builder per packet
 * section; `buildMarkdownPacket` composes them in the LOCKED §8.7.2 order:
 *
 *   1. Cross-asset summary header        (§8.7.3)
 *   2. Full-branch asset sections        (§8.7.4)  private_db → dc → ira
 *   3. Consolidated specialist-routing   (§8.7.5)  all flag-only assets
 *   4. Disclaimer footer                 (§8.9.2)  4 locked bullets
 *
 * Locked literals: §8.9.2 disclaimer bullets are consumed from the PR1
 * QDG_DISCLAIMER_BULLETS constant (single source of truth). The §8.6.3
 * PV-missing warning and the §8.7.5 header + cross-cutting note are
 * packet-copy literals owned by this packet module (PR4-2/PR4-7) and are
 * transcribed verbatim from M5-Tool-Specs.md below.
 */

import {
  QDG_DISCLAIMER_BULLETS,
  flagOnlyAssets,
  privateDbMissingPvSource,
  getFlagOnlyBranch,
} from '@/src/lib/qdro';

// ─── LOCKED packet-copy literals (verbatim, M5-Tool-Specs.md) ──────────────
const ROUTING_HEADER =
  'The following retirement assets require specialist drafting. Engage attorneys experienced with each regime; generalist domestic-relations counsel often runs into rejection.';
const ROUTING_CROSS_CUTTING_NOTE =
  'Each of these regimes has its own statutory framework, drafting conventions, and plan-administrator pre-approval pathway. Decisions captured above are starting points for attorney conversation, not order language.';
const pvMissingWarning = (n) =>
  `**PV not yet computed for ${n} private DB asset(s).** This packet captures your decisions but does not include actuarial valuations. To produce a complete packet, run the Pension Valuation Analyzer (M5 Tool 2) for each pension before regenerating this handoff.`;

// Display copy (build-phase flexible per §8.8.1 — not locked literals).
const PLAN_TYPE_LABEL = {
  private_db: 'Private defined-benefit pension',
  dc: 'Defined-contribution account (401(k)/403(b)/457(b))',
  ira: 'IRA',
  gov_civilian: 'Federal civilian (CSRS/FERS)',
  military: 'Military retired pay (USFSPA)',
  state_municipal: 'State / municipal retirement',
};
const FULL_BRANCH_ORDER = ['private_db', 'dc', 'ira'];

function perspectiveLabel(userRole) {
  if (userRole === 'participant') return 'Participant';
  if (userRole === 'alternatePayee') return 'Alternate payee';
  return 'Perspective not set';
}

function entries(assets) {
  return Object.entries(assets || {});
}

/** §8.7.3 — cross-asset summary header. */
export function buildSummaryHeader(assets, generatedAt) {
  const list = entries(assets);
  const count = (pt) => list.filter(([, a]) => a.planType === pt).length;
  const flagOnly = count('gov_civilian') + count('military') + count('state_municipal');
  const participants = list.filter(([, a]) => a.userRole === 'participant').length;
  const alternates = list.filter(([, a]) => a.userRole === 'alternatePayee').length;
  const pvMissing = privateDbMissingPvSource(assets);

  const lines = [
    '## Cross-asset summary',
    '',
    `- Assets: ${count('private_db')} private DB pension(s), ${count('dc')} DC account(s), ${count('ira')} IRA(s), ${flagOnly} flag-only retirement asset(s)`,
    `- Perspective: Participant on ${participants} asset(s); alternate payee on ${alternates} asset(s)`,
    `- Specialist routing: ${flagOnly} flag-only asset(s) require specialist-attorney drafting`,
    `- Generated: ${generatedAt}`,
  ];
  if (pvMissing.length > 0) {
    lines.push('', `> ${pvMissingWarning(pvMissing.length)}`);
  }
  return lines.join('\n');
}

function renderDecisionLines(decisions) {
  const out = [];
  for (const [key, value] of Object.entries(decisions || {})) {
    if (key === 'starterQuestionResponses') continue; // flag-only — §8.7.5, not here
    if (key === 'valuationDate' && value && typeof value === 'object') {
      const d = value.date ? ` (${value.date})` : '';
      out.push(`- valuationDate: ${value.type ?? 'not set'}${d}`);
      continue;
    }
    if (key === 'receiptMethod' && value == null) {
      out.push('- receiptMethod: n/a (participant — §8.5.4.2)');
      continue;
    }
    out.push(`- ${key}: ${value === '' ? '(blank)' : value}`);
  }
  return out.length > 0 ? out : ['- (no decisions captured yet)'];
}

/** §8.7.4 — per-asset section for a full branch (private_db | dc | ira). */
export function buildFullBranchSection(assetId, asset) {
  const lines = [
    `### ${asset.planName ?? 'Unnamed asset'}`,
    '',
    `- Plan type: ${PLAN_TYPE_LABEL[asset.planType] ?? asset.planType}`,
    `- Employer: ${asset.employer ?? '—'}`,
    `- Perspective: ${perspectiveLabel(asset.userRole)}`,
  ];
  if (asset._prePopSources && Object.keys(asset._prePopSources).length > 0) {
    lines.push(`- Inventoried in M2: pre-populated asset (${assetId})`);
  }
  if (asset.planType === 'private_db' && asset.pvSource == null) {
    lines.push('- PV: not computed (run the Pension Valuation Analyzer — §8.6.3)');
  }
  lines.push('', '**Decisions captured**', ...renderDecisionLines(asset.decisions));
  return lines.join('\n');
}

/** §8.7.5 — single consolidated block for all flag-only assets. */
export function buildSpecialistRoutingBlock(flagOnlyEntries) {
  const blocks = [`## Specialist-routing assets`, '', ROUTING_HEADER];
  for (const { asset } of flagOnlyEntries) {
    const branch = getFlagOnlyBranch(asset.planType);
    const starterQuestions = branch?.starterQuestions ?? [];
    const wordingFor = (qid) => starterQuestions.find((q) => q.id === qid)?.wording ?? qid;
    const captured = (asset.decisions?.starterQuestionResponses ?? []).map(
      (r) => `  - ${wordingFor(r.questionId)}\n    > ${r.response}`,
    );
    blocks.push(
      '',
      `### ${asset.planName ?? 'Unnamed asset'}`,
      '',
      `- Perspective: ${perspectiveLabel(asset.userRole)}`,
      `- Specialist routing: ${branch?.consultSpecialistCallout ?? ''}`,
      '',
      '**Starter questions captured**',
      ...(captured.length > 0 ? captured : ['  - (none captured — deferred to attorney)']),
    );
  }
  blocks.push('', ROUTING_CROSS_CUTTING_NOTE);
  return blocks.join('\n');
}

/** §8.9.2 — locked 4-bullet disclaimer footer (PR1 constant). */
export function buildDisclaimerFooter() {
  return ['## Disclaimer', '', ...QDG_DISCLAIMER_BULLETS.map((b) => `- ${b}`)].join('\n');
}

/**
 * §8.7.2 — compose the full packet. `opts.generatedAt` is an ISO8601 string
 * (the transient generation moment per PR4-6); defaults to now. Section
 * groups are omitted when empty; the summary header and disclaimer footer
 * always render.
 */
export function buildMarkdownPacket(state, opts = {}) {
  const assets = state?.qdroDecision?.assets ?? {};
  const generatedAt = opts.generatedAt ?? new Date().toISOString();

  const parts = [
    '# ClearPath QDRO Decision Guide — Attorney Handoff Packet',
    buildSummaryHeader(assets, generatedAt),
  ];

  for (const planType of FULL_BRANCH_ORDER) {
    for (const [assetId, asset] of entries(assets)) {
      if (asset.planType === planType) {
        parts.push(buildFullBranchSection(assetId, asset));
      }
    }
  }

  const flagOnly = flagOnlyAssets(assets);
  if (flagOnly.length > 0) {
    parts.push(buildSpecialistRoutingBlock(flagOnly));
  }

  parts.push(buildDisclaimerFooter());
  return parts.join('\n\n');
}
