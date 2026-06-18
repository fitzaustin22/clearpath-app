/**
 * Document model (R1) — unit contract tests on synthetic store snapshots.
 * Fixture-seeded end-to-end model tests live in documentModel.fixtures.test.js.
 */
import { describe, it, expect } from 'vitest';
import { buildDocumentModel, SECTION_ORDER, VALUE_CLASSES } from '../documentModel.js';
import { hasKey } from '../citationRegistry.js';
import { isSectionIncluded, isEmptyStatus } from '../../../components/blueprint/sectionInclusion.js';

const emptySection = (label) => ({ status: 'empty', label, sourceModule: null, data: null });

function emptyState() {
  const sections = {};
  for (const key of SECTION_ORDER) sections[key] = emptySection(key);
  return { sections, deferredCompStubs: [], qdroBlueprint: { savedProjection: null }, costBasisEntries: [] };
}

export function assertBlockContract(b) {
  expect(typeof b.id).toBe('string');
  expect(VALUE_CLASSES).toContain(b.valueClass);
  if (b.valueClass !== 'text') {
    expect(typeof b.value).toBe('number');
    expect(Number.isFinite(b.value)).toBe(true);
  }
  expect(Array.isArray(b.lineage.inputs)).toBe(true);
  expect(b.lineage.inputs.length).toBeGreaterThan(0);
  expect(b.lineage).toHaveProperty('formulaId');
  expect(Array.isArray(b.citations)).toBe(true);
  for (const k of b.citations) expect(hasKey(k), `non-registry key on ${b.id}: ${k}`).toBe(true);
  expect(b.meta).toBeTruthy();
  expect(Array.isArray(b.meta.flags)).toBe(true);
}

describe('buildDocumentModel — contract', () => {
  it('requires an explicit jurisdiction (D-V2-8 deferral)', () => {
    expect(() => buildDocumentModel(emptyState(), {})).toThrow(/jurisdiction/);
    expect(() => buildDocumentModel(emptyState())).toThrow(/jurisdiction/);
  });

  it('all-empty state: 12 sections, none included, full scope disclosure, structured appendices', () => {
    const model = buildDocumentModel(emptyState(), { jurisdiction: 'MD' });
    expect(model.jurisdiction).toBe('MD');
    expect(model.sections.map((s) => s.id)).toEqual([...SECTION_ORDER]);
    expect(model.sections.every((s) => s.included === false && s.blocks.length === 0)).toBe(true);
    expect(model.scopeDisclosure.omittedSections).toEqual([...SECTION_ORDER]);
    expect(model.carriers.deferredCompStubs).toEqual([]);
    expect(model.carriers.costBasisEntries).toEqual([]);
    expect(model.appendices.methodology.roundingContractDisclosure.slot).toBe('d_v2_5_rounding_contract');
    expect(model.appendices.provenance.methodologyAttribution.text).toMatch(/Methodologies developed by ClearPath/);
    expect(model.appendices.inputsAndAssumptions.phase2Placeholders.length).toBeGreaterThanOrEqual(11);
    expect(
      model.appendices.inputsAndAssumptions.phase2Placeholders.every(
        (p) => p.status === 'phase2_engine_constant_sweep_pending'
      )
    ).toBe(true);
  });

  it('s4 blocks honor the full block contract and carry the year-mismatch flag when the store says 2024', () => {
    const state = emptyState();
    state.sections.s4 = {
      status: 'complete',
      label: 'Tax Analysis',
      sourceModule: 'm4',
      data: {
        bestOption: 'single',
        maxSavings: 4200,
        scenarios: { single: { netTax: 31000 }, mfs: { netTax: 35200 } },
        divorceTimeline: 'beforeDec31',
        taxYear: 2024,
      },
    };
    const model = buildDocumentModel(state, { jurisdiction: 'MD' });
    const s4 = model.sections.find((s) => s.id === 's4');
    expect(s4.included).toBe(true);
    expect(s4.blocks.length).toBeGreaterThan(0);
    for (const b of s4.blocks) assertBlockContract(b);
    const anyMeta = s4.blocks[0].meta;
    expect(anyMeta.flags).toContain('store_engine_year_mismatch');
    expect(anyMeta.citations).toEqual(['irc_7703', 'rev_proc_2025_32', 'irc_24_ctc_2026']);
    expect(model.scopeDisclosure.omittedSections).not.toContain('s4');
  });

  it('s6 PVA blocks restore the engine formulaId into lineage (drift case 4 at model level)', () => {
    const state = emptyState();
    state.sections.s6 = {
      status: 'complete',
      label: 'Retirement Plan Division',
      sourceModule: 'm5',
      data: {
        pit: null,
        qdro: null,
        pva: {
          path: 'tier_3',
          headlinePV: 412000,
          maritalPV: 380000,
          coverturePercent: 0.7917,
          expectedRetirementAge: 65,
          citations: ['Bender v. Bender, 297 A.2d 786 (DC 1972)'],
        },
      },
    };
    const model = buildDocumentModel(state, { jurisdiction: 'MD' });
    const s6 = model.sections.find((s) => s.id === 's6');
    const pv = s6.blocks.find((b) => b.id === 's6.pva.headlinePV');
    expect(pv.lineage.formulaId).toBe('pva_db_tier3_coverture_v1');
    expect(pv.meta.flags).toContain('formula_id_restored_from_engine_knowledge');
    // #18: the TOTAL present value cites only the §417(e) present-value method;
    // the coverture/jurisdiction authority describes the marital SHARE and moves
    // to the marital-portion PV (asserted below).
    expect(pv.citations).toEqual(['irc_417e3']);
    const marital = s6.blocks.find((b) => b.id === 's6.pva.maritalPV');
    expect(marital.citations).toContain('bender_dc_1972');
    expect(marital.citations).not.toContain('irc_417e3');
    const frac = s6.blocks.find((b) => b.id === 's6.pva.coverturePercent');
    expect(frac.valueClass).toBe('fraction');
    // The coverture fraction also cites the time-rule method.
    expect(frac.citations).toContain('coverture_time_rule');
  });

  it('resolved deferred-comp stubs emit Hug/Nelson numeric blocks with the resolved two-key citation', () => {
    const state = emptyState();
    state.deferredCompStubs = [
      {
        id: 'dcs_x',
        category: 'stockOptions',
        company: 'TestCo',
        sharesGranted: 1000,
        strikePrice: 10,
        resolved: true,
        metadata: {
          formula: 'both',
          hireDate: '2010-01-01',
          grantDate: '2012-01-01',
          separationDate: '2020-01-01',
          perTrancheFractions: [{ id: 't1', hug: 0.8, nelson: 0.6 }],
          maritalShares: { hug: 800, nelson: 600 },
          intrinsicValue: { hug: 8000, nelson: 6000 },
          fmvSource: 'user-entered',
          citation:
            'In re Marriage of Hug (1984) 154 Cal.App.3d 780; In re Marriage of Nelson (1986) 177 Cal.App.3d 150',
        },
      },
    ];
    const model = buildDocumentModel(state, { jurisdiction: 'MD' });
    const blocks = model.carriers.deferredCompStubs;
    for (const b of blocks) assertBlockContract(b);
    const hugVal = blocks.find((b) => b.id === 'carrier.dcs.dcs_x.intrinsicValue.hug');
    expect(hugVal.value).toBe(8000);
    expect(hugVal.citations).toEqual(['hug_1984', 'nelson_1986']);
    const frac = blocks.find((b) => b.id === 'carrier.dcs.dcs_x.tranche.t1.nelson');
    expect(frac.valueClass).toBe('fraction');
    expect(frac.value).toBe(0.6);
  });

  it('cost-basis entries carry the TAV synthesis; a primary residence adds §121(d)(3) at the block level', () => {
    const state = emptyState();
    state.costBasisEntries = [
      { assetId: 'a1', category: 'realEstate', fmv: 500000, costBasis: 300000, builtInGain: 200000, estimatedTax: 0, taxAdjustedValue: 190000, isPrimaryResidence: true },
      { assetId: 'a2', category: 'workingCapital', accountSubType: 'brokerage', fmv: 100000, costBasis: 60000, builtInGain: 40000, estimatedTax: 6000, taxAdjustedValue: 94000, isPrimaryResidence: false },
    ];
    const model = buildDocumentModel(state, { jurisdiction: 'VA' });
    const blocks = model.carriers.costBasisEntries;
    expect(blocks.length).toBeGreaterThan(0);
    for (const b of blocks) {
      assertBlockContract(b);
      // The normalized meta / SYNTHESIS_MAP.taxAdjustedAssetView contract is constant.
      expect(b.meta.citations).toEqual(['ltcg_15_simplification', 'irc_121', 'irc_1041']);
      if (b.id.includes('a1')) {
        // Primary residence: spousal-tacking §121(d)(3) added at the block level.
        expect(b.citations).toEqual(['ltcg_15_simplification', 'irc_121', 'irc_1041', 'irc_121_d_3']);
      } else {
        expect(b.citations).toEqual(['ltcg_15_simplification', 'irc_121', 'irc_1041']);
      }
    }
  });
});

describe('factored inclusion predicate — consumer parity', () => {
  it('matches the v1 status-only rule exactly', () => {
    expect(isEmptyStatus('empty')).toBe(true);
    expect(isEmptyStatus('partial')).toBe(false);
    expect(isEmptyStatus('complete')).toBe(false);
    const sections = {
      s1: { status: 'empty' },
      s2: { status: 'partial' },
      s3: { status: 'complete' },
    };
    expect(isSectionIncluded('s1', sections)).toBe(false);
    expect(isSectionIncluded('s2', sections)).toBe(true);
    expect(isSectionIncluded('s3', sections)).toBe(true);
    expect(isSectionIncluded('s99', sections)).toBe(false);
  });
});
