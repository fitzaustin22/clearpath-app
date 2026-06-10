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
import { seedFixtureStores } from '../../../test/fixtures/v2-golden/seedFixtureStores.js';
import { runA1, PIN_LITERAL } from '../../../test/fixtures/v2-golden/a1Runner.js';
import { buildDocumentModel, SECTION_ORDER, VALUE_CLASSES } from '../documentModel.js';
import { KNOWN_ENGINE_TAX_YEAR } from '../metadataNormalizer.js';
import { hasKey, SYNTHESIS_MAP } from '../citationRegistry.js';

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
    MODELS[id] = buildDocumentModel(SEEDED_STATES[id], { jurisdiction: fixture.clientState });
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

  it('F1 populates every section except the writerless s8, plus all three carriers', () => {
    const model = MODELS.F1;
    expect(model.scopeDisclosure.omittedSections).toEqual(['s8']);
    for (const s of model.sections) {
      if (s.id === 's8') continue;
      expect(s.included, s.id).toBe(true);
      expect(s.blocks.length, s.id).toBeGreaterThan(0);
    }
    expect(model.carriers.deferredCompStubs.length).toBeGreaterThan(0);
    expect(model.carriers.costBasisEntries.length).toBeGreaterThan(0);
    expect(model.carriers.qdroBlueprint.length).toBeGreaterThan(0);
  });

  it('F2 scope disclosure lists exactly the predicate-omitted sections', () => {
    expect(MODELS.F2.scopeDisclosure.omittedSections).toEqual(['s4', 's6', 's8', 's9', 's10', 's11', 's12']);
  });

  it('F3 scope disclosure lists exactly the predicate-omitted sections', () => {
    expect(MODELS.F3.scopeDisclosure.omittedSections).toEqual(['s4', 's8', 's10', 's11', 's12']);
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
  it.each(['F1', 'F2', 'F3', 'F4', 'F4b'])('%s gates on its ACTUAL slot state', (id) => {
    const fixture = FIXTURES[id];
    const expectedUnpinned = Object.entries(fixture.auditPins || {})
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

  it('a fully-pinned fixture executes the recompute path and matches the real footing', () => {
    const pinned = JSON.parse(JSON.stringify(F4b));
    // Hand-footing of F4b's fixture inputs: 12,000 (checking, asset) + 900 (TV,
    // personal property); the 6,800 credit card is a liability and excluded.
    pinned.auditPins = { s3InventoryTotalsFooting: 12900 };
    const outcome = runA1(pinned);
    expect(outcome.status).toBe('executed');
    expect(outcome.results).toEqual([
      { slot: 's3InventoryTotalsFooting', status: 'match', recomputed: 12900, pinnedValue: 12900 },
    ]);
  });

  it('a wrong pin is reported as a mismatch, never silently accepted', () => {
    const pinned = JSON.parse(JSON.stringify(F4b));
    pinned.auditPins = { s3InventoryTotalsFooting: 99999 };
    const outcome = runA1(pinned);
    expect(outcome.status).toBe('executed');
    expect(outcome.results[0].status).toBe('mismatch');
  });

  it('pinned slots without a registered recomputer report as named Phase 2 work', () => {
    const pinned = JSON.parse(JSON.stringify(F4b));
    pinned.auditPins = { readinessTierBoundaryValue: 20 };
    const outcome = runA1(pinned);
    expect(outcome.status).toBe('executed');
    expect(outcome.results[0].status).toBe('recompute_not_implemented_phase2');
  });
});
