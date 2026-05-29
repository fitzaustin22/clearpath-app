// Structure-only tests for the §8.7 PDF packet (PR4-1: @react-pdf/renderer,
// client-side). We assert the React element tree only — never rasterize or
// generate PDF bytes (jsdom cannot, and PR4-1 generation is browser-side).
//
// QDROHandoffPacketPDF is a pure, hook-free function component, so we invoke
// it directly and walk the returned element tree.

import { describe, it, expect } from 'vitest';
import { Document, Page, Text } from '@react-pdf/renderer';
import QDROHandoffPacketPDF from '../pdf.jsx';
import { QDG_DISCLAIMER_BULLETS } from '@/src/lib/qdro';
import { calculatePensionValue } from '@/src/lib/pensionValuation';
import { formatUSD } from '@/src/lib/format/currency';

const GEN_AT = '2026-05-19T12:00:00.000Z';

const dc = {
  userRole: 'participant', planType: 'dc', planName: 'MegaCorp 401(k)', employer: 'MegaCorp',
  pvSource: null, _prePopSources: {},
  decisions: { allocationType: 'percentage', allocationValue: 50, receiptMethod: null, valuationDate: { type: 'divorce', date: '2026-01-01' } },
  metadata: { formulaId: null, citations: [], qdroPacketGeneratedAt: null },
};
const ira = {
  userRole: 'alternatePayee', planType: 'ira', planName: 'Spouse IRA', employer: null,
  pvSource: null, _prePopSources: {},
  decisions: { decreeLanguageConfirmed: 'yes', custodian: 'Vanguard', custodianNotes: '' },
  metadata: { formulaId: null, citations: [], qdroPacketGeneratedAt: null },
};
const privateDb = {
  userRole: 'participant', planType: 'private_db', planName: 'Acme Pension', employer: 'Acme',
  pvSource: null, _prePopSources: {}, decisions: {},
  metadata: { formulaId: null, citations: [], qdroPacketGeneratedAt: null },
};
const govFlag = {
  userRole: 'alternatePayee', planType: 'gov_civilian', planName: 'FERS Pension', employer: 'OPM',
  pvSource: null, _prePopSources: {},
  decisions: { starterQuestionResponses: [{ questionId: 'gov_civilian_q1', response: 'marital fraction' }] },
  metadata: { formulaId: null, citations: [], qdroPacketGeneratedAt: null },
};

const LOCKED_ROUTING_HEADER =
  'The following retirement assets require specialist drafting. Engage attorneys experienced with each regime; generalist domestic-relations counsel often runs into rejection.';

function tree(state) {
  const acc = { types: [], text: [] };
  (function walk(node) {
    if (node == null || typeof node === 'boolean') return;
    if (Array.isArray(node)) return node.forEach(walk);
    if (typeof node === 'string' || typeof node === 'number') {
      acc.text.push(String(node));
      return;
    }
    acc.types.push(node.type);
    walk(node.props?.children);
  })(QDROHandoffPacketPDF({ state, generatedAt: GEN_AT }));
  return { ...acc, joined: acc.text.join('\n') };
}

describe('QDROHandoffPacketPDF — structure (no rasterization)', () => {
  it('root element is a React-PDF Document containing ≥1 Page', () => {
    const el = QDROHandoffPacketPDF({ state: { qdroDecision: { assets: { d: dc } } }, generatedAt: GEN_AT });
    expect(el.type).toBe(Document);
    const { types } = tree({ qdroDecision: { assets: { d: dc } } });
    expect(types.filter((t) => t === Page).length).toBeGreaterThanOrEqual(1);
    expect(types).toContain(Text);
  });

  it('Text content includes the packet title and the §8.7.3 summary counts', () => {
    const { joined } = tree({ qdroDecision: { assets: { d: dc, i: ira } } });
    expect(joined).toContain('Attorney Handoff Packet');
    expect(joined).toContain('1 DC account(s)');
    expect(joined).toContain(GEN_AT);
  });

  it('includes the LOCKED §8.7.5 routing header when a flag-only asset is present', () => {
    expect(tree({ qdroDecision: { assets: { f: govFlag } } }).joined).toContain(LOCKED_ROUTING_HEADER);
  });

  it('omits the routing header when no flag-only asset is present', () => {
    expect(tree({ qdroDecision: { assets: { d: dc } } }).joined).not.toContain(LOCKED_ROUTING_HEADER);
  });

  it('renders the §8.6.3 PV-missing warning for a private_db asset with null pvSource', () => {
    expect(tree({ qdroDecision: { assets: { p: privateDb } } }).joined).toContain(
      'PV not yet computed for 1 private DB asset(s).',
    );
  });

  it('includes all 4 LOCKED §8.9.2 disclaimer bullets', () => {
    const { joined } = tree({ qdroDecision: { assets: { d: dc } } });
    for (const b of QDG_DISCLAIMER_BULLETS) expect(joined).toContain(b);
  });

  it('orders sections per §8.7.2: title → private_db → dc → ira → specialist-routing → disclaimer', () => {
    const { text } = tree({ qdroDecision: { assets: { d: dc, i: ira, p: privateDb, f: govFlag } } });
    const at = (needle) => text.findIndex((t) => t.includes(needle));
    expect(at('Attorney Handoff Packet')).toBeLessThan(at('Acme Pension'));
    expect(at('Acme Pension')).toBeLessThan(at('MegaCorp 401(k)'));
    expect(at('MegaCorp 401(k)')).toBeLessThan(at('Spouse IRA'));
    expect(at('Spouse IRA')).toBeLessThan(at(LOCKED_ROUTING_HEADER));
    expect(at(LOCKED_ROUTING_HEADER)).toBeLessThan(at(QDG_DISCLAIMER_BULLETS[0]));
  });
});

// ─── §8.6.5 PVA fixture embed (PR-B2-β) ────────────────────────────────────
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

const dbTier2 = {
  userRole: 'participant', planType: 'private_db', planName: 'Tier2 Pension', employer: 'Tier2Co',
  pvSource: 'pva_db_tier2_v1', _prePopSources: {}, decisions: {},
  metadata: { formulaId: null, citations: [], qdroPacketGeneratedAt: null },
};
const dbTier3 = {
  userRole: 'alternatePayee', planType: 'private_db', planName: 'Tier3 Pension', employer: 'Tier3Co',
  pvSource: 'pva_db_tier3_coverture_v1', _prePopSources: {}, decisions: {},
  metadata: { formulaId: null, citations: [], qdroPacketGeneratedAt: null },
};

describe('QDROHandoffPacketPDF — §8.6.5 PVA fixture embed (PR-B2-β)', () => {
  it('embeds full PV headline + gloss + formulaId + citations + snapshot when private_db has usable non-coverture results', () => {
    const { joined } = tree({
      qdroDecision: { assets: { t2: dbTier2 } },
      pensionValuation: { assets: { t2: { results: tier2Results } } },
    });
    expect(joined).toMatch(
      /PVA computation: Tier 2 PV \$[\d,]+ \(range \$[\d,]+–\$[\d,]+\), formulaId `pva_db_tier2_v1` — see PVA report for methodology\./,
    );
    expect(joined).toContain('Citations: IRC §417(e)(3); 26 CFR §1.417(e)-1; SOA actuarial standards (commutation methodology)');
    expect(joined).toMatch(/PVA computed: \d{4}-\d{2}-\d{2}T/);
    expect(joined).not.toMatch(/PVA marital portion/);
    // No "PV: not computed" fallback when usable.
    expect(joined).not.toMatch(/Tier2 Pension[\s\S]*?PV: not computed/);
  });

  it('embeds BOTH the full headline and the marital line under coverture; the two figures are distinct', () => {
    const { joined } = tree({
      qdroDecision: { assets: { t3: dbTier3 } },
      pensionValuation: { assets: { t3: { results: tier3CovertureResults } } },
    });
    const headlineMatch = joined.match(/PVA computation: Tier 3 \(coverture\) PV \$([\d,]+) \(range \$([\d,]+)–\$([\d,]+)\), formulaId `pva_db_tier3_coverture_v1` — see PVA report for methodology\./);
    expect(headlineMatch).not.toBeNull();
    const maritalMatch = joined.match(/PVA marital portion: \$([\d,]+) \(range \$([\d,]+)–\$([\d,]+)\)/);
    expect(maritalMatch).not.toBeNull();
    expect(headlineMatch[1]).not.toBe(maritalMatch[1]);
    // Compare against formatUSD(...) — the embed uses it, so does the test.
    expect(`$${headlineMatch[1]}`).toBe(formatUSD(tier3CovertureResults.pv.total.best));
    expect(`$${maritalMatch[1]}`).toBe(formatUSD(tier3CovertureResults.pv.marital.best));
  });

  it('falls back to "PV: not computed" when private_db has no usable results in the pensionValuation slice', () => {
    const { joined } = tree({ qdroDecision: { assets: { p: privateDb } } });
    expect(joined).toContain('PV: not computed (run the Pension Valuation Analyzer — §8.6.3)');
    expect(joined).not.toMatch(/PVA computation:/);
    expect(joined).not.toMatch(/PVA marital portion/);
    expect(joined).not.toMatch(/PVA computed:/);
  });

  it('emits no PVA embed and no fallback for dc/ira assets even when same-key results are provided', () => {
    // Same-key pairing: tier2Results sit at the `d` slot but the asset there is DC.
    const { joined } = tree({
      qdroDecision: { assets: { d: dc, i: ira } },
      pensionValuation: { assets: { d: { results: tier2Results }, i: { results: tier2Results } } },
    });
    expect(joined).not.toMatch(/PVA computation:/);
    expect(joined).not.toMatch(/PVA marital portion/);
    expect(joined).not.toMatch(/Tier2 Pension[\s\S]*?PV: not computed/);
  });

  it('guards the Citations line when metadata.citations is empty or absent (no crash, no Citations line)', () => {
    const resultsEmptyCites = { ...tier2Results, metadata: { ...tier2Results.metadata, citations: [] } };
    const { joined: a } = tree({
      qdroDecision: { assets: { t2: dbTier2 } },
      pensionValuation: { assets: { t2: { results: resultsEmptyCites } } },
    });
    expect(a).not.toMatch(/^Citations:/m);
    expect(a).toMatch(/PVA computation: Tier 2 PV/);
    const resultsNoMeta = { ...tier2Results, metadata: undefined };
    const { joined: b } = tree({
      qdroDecision: { assets: { t2: dbTier2 } },
      pensionValuation: { assets: { t2: { results: resultsNoMeta } } },
    });
    expect(b).not.toMatch(/^Citations:/m);
    expect(b).not.toMatch(/^PVA computed:/m);
    expect(b).toMatch(/PVA computation: Tier 2 PV/);
  });

  it('threads results from the composer: state with both qdroDecision.assets and pensionValuation.assets embeds in private_db only', () => {
    const { joined, text } = tree({
      qdroDecision: { assets: { d: dc, t2: dbTier2, t3: dbTier3 } },
      pensionValuation: { assets: { t2: { results: tier2Results }, t3: { results: tier3CovertureResults } } },
    });
    expect(joined).toMatch(/PVA computation: Tier 2 PV/);
    expect(joined).toMatch(/PVA computation: Tier 3 \(coverture\)/);
    expect(joined).toMatch(/PVA marital portion/);
    // DC section: between its plan name and the next h3, no PVA copy:
    const dcIdx = text.findIndex((t) => t.includes('MegaCorp 401(k)'));
    const nextH3Idx = text.findIndex((t, i) => i > dcIdx && t.startsWith('Tier'));
    const dcSlice = text.slice(dcIdx, nextH3Idx).join('\n');
    expect(dcSlice).not.toMatch(/PVA computation:/);
    expect(dcSlice).not.toMatch(/PV: not computed/);
  });

  it('falls back gracefully to the raw formulaId for an unmapped value (no "undefined" in attorney output)', () => {
    const resultsUnknownFormula = { ...tier2Results, formulaId: 'pva_future_formula_v9' };
    const { joined } = tree({
      qdroDecision: { assets: { t2: dbTier2 } },
      pensionValuation: { assets: { t2: { results: resultsUnknownFormula } } },
    });
    expect(joined).not.toMatch(/undefined/);
    expect(joined).toMatch(/PVA computation: pva_future_formula_v9 PV/);
  });

  it('summary-header "N missing" count equals the number of per-asset sections rendering "PV: not computed"', () => {
    const { joined } = tree({
      qdroDecision: { assets: { t2: dbTier2, p: privateDb } },
      pensionValuation: { assets: { t2: { results: tier2Results } } },
    });
    expect(joined).toContain('PV not yet computed for 1 private DB asset(s).');
    const fallbackCount = (joined.match(/PV: not computed \(run the Pension Valuation Analyzer/g) || []).length;
    expect(fallbackCount).toBe(1);
  });
});
