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
import { calculatePensionValue } from '@/src/lib/pensionValuation';
import { formatUSD } from '@/src/lib/format/currency';
import { PVA_FORMULA_GLOSS, glossFor } from '../pvaGlosses.js';

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

// ─── §8.6.5 PVA fixture embed (PR-B2-β) ────────────────────────────────────
// Build REAL PVA results via calculatePensionValue (TC-PVA-Tier2-1 + TC-PVA-
// Coverture-1 fixture inputs) so accessor mismatches surface immediately.
const tier2Results = calculatePensionValue({
  path: 'tier_2',
  participantDOB: '1981-05-01',
  caseEffectiveDate: '2026-05-01',
  planNRA: 65,
  accruedMonthlyBenefitAtNRA: 3000,
  formOfBenefitOnStatement: 'single_life',
  vestingStatus: 'fully_vested',
  benefitSource: 'plan_estimator_or_manual_calculation',
  mortalityTable: 'irs_417e',
  discountRateBps: 5234,
  cola: 0,
});

const tier3CovertureResults = calculatePensionValue({
  path: 'tier_3',
  participantDOB: '1975-01-01',
  caseEffectiveDate: '2026-05-01',
  dateOfHire: '2010-01-01',
  dateOfMarriage: '2015-06-01',
  maritalCutoffDate: '2024-12-31',
  expectedRetirementAge: 65,
  currentAccruedMonthlyBenefit: 2500,
  formOfBenefitOnStatement: 'single_life',
  vestingStatus: 'fully_vested',
  benefitSource: 'official_statement',
  mortalityTable: 'irs_417e',
  discountRateBps: 5234,
  cola: 0,
});

// Asset slots (same-key with the PVA assetId).
const dbTier2Asset = {
  userRole: 'participant',
  planType: 'private_db',
  planName: 'Tier2 Pension',
  employer: 'Tier2Co',
  pvSource: 'pva_db_tier2_v1',
  _prePopSources: {},
  decisions: {},
  metadata: { formulaId: null, citations: [], qdroPacketGeneratedAt: null },
};
const dbTier3Asset = {
  userRole: 'alternatePayee',
  planType: 'private_db',
  planName: 'Tier3 Pension',
  employer: 'Tier3Co',
  pvSource: 'pva_db_tier3_coverture_v1',
  _prePopSources: {},
  decisions: {},
  metadata: { formulaId: null, citations: [], qdroPacketGeneratedAt: null },
};

const stateWithPVA = (qdroAssets, pvaAssets) => ({
  qdroDecision: { assets: qdroAssets },
  pensionValuation: { assets: pvaAssets },
});

describe('buildFullBranchSection — §8.6.5 PVA fixture embed (PR-B2-β)', () => {
  it('embeds full PV headline + gloss + formulaId + citations + snapshot when private_db has usable non-coverture results', () => {
    const md = buildFullBranchSection('a', dbTier2Asset, tier2Results);
    // LOCKED §8.6.5 headline shape:
    expect(md).toMatch(
      /- PVA computation: Tier 2 face PV \$[\d,]+ \(range \$[\d,]+–\$[\d,]+\), formulaId `pva_db_tier2_v1` — see PVA report for methodology\./,
    );
    // Real PVA citations from CITATIONS_BY_PATH.tier_2 (verbatim):
    expect(md).toContain('- Citations: IRC §417(e)(3); 26 CFR §1.417(e)-1; SOA actuarial standards (commutation methodology)');
    // ISO snapshot present (any ISO string with T):
    expect(md).toMatch(/- PVA snapshot: \d{4}-\d{2}-\d{2}T/);
    // No marital line for non-coverture results.
    expect(md).not.toMatch(/PVA marital portion/);
    // The §8.6.3 fallback must NOT also fire (no double-emit).
    expect(md).not.toContain('PV: not computed');
  });

  it('embeds BOTH the full headline and the marital line under coverture; the two figures are distinct', () => {
    const md = buildFullBranchSection('a', dbTier3Asset, tier3CovertureResults);
    // Full/total headline (the §8.6.5 pv.full):
    const headlineMatch = md.match(/- PVA computation: Tier 3 \(coverture\) PV \$([\d,]+) \(range \$([\d,]+)–\$([\d,]+)\), formulaId `pva_db_tier3_coverture_v1` — see PVA report for methodology\./);
    expect(headlineMatch).not.toBeNull();
    // Marital line (the §8.6.5 pv.marital):
    const maritalMatch = md.match(/- PVA marital portion: \$([\d,]+) \(range \$([\d,]+)–\$([\d,]+)\)/);
    expect(maritalMatch).not.toBeNull();
    // Distinct figures — regression that collapsed headline→marital (or omitted full) would fail here.
    expect(headlineMatch[1]).not.toBe(maritalMatch[1]);
    // Sanity: the headline number equals formatUSD(FULL/total accessor) and the
    // marital number equals formatUSD(MARITAL accessor). Asserting against
    // `formatUSD(x)` (not the raw float) verifies the accessor binding without
    // coupling to the formatter's rounding — the embed uses `formatUSD`, so
    // do the test.
    expect(`$${headlineMatch[1]}`).toBe(formatUSD(tier3CovertureResults.pv.total.best));
    expect(`$${maritalMatch[1]}`).toBe(formatUSD(tier3CovertureResults.pv.marital.best));
  });

  it('falls back to "PV: not computed" when private_db has no usable results', () => {
    const md = buildFullBranchSection('c', privateDbNoPv, null);
    expect(md).toContain('- PV: not computed (run the Pension Valuation Analyzer — §8.6.3)');
    expect(md).not.toMatch(/PVA computation:/);
    expect(md).not.toMatch(/PVA marital portion/);
    expect(md).not.toMatch(/PVA snapshot:/);
  });

  it('emits no PVA embed and no fallback for dc/ira assets even when results are passed', () => {
    const mdDc = buildFullBranchSection('a', dcParticipant, tier2Results);
    const mdIra = buildFullBranchSection('b', iraPrepopped, tier2Results);
    for (const md of [mdDc, mdIra]) {
      expect(md).not.toMatch(/PVA computation:/);
      expect(md).not.toMatch(/PVA marital portion/);
      expect(md).not.toMatch(/PV: not computed/);
    }
  });

  it('guards the Citations line when metadata.citations is empty or absent (no crash, no Citations line)', () => {
    // Empty citations:
    const resultsEmptyCites = {
      ...tier2Results,
      metadata: { ...tier2Results.metadata, citations: [] },
    };
    const mdEmpty = buildFullBranchSection('a', dbTier2Asset, resultsEmptyCites);
    expect(mdEmpty).not.toMatch(/- Citations:/);
    expect(mdEmpty).toMatch(/PVA computation: Tier 2 face/);
    // Absent metadata:
    const resultsNoMeta = { ...tier2Results, metadata: undefined };
    const mdNoMeta = buildFullBranchSection('a', dbTier2Asset, resultsNoMeta);
    expect(mdNoMeta).not.toMatch(/- Citations:/);
    expect(mdNoMeta).not.toMatch(/- PVA snapshot:/);
    expect(mdNoMeta).toMatch(/PVA computation: Tier 2 face/);
  });

  it('threads results from the composer: state with both qdroDecision.assets and pensionValuation.assets embeds in private_db only', () => {
    const md = buildMarkdownPacket(
      stateWithPVA(
        { d: dcParticipant, t2: dbTier2Asset, t3: dbTier3Asset },
        { t2: { results: tier2Results }, t3: { results: tier3CovertureResults } },
      ),
      { generatedAt: GEN_AT },
    );
    // Both private_db sections render the embed:
    expect(md).toMatch(/Tier2 Pension[\s\S]*PVA computation: Tier 2 face/);
    expect(md).toMatch(/Tier3 Pension[\s\S]*PVA computation: Tier 3 \(coverture\)/);
    // Marital line appears for the coverture asset:
    expect(md).toMatch(/Tier3 Pension[\s\S]*PVA marital portion:/);
    // DC asset has neither embed nor fallback line:
    expect(md).toMatch(/MegaCorp 401\(k\)[\s\S]*?\*\*Decisions captured\*\*/);
    const dcSection = md.split('MegaCorp 401(k)')[1].split('### ')[0];
    expect(dcSection).not.toMatch(/PVA computation:/);
    expect(dcSection).not.toMatch(/PV: not computed/);
  });

  it('falls back gracefully to the raw formulaId for an unmapped value (glossFor never renders "undefined")', () => {
    const resultsUnknownFormula = {
      ...tier2Results,
      formulaId: 'pva_future_formula_v9',
    };
    // glossFor unit-check:
    expect(glossFor('pva_future_formula_v9')).toBe('pva_future_formula_v9');
    expect(glossFor(null)).toBe(null);
    // Embed never emits "undefined":
    const md = buildFullBranchSection('a', dbTier2Asset, resultsUnknownFormula);
    expect(md).not.toMatch(/undefined/);
    expect(md).toMatch(/PVA computation: pva_future_formula_v9 PV/);
    // Sanity on the locked label set:
    expect(Object.keys(PVA_FORMULA_GLOSS).sort()).toEqual([
      'pva_cashbalance_passthrough_v1',
      'pva_db_inpaystatus_v1',
      'pva_db_tier1_v1',
      'pva_db_tier2_v1',
      'pva_db_tier3_coverture_v1',
    ]);
  });

  it('summary-header "N missing" count equals the number of per-asset sections rendering "PV: not computed"', () => {
    // Two private_db assets: one with usable results (no fallback), one without (fallback). Header should count 1 missing.
    const md = buildMarkdownPacket(
      stateWithPVA(
        { t2: dbTier2Asset, p: privateDbNoPv },
        { t2: { results: tier2Results } },
      ),
      { generatedAt: GEN_AT },
    );
    // Summary header counts 1 missing (privateDbNoPv has pvSource: null per fixture).
    expect(md).toContain('PV not yet computed for 1 private DB asset(s).');
    // Exactly one per-asset "PV: not computed" line.
    const fallbackCount = (md.match(/- PV: not computed \(run the Pension Valuation Analyzer/g) || []).length;
    expect(fallbackCount).toBe(1);
  });
});
