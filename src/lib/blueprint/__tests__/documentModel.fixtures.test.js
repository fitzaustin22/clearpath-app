/**
 * Phase 1 gate tests: document model populated for all five golden fixtures
 * via the seeding orchestrator (replay contract), per-fixture model
 * assertions, F1 trap encodings, and the A1 runner's data-driven pin gating.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import F1 from '../../../test/fixtures/v2-golden/F1.json';
import F2 from '../../../test/fixtures/v2-golden/F2.json';
import F3 from '../../../test/fixtures/v2-golden/F3.json';
import F4 from '../../../test/fixtures/v2-golden/F4.json';
import F4b from '../../../test/fixtures/v2-golden/F4b.json';
import { seedFixtureStores, buildToolInputs } from '../../../test/fixtures/v2-golden/seedFixtureStores.js';
import { runA1, PIN_LITERAL, CATEGORICAL_RECOMPUTERS } from '../../../test/fixtures/v2-golden/a1Runner.js';
import { buildDocumentModel, SECTION_ORDER, VALUE_CLASSES } from '../documentModel.js';
import { KNOWN_ENGINE_TAX_YEAR } from '../metadataNormalizer.js';
import { hasKey, getEntry, SYNTHESIS_MAP } from '../citationRegistry.js';

const FIXTURES = { F1, F2, F3, F4, F4b };
const MODELS = {};
const SEEDED_STATES = {};

function assertBlockContract(b) {
  expect(typeof b.id).toBe('string');
  expect(VALUE_CLASSES).toContain(b.valueClass);
  if (b.valueClass !== 'text') {
    expect(typeof b.value, b.id).toBe('number');
    expect(Number.isFinite(b.value), b.id).toBe(true);
  }
  expect(Array.isArray(b.lineage.inputs)).toBe(true);
  expect(b.lineage.inputs.length, b.id).toBeGreaterThan(0);
  expect(Array.isArray(b.citations)).toBe(true);
  for (const k of b.citations) expect(hasKey(k), `non-registry key on ${b.id}: ${k}`).toBe(true);
  expect(Array.isArray(b.meta?.flags)).toBe(true);
}

function allBlocks(model) {
  return [
    ...model.sections.flatMap((s) => s.blocks),
    ...model.carriers.deferredCompStubs,
    ...model.carriers.qdroBlueprint,
    ...model.carriers.costBasisEntries,
  ];
}

beforeAll(() => {
  // Seeding is sequential and resets all stores per fixture; models are built
  // once and asserted against repeatedly below.
  for (const [id, fixture] of Object.entries(FIXTURES)) {
    const state = seedFixtureStores(fixture);
    SEEDED_STATES[id] = {
      sections: JSON.parse(JSON.stringify(state.sections)),
      deferredCompStubs: JSON.parse(JSON.stringify(state.deferredCompStubs)),
      qdroBlueprint: JSON.parse(JSON.stringify(state.qdroBlueprint)),
      costBasisEntries: JSON.parse(JSON.stringify(state.costBasisEntries)),
    };
    MODELS[id] = buildDocumentModel(SEEDED_STATES[id], {
      jurisdiction: fixture.clientState,
      toolInputs: buildToolInputs(fixture),
    });
  }
});

describe('document model populated per fixture (Phase 1 gate)', () => {
  it.each(['F1', 'F2', 'F3', 'F4', 'F4b'])('%s builds a structurally valid model', (id) => {
    const model = MODELS[id];
    expect(model.jurisdiction).toBe(FIXTURES[id].clientState);
    expect(model.sections.map((s) => s.id)).toEqual([...SECTION_ORDER]);
    for (const b of allBlocks(model)) assertBlockContract(b);
    expect(model.appendices.methodology.roundingContractDisclosure.slot).toBe('d_v2_5_rounding_contract');
    expect(model.appendices.provenance.methodologyAttribution.text).toMatch(/ClearPath/);
  });

  it('F1 populates ALL twelve sections (incl. s8, now that the §8 writer landed) plus all three carriers', () => {
    const model = MODELS.F1;
    // The §8 Support Analysis writer (V2 Phase 2) closes the v1 gap: F1 now
    // omits NOTHING.
    expect(model.scopeDisclosure.omittedSections).toEqual([]);
    for (const s of model.sections) {
      expect(s.included, s.id).toBe(true);
      expect(s.blocks.length, s.id).toBeGreaterThan(0);
    }
    expect(model.carriers.deferredCompStubs.length).toBeGreaterThan(0);
    expect(model.carriers.costBasisEntries.length).toBeGreaterThan(0);
    expect(model.carriers.qdroBlueprint.length).toBeGreaterThan(0);
  });

  it('F1 §8 renders the support blocks with verified DMV citations resolved to registry keys', () => {
    const s8 = MODELS.F1.sections.find((s) => s.id === 's8');
    expect(s8.included).toBe(true);
    const total = s8.blocks.find((b) => b.id === 's8.totalMonthlySupport');
    expect(total, 's8.totalMonthlySupport block').toBeTruthy();
    // MD support persists §11-106 / §12-204 / Boemio / Voishan — all verified.
    expect(total.citations).toEqual(
      expect.arrayContaining(['md_fl_11_106', 'md_fl_12_201_202_204', 'boemio_2010', 'voishan_1992']),
    );
    // F1 has a spousal figure (AAML cap binds at 5922).
    expect(s8.blocks.some((b) => b.id === 's8.spousalSupport.monthly')).toBe(true);
  });

  it('F2 scope disclosure lists exactly the predicate-omitted sections', () => {
    expect(MODELS.F2.scopeDisclosure.omittedSections).toEqual(['s4', 's6', 's8', 's9', 's10', 's11', 's12']);
  });

  it('F3 scope disclosure lists exactly the predicate-omitted sections', () => {
    // §8 now present (F3 carries DC support estimator inputs → the §8 writer
    // populates it); s8 drops out of the omitted set.
    expect(MODELS.F3.scopeDisclosure.omittedSections).toEqual(['s4', 's10', 's11', 's12']);
  });

  it('F4b scope disclosure lists exactly the predicate-omitted sections', () => {
    expect(MODELS.F4b.scopeDisclosure.omittedSections).toEqual(['s2', 's4', 's6', 's7', 's8', 's9', 's10', 's11', 's12']);
  });

  it('F4 (below the export floor) still builds — the model builder is floor-agnostic', () => {
    const model = MODELS.F4;
    expect(model.sections.find((s) => s.id === 's1').included).toBe(true);
    expect(model.scopeDisclosure.omittedSections).toHaveLength(11);
  });

  it('every SYNTHESIS_MAP application carries its synthesis flags', () => {
    const model = MODELS.F1;
    const findMeta = (sectionId, blockIdPrefix) => {
      const section = model.sections.find((s) => s.id === sectionId);
      return section.blocks.find((b) => b.id.startsWith(blockIdPrefix))?.meta;
    };
    const fso = findMeta('s4', 's4.');
    expect(fso.citations).toEqual(SYNTHESIS_MAP.fso);
    expect(fso.flags).toContain('citation_synthesized_from_registry');
    const pit = findMeta('s6', 's6.pit.');
    expect(pit.citations).toEqual(SYNTHESIS_MAP.pit);
    expect(pit.flags).toContain('citation_synthesized_from_registry');
    const s2 = findMeta('s2', 's2.');
    expect(s2.citations).toEqual(SYNTHESIS_MAP.payStubDecoder);
    const tav = MODELS.F1.carriers.costBasisEntries[0].meta;
    expect(tav.citations).toEqual(SYNTHESIS_MAP.taxAdjustedAssetView);
    const qdroBlock = model.sections
      .find((s) => s.id === 's6')
      .blocks.find((b) => b.id.includes('.qdro.'));
    expect(qdroBlock.meta.flags).toContain('synthesis_deliberately_empty');
    expect(qdroBlock.citations).toEqual([]);
  });
});

describe('F1 trap encodings', () => {
  it('taxYear store-vs-engine — DATA-DRIVEN: asserts whichever documented state the store produces', () => {
    const persistedYear = SEEDED_STATES.F1.sections.s4.data.taxYear;
    const s4meta = MODELS.F1.sections.find((s) => s.id === 's4').blocks[0].meta;
    if (Number(persistedYear) !== KNOWN_ENGINE_TAX_YEAR) {
      // Pre-fix state (blueprintStore.js:238 hardcodes 2024): the normalizer
      // must SURFACE the discrepancy — silent fixing is itself a failure.
      expect(s4meta.flags).toContain('store_engine_year_mismatch');
    } else {
      // Post-defect-PR state: agreement, no flag.
      expect(s4meta.flags).not.toContain('store_engine_year_mismatch');
    }
  });

  it('PVA formulaId lineage is restored on F1 (v1 drops it at the blueprint boundary)', () => {
    const s6 = MODELS.F1.sections.find((s) => s.id === 's6');
    const pv = s6.blocks.find((b) => b.id === 's6.pva.headlinePV');
    expect(pv).toBeTruthy();
    expect(pv.lineage.formulaId).toBe('pva_db_tier3_coverture_v1');
    expect(pv.meta.flags).toContain('formula_id_restored_from_engine_knowledge');
  });

  it('F1 seeded state reflects the real store writers (tier-3 PVA path, resolved stubs, QDRO carrier)', () => {
    expect(SEEDED_STATES.F1.sections.s6.data.pva.path).toBe('tier_3');
    const stubs = SEEDED_STATES.F1.deferredCompStubs;
    expect(stubs.every((s) => s.resolved === true)).toBe(true);
    expect(stubs[0].metadata.maritalShares.hug).toBeGreaterThan(0);
    expect(SEEDED_STATES.F1.qdroBlueprint.savedProjection).toBeTruthy();
  });
});

describe('A1 runner — data-driven pin gating (both directions)', () => {
  it.each(['F1', 'F2', 'F3', 'F4', 'F4b'])('%s gates on its ACTUAL slot state across both lanes', (id) => {
    const fixture = FIXTURES[id];
    // Pending slots in EITHER lane block A1 — numeric pins first, then
    // categorical assertions, mirroring the runner's merge order.
    const expectedUnpinned = [
      ...Object.entries(fixture.auditPins || {}),
      ...Object.entries(fixture.auditAssertions || {}),
    ]
      .filter(([, v]) => v === PIN_LITERAL)
      .map(([slot]) => slot);
    const outcome = runA1(fixture);
    if (expectedUnpinned.length > 0) {
      expect(outcome.status).toBe('refused');
      expect(outcome.unpinnedSlots).toEqual(expectedUnpinned);
      expect(outcome.reason).toContain(expectedUnpinned[0]);
    } else {
      expect(outcome.status).toBe('executed');
    }
  });

  it('a fully-pinned fixture executes the recompute path; footing and categorical both match (Phase 2)', () => {
    const pinned = JSON.parse(JSON.stringify(F4b));
    // Hand-footing of F4b's fixture inputs: 12,000 (checking, asset) + 900 (TV,
    // personal property); the 6,800 credit card is a liability and excluded.
    // Phase 2 registers both lanes: readiness classify on F4b's ten answers
    // (× 2 = 20 → ≤ 20 → 'preparing') recomputes the categorical too.
    pinned.auditPins = { s3InventoryTotalsFooting: 12900 };
    pinned.auditAssertions = { readinessTierBoundaryValue: 'preparing' };
    const outcome = runA1(pinned);
    expect(outcome.status).toBe('executed');
    expect(outcome.results).toEqual([
      { slot: 's3InventoryTotalsFooting', status: 'match', recomputed: 12900, pinnedValue: 12900 },
      { slot: 'readinessTierBoundaryValue', status: 'match', recomputed: 'preparing', pinnedValue: 'preparing' },
    ]);
  });

  it('a wrong pin is reported as a mismatch, never silently accepted', () => {
    const pinned = JSON.parse(JSON.stringify(F4b));
    pinned.auditPins = { s3InventoryTotalsFooting: 99999 };
    pinned.auditAssertions = {};
    const outcome = runA1(pinned);
    expect(outcome.status).toBe('executed');
    expect(outcome.results[0].status).toBe('mismatch');
  });

  it('a pinned slot with no registered recomputer still reports as named work, never silent', () => {
    // All real fixture slots now have recomputers; this exercises the runner's
    // defensive path for a slot name outside both registries.
    const pinned = JSON.parse(JSON.stringify(F4b));
    pinned.auditPins = { __no_such_recomputer__: 12345 };
    pinned.auditAssertions = {};
    const outcome = runA1(pinned);
    expect(outcome.status).toBe('executed');
    expect(outcome.results[0].status).toBe('recompute_not_implemented_phase2');
  });

  it('a pending categorical slot blocks A1 exactly like a pending numeric pin', () => {
    const pinned = JSON.parse(JSON.stringify(F4b));
    pinned.auditPins = { s3InventoryTotalsFooting: 12900 };
    pinned.auditAssertions = { readinessTierBoundaryValue: PIN_LITERAL };
    const outcome = runA1(pinned);
    expect(outcome.status).toBe('refused');
    expect(outcome.unpinnedSlots).toEqual(['readinessTierBoundaryValue']);
    expect(outcome.reason).toContain('readinessTierBoundaryValue');
  });

  it('a pinned categorical slot compares strict === against its registered recomputer', () => {
    const pinned = JSON.parse(JSON.stringify(F4b));
    pinned.auditPins = { s3InventoryTotalsFooting: 12900 };
    pinned.auditAssertions = { __synthetic_categorical__: 'synthetic_tier' };
    // Use a synthetic slot so we never overwrite/delete the now-PERMANENT
    // readinessTierBoundaryValue registration (Phase 2). Removed in finally.
    CATEGORICAL_RECOMPUTERS.__synthetic_categorical__ = () => 'synthetic_tier';
    try {
      const match = runA1(pinned).results.find((r) => r.slot === '__synthetic_categorical__');
      expect(match).toEqual({
        slot: '__synthetic_categorical__',
        status: 'match',
        recomputed: 'synthetic_tier',
        pinnedValue: 'synthetic_tier',
      });
      CATEGORICAL_RECOMPUTERS.__synthetic_categorical__ = () => 'a_different_tier';
      const mismatch = runA1(pinned).results.find((r) => r.slot === '__synthetic_categorical__');
      expect(mismatch.status).toBe('mismatch');
    } finally {
      delete CATEGORICAL_RECOMPUTERS.__synthetic_categorical__;
    }
  });
});

describe('document model — finalized appendices + document ID (Phase 2)', () => {
  const citedKeysOf = (model) => {
    const set = new Set();
    for (const s of model.sections) for (const b of s.blocks) for (const k of b.citations) set.add(k);
    for (const carrier of Object.values(model.carriers)) for (const b of carrier) for (const k of b.citations) set.add(k);
    return set;
  };

  it('Appendix A renders EXCLUSIVELY from registry keys cited in the model (closed set, complete coverage)', () => {
    const model = MODELS.F1;
    const entries = model.appendices.methodology.entries;
    expect(entries.length).toBeGreaterThan(0);
    const cited = citedKeysOf(model);
    for (const e of entries) {
      expect(hasKey(e.key), e.key).toBe(true); // closed set
      expect(cited.has(e.key), `${e.key} listed in Appendix A but not cited in the model`).toBe(true);
      const reg = getEntry(e.key);
      expect(e.fullCite).toBe(reg.fullCite);
      expect(e.shortCite).toBe(reg.shortCite);
      expect(e.verified).toBe(reg.verified); // verified flag drives renderer treatment
    }
    const entryKeys = new Set(entries.map((e) => e.key));
    for (const k of cited) expect(entryKeys.has(k), `${k} cited but missing from Appendix A`).toBe(true);
  });

  it('F1 Appendix A exercises BOTH verified and unverified ("under review") entries', () => {
    const entries = MODELS.F1.appendices.methodology.entries;
    const verified = entries.filter((e) => e.verified).map((e) => e.key);
    const unverified = entries.filter((e) => !e.verified).map((e) => e.key);
    expect(verified).toEqual(expect.arrayContaining(['md_fl_11_106', 'boemio_2010', 'rev_proc_2025_32']));
    expect(unverified).toEqual(expect.arrayContaining(['deering_md_1981', 'sutherland_pit', 'hug_1984']));
  });

  it('rounding-contract + provenance disclosures are finalized (slot/attribution preserved, status off placeholder)', () => {
    const a = MODELS.F1.appendices;
    expect(a.methodology.roundingContractDisclosure.slot).toBe('d_v2_5_rounding_contract');
    expect(a.methodology.roundingContractDisclosure.status).not.toBe('placeholder_phase2');
    expect(a.methodology.roundingContractDisclosure.summary).toMatch(/cent/);
    expect(a.provenance.methodologyAttribution.text).toBe(
      'Methodologies developed by ClearPath, founded by Austin Fitzpatrick, CDFA®',
    );
    expect(a.provenance.methodologyAttribution.status).not.toBe('placeholder_phase2');
  });

  it('stamps a deterministic CP-BP-YYYY-NNNN document ID (year from preparedDate, hash from content)', () => {
    for (const id of ['F1', 'F2', 'F3', 'F4b']) {
      expect(MODELS[id].documentId, id).toMatch(/^CP-BP-\d{4}-\d{4}$/);
    }
    const a = buildDocumentModel(SEEDED_STATES.F1, { jurisdiction: 'MD', preparedDate: '2026-06-01' });
    const b = buildDocumentModel(SEEDED_STATES.F1, { jurisdiction: 'MD', preparedDate: '2026-06-01' });
    expect(a.documentId).toBe(b.documentId); // deterministic
    expect(a.documentId).toMatch(/^CP-BP-2026-\d{4}$/);
    // Different fixtures hash to different IDs (content-sensitive).
    expect(MODELS.F1.documentId).not.toBe(MODELS.F3.documentId);
  });

  it('F1 cost-basis primary residence adds §121(d)(3) spousal-tacking at the block level (meta unchanged)', () => {
    const primaryBlocks = MODELS.F1.carriers.costBasisEntries.filter((b) =>
      b.id.includes('realEstate-f1home'),
    );
    expect(primaryBlocks.length).toBeGreaterThan(0);
    for (const b of primaryBlocks) {
      expect(b.citations).toEqual(
        expect.arrayContaining(['ltcg_15_simplification', 'irc_121', 'irc_1041', 'irc_121_d_3']),
      );
      // The normalized meta / SYNTHESIS_MAP.taxAdjustedAssetView contract stays put.
      expect(b.meta.citations).toEqual(['ltcg_15_simplification', 'irc_121', 'irc_1041']);
    }
    // A non-primary-residence cost-basis entry does NOT get the tacking cite.
    const brokerageBlocks = MODELS.F1.carriers.costBasisEntries.filter((b) =>
      b.id.includes('workingCapital-f1brok'),
    );
    for (const b of brokerageBlocks) expect(b.citations).not.toContain('irc_121_d_3');
  });
});
