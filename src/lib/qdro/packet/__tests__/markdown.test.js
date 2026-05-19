// Tests for the §8.7 Attorney Handoff Packet markdown generator. Pure
// functions; per-section builders + buildMarkdownPacket composition. LOCKED
// literals (§8.6.3 PV-missing warning, §8.7.5 header + cross-cutting note,
// §8.9.2 disclaimer bullets) asserted verbatim against the spec.

import { describe, it, expect } from 'vitest';
import {
  buildSummaryHeader,
  buildFullBranchSection,
  buildSpecialistRoutingBlock,
  buildDisclaimerFooter,
  buildMarkdownPacket,
} from '../markdown.js';
import { QDG_DISCLAIMER_BULLETS, getFlagOnlyBranch } from '@/src/lib/qdro';

const GEN_AT = '2026-05-19T12:00:00.000Z';

const dcParticipant = {
  userRole: 'participant',
  planType: 'dc',
  planName: 'MegaCorp 401(k)',
  employer: 'MegaCorp',
  pvSource: null,
  _prePopSources: {},
  decisions: {
    allocationType: 'percentage',
    allocationValue: 50,
    receiptMethod: null,
    valuationDate: { type: 'divorce', date: '2026-01-01' },
  },
  metadata: { formulaId: null, citations: [], qdroPacketGeneratedAt: null },
};
const iraPrepopped = {
  userRole: 'alternatePayee',
  planType: 'ira',
  planName: 'Spouse IRA',
  employer: null,
  pvSource: null,
  _prePopSources: { planType: { source: 'm2.retirementAsset', timestamp: GEN_AT } },
  decisions: { decreeLanguageConfirmed: 'not_yet_drafted', custodian: 'Vanguard', custodianNotes: '' },
  metadata: { formulaId: null, citations: [], qdroPacketGeneratedAt: null },
};
const privateDbNoPv = {
  userRole: 'participant',
  planType: 'private_db',
  planName: 'Acme Pension',
  employer: 'Acme',
  pvSource: null,
  _prePopSources: {},
  decisions: {},
  metadata: { formulaId: null, citations: [], qdroPacketGeneratedAt: null },
};
const govFlagOnly = {
  userRole: 'alternatePayee',
  planType: 'gov_civilian',
  planName: 'FERS Pension',
  employer: 'OPM',
  pvSource: null,
  _prePopSources: {},
  decisions: {
    starterQuestionResponses: [
      { questionId: 'gov_civilian_q1', response: 'marital fraction' },
      { questionId: 'gov_civilian_q2', response: 'full survivor annuity' },
    ],
  },
  metadata: { formulaId: null, citations: [], qdroPacketGeneratedAt: null },
};

const stateWith = (assets) => ({ qdroDecision: { assets } });

// LOCKED spec literals (verbatim from M5-Tool-Specs.md).
const LOCKED_PV_MISSING =
  '**PV not yet computed for 1 private DB asset(s).** This packet captures your decisions but does not include actuarial valuations. To produce a complete packet, run the Pension Valuation Analyzer (M5 Tool 2) for each pension before regenerating this handoff.';
const LOCKED_ROUTING_HEADER =
  'The following retirement assets require specialist drafting. Engage attorneys experienced with each regime; generalist domestic-relations counsel often runs into rejection.';
const LOCKED_ROUTING_NOTE =
  'Each of these regimes has its own statutory framework, drafting conventions, and plan-administrator pre-approval pathway. Decisions captured above are starting points for attorney conversation, not order language.';

describe('buildSummaryHeader (§8.7.3)', () => {
  it('renders the asset-count-by-plan-type line', () => {
    const md = buildSummaryHeader(
      { a: dcParticipant, b: iraPrepopped, c: privateDbNoPv, f: govFlagOnly },
      GEN_AT,
    );
    expect(md).toContain('1 private DB pension(s), 1 DC account(s), 1 IRA(s), 1 flag-only retirement asset(s)');
  });

  it('renders the perspective-mix line', () => {
    const md = buildSummaryHeader({ a: dcParticipant, b: iraPrepopped }, GEN_AT);
    expect(md).toContain('Participant on 1 asset(s); alternate payee on 1 asset(s)');
  });

  it('renders the specialist-routing flag count and ISO8601 generation timestamp', () => {
    const md = buildSummaryHeader({ a: dcParticipant, f: govFlagOnly }, GEN_AT);
    expect(md).toMatch(/1 flag-only asset.*specialist/i);
    expect(md).toContain(GEN_AT);
  });

  it('includes the LOCKED §8.6.3 PV-missing warning when a private_db asset has null pvSource', () => {
    expect(buildSummaryHeader({ c: privateDbNoPv }, GEN_AT)).toContain(LOCKED_PV_MISSING);
  });

  it('omits the PV-missing warning when no private_db asset is missing pvSource', () => {
    expect(buildSummaryHeader({ a: dcParticipant }, GEN_AT)).not.toContain('PV not yet computed');
  });
});

describe('buildFullBranchSection (§8.7.4)', () => {
  it('renders asset header: plan name, employer, perspective, plan-type label', () => {
    const md = buildFullBranchSection('a', dcParticipant);
    expect(md).toContain('MegaCorp 401(k)');
    expect(md).toContain('MegaCorp');
    expect(md).toMatch(/participant/i);
    expect(md).toMatch(/defined.contribution|DC/i);
  });

  it('lists the captured decisions', () => {
    const md = buildFullBranchSection('b', iraPrepopped);
    expect(md).toContain('Vanguard');
    expect(md).toMatch(/not_yet_drafted/);
  });

  it('emits an M2 source-attribution line when _prePopSources is present, omits it otherwise', () => {
    expect(buildFullBranchSection('b', iraPrepopped)).toMatch(/Inventoried in M2/i);
    expect(buildFullBranchSection('a', dcParticipant)).not.toMatch(/Inventoried in M2/i);
  });
});

describe('buildSpecialistRoutingBlock (§8.7.5)', () => {
  it('opens with the LOCKED header copy verbatim', () => {
    expect(buildSpecialistRoutingBlock([{ assetId: 'f', asset: govFlagOnly }])).toContain(LOCKED_ROUTING_HEADER);
  });

  it('renders per-asset plan name, perspective, §8.5.6 consult-specialist copy, and captured starter Qs mapped to spec wording', () => {
    const md = buildSpecialistRoutingBlock([{ assetId: 'f', asset: govFlagOnly }]);
    expect(md).toContain('FERS Pension');
    expect(md).toMatch(/alternate payee/i);
    expect(md).toContain(getFlagOnlyBranch('gov_civilian').consultSpecialistCallout);
    // captured starter Q mapped from questionId → §8.5.6 wording + response
    expect(md).toContain('Will the former-spouse share be expressed as a marital fraction');
    expect(md).toContain('marital fraction');
  });

  it('closes with the LOCKED cross-cutting note verbatim', () => {
    expect(buildSpecialistRoutingBlock([{ assetId: 'f', asset: govFlagOnly }])).toContain(LOCKED_ROUTING_NOTE);
  });
});

describe('buildDisclaimerFooter (§8.9.2)', () => {
  it('renders all 4 LOCKED disclaimer bullets verbatim from the PR1 constant', () => {
    const md = buildDisclaimerFooter();
    for (const bullet of QDG_DISCLAIMER_BULLETS) {
      expect(md).toContain(bullet);
    }
    expect(QDG_DISCLAIMER_BULLETS).toHaveLength(4);
  });
});

describe('buildMarkdownPacket (§8.7.2 composition + ordering)', () => {
  it('orders sections: summary header → private_db → dc → ira → specialist-routing → disclaimer footer', () => {
    const md = buildMarkdownPacket(
      stateWith({ d: dcParticipant, i: iraPrepopped, p: privateDbNoPv, f: govFlagOnly }),
      { generatedAt: GEN_AT },
    );
    const iHeader = md.indexOf('Attorney Handoff Packet');
    const iPrivateDb = md.indexOf('Acme Pension');
    const iDc = md.indexOf('MegaCorp 401(k)');
    const iIra = md.indexOf('Spouse IRA');
    const iRouting = md.indexOf(LOCKED_ROUTING_HEADER);
    const iDisclaimer = md.indexOf(QDG_DISCLAIMER_BULLETS[0]);
    expect(iHeader).toBeGreaterThanOrEqual(0);
    expect(iHeader).toBeLessThan(iPrivateDb);
    expect(iPrivateDb).toBeLessThan(iDc);
    expect(iDc).toBeLessThan(iIra);
    expect(iIra).toBeLessThan(iRouting);
    expect(iRouting).toBeLessThan(iDisclaimer);
  });

  it('omits the full-branch group when there are no full-branch assets, and the specialist block when no flag-only', () => {
    const onlyFlag = buildMarkdownPacket(stateWith({ f: govFlagOnly }), { generatedAt: GEN_AT });
    expect(onlyFlag).toContain(LOCKED_ROUTING_HEADER);
    const onlyFull = buildMarkdownPacket(stateWith({ d: dcParticipant }), { generatedAt: GEN_AT });
    expect(onlyFull).not.toContain(LOCKED_ROUTING_HEADER);
  });

  it('always includes the summary header and disclaimer footer (single-asset packet is well-formed markdown)', () => {
    const md = buildMarkdownPacket(stateWith({ d: dcParticipant }), { generatedAt: GEN_AT });
    expect(md.startsWith('#')).toBe(true);
    expect(md).toContain('Attorney Handoff Packet');
    expect(md).toContain(QDG_DISCLAIMER_BULLETS[0]);
  });
});
