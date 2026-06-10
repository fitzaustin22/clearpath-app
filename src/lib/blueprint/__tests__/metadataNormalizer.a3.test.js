/**
 * A3 — Normalizer Correctness (Acceptance Spec §4-A3): one fixture per known
 * drift case (6) plus the unknown-future-shape degradation fixture (7th).
 * Canonical contract: { formulaId, citations(registry keys), source, flags }
 * + quarantinedCitations for unresolvable raw strings.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  KNOWN_ENGINE_TAX_YEAR,
  PVA_PATH_FORMULA_ID,
  normalizeMetadataObject,
  normalizePvaSection,
  normalizeQdroAssetMetadata,
  normalizeDcaStubMetadata,
  normalizePitSection,
  normalizeFsoSection,
  normalizeHdaMetadata,
} from '../metadataNormalizer.js';
import { hasKey } from '../citationRegistry.js';

const DCA_CITATION =
  'In re Marriage of Hug (1984) 154 Cal.App.3d 780; In re Marriage of Nelson (1986) 177 Cal.App.3d 150';

function expectCanonical(m) {
  expect(m).toHaveProperty('formulaId');
  expect(Array.isArray(m.citations)).toBe(true);
  for (const k of m.citations) expect(hasKey(k), `non-registry citation key: ${k}`).toBe(true);
  expect(typeof m.source.tool).toBe('string');
  expect(typeof m.source.storeKey).toBe('string');
  expect(Array.isArray(m.flags)).toBe(true);
}

describe('A3 drift case 1 — three wrapper conventions normalize to one contract', () => {
  it('nested metadata{} (HDA/DCA family), flat-keys (PVA/PIT family), and none (M1 family) all yield the canonical shape', () => {
    const nested = normalizeDcaStubMetadata({ formula: 'both', citation: DCA_CITATION });
    const flat = normalizePvaSection({ path: 'tier_1', citations: ['IRC §417(e)(3)'] });
    const none = normalizeMetadataObject(null, { tool: 'readinessAssessment', storeKey: 'clearpath-blueprint:s1' });
    for (const m of [nested, flat, none]) expectCanonical(m);
    expect(none.flags).toContain('no_persisted_metadata');
  });
});

describe('A3 drift case 2 — formula vs formulaId key', () => {
  it("normalizes DCA's `formula` key to `formulaId` and flags the rename", () => {
    const m = normalizeDcaStubMetadata({ formula: 'both', citation: DCA_CITATION });
    expectCanonical(m);
    expect(m.formulaId).toBe('both');
    expect(m.flags).toContain('formula_key_normalized');
  });
});

describe('A3 drift case 3 — citation string vs citations array', () => {
  it('normalizes a single citation STRING to a resolved keys array (1 string → 2 keys here)', () => {
    const m = normalizeDcaStubMetadata({ formula: 'both', citation: DCA_CITATION });
    expect(m.citations).toEqual(['hug_1984', 'nelson_1986']);
    expect(m.flags).toContain('citation_string_normalized');
    expect(m.quarantinedCitations).toBeUndefined();
  });

  it('normalizes a citations ARRAY of free-text strings to registry keys', () => {
    const m = normalizePvaSection({
      path: 'cash_balance',
      citations: [
        'IRS Notice 96-8',
        'Pension Protection Act of 2006 §1107 (lump-sum-equals-balance safe harbor)',
        'Cooper v. IBM Personal Pension Plan, 457 F.3d 636 (7th Cir. 2006)',
      ],
    });
    expect(m.citations).toEqual(['irs_notice_96_8', 'ppa_2006_1107', 'cooper_v_ibm_2006']);
  });

  it('quarantines unresolvable strings — preserved, flagged, never dropped or rendered', () => {
    const m = normalizePvaSection({ path: 'tier_1', citations: ['IRC §417(e)(3)', 'Mystery Cite 1'] });
    expect(m.citations).toEqual(['irc_417e3']);
    expect(m.flags).toContain('unresolved_citation_string');
    expect(m.quarantinedCitations).toEqual(['Mystery Cite 1']);
  });
});

describe('A3 drift case 4 — PVA drops everything but citations', () => {
  it("restores tier_3 formulaId 'pva_db_tier3_coverture_v1' from engine knowledge (the F1 lineage)", () => {
    const m = normalizePvaSection({
      path: 'tier_3',
      headlinePV: 412000,
      maritalPV: 380000,
      coverturePercent: 0.7917,
      citations: [
        'Bender v. Bender, 297 A.2d 786 (DC 1972)',
        'Mosley v. Mosley, 19 Va. App. 192, 450 S.E.2d 161 (1994)',
        'Deering v. Deering, 292 Md. 115, 437 A.2d 883 (1981)',
      ],
    });
    expect(m.formulaId).toBe('pva_db_tier3_coverture_v1');
    expect(m.flags).toContain('formula_id_restored_from_engine_knowledge');
    expect(m.citations).toEqual(['bender_dc_1972', 'mosley_va_1994', 'deering_md_1981']);
  });

  it('restores every engine path per the map (flag_only restores null, unflagged)', () => {
    for (const [pvaPath, formulaId] of Object.entries(PVA_PATH_FORMULA_ID)) {
      const m = normalizePvaSection({ path: pvaPath, citations: [] });
      expect(m.formulaId).toBe(formulaId);
      if (formulaId === null) {
        expect(m.flags).not.toContain('formula_id_restored_from_engine_knowledge');
      }
    }
  });
});

describe('A3 drift case 5 — QDRO permanent null-stub', () => {
  it('null-stub metadata synthesizes the DELIBERATELY EMPTY set with its flag', () => {
    const m = normalizeQdroAssetMetadata({ formulaId: null, citations: [], qdroPacketGeneratedAt: null });
    expectCanonical(m);
    expect(m.citations).toEqual([]);
    expect(m.flags).toContain('synthesis_deliberately_empty');
  });

  it('a future POPULATED qdro metadata bypasses synthesis and resolves normally', () => {
    const m = normalizeQdroAssetMetadata({ formulaId: 'qdro_future_v1', citations: ['IRS Notice 96-8'] });
    expect(m.formulaId).toBe('qdro_future_v1');
    expect(m.citations).toEqual(['irs_notice_96_8']);
    expect(m.flags).not.toContain('synthesis_deliberately_empty');
  });
});

describe('A3 drift case 6 — M4 PIT and M4 FSO persist no metadata at all', () => {
  it('PIT synthesizes sutherland_pit with both synthesis flags', () => {
    const m = normalizePitSection({ planBalance: 410000, n: 19.5 });
    expect(m.citations).toEqual(['sutherland_pit']);
    expect(m.flags).toEqual(
      expect.arrayContaining(['citation_synthesized_from_registry', 'no_persisted_metadata'])
    );
  });

  it('FSO synthesizes the pinned triple and raises the store/engine year-mismatch flag DATA-DRIVEN', () => {
    // Mismatch state (the blueprintStore.js:238 hardcode as of this build):
    const mismatched = normalizeFsoSection({ taxYear: 2024, bestOption: 'single' });
    expect(mismatched.citations).toEqual(['irc_7703', 'rev_proc_2025_32', 'irc_24_ctc_2026']);
    expect(mismatched.flags).toContain('store_engine_year_mismatch');
    // Agreement state (the documented post-defect-PR state):
    const agreed = normalizeFsoSection({ taxYear: KNOWN_ENGINE_TAX_YEAR, bestOption: 'single' });
    expect(agreed.flags).not.toContain('store_engine_year_mismatch');
    expect(agreed.flags).toContain('citation_synthesized_from_registry');
  });

  it('HDA metadata (assumptions, no citations) synthesizes hpa_pmi_cancellation', () => {
    const m = normalizeHdaMetadata({ verdictTier: 'green', pmiRatePercent: 0.005 });
    expect(m.citations).toEqual(['hpa_pmi_cancellation']);
  });
});

describe('A3 case 7 — unknown future shape degrades honestly', () => {
  it('flags unknown_metadata_shape with empty citations — no invention, no crash', () => {
    const weird = { schemaVersion: 9, blob: { nested: ['??'] } };
    const m = normalizeMetadataObject(weird, { tool: 'futureTool', storeKey: 'clearpath-blueprint:s99' });
    expectCanonical(m);
    expect(m.citations).toEqual([]);
    expect(m.flags).toContain('unknown_metadata_shape');
  });

  it('non-object garbage degrades the same way', () => {
    for (const garbage of [42, 'metadata', [1, 2], true]) {
      const m = normalizeMetadataObject(garbage, { tool: 't', storeKey: 'k' });
      expect(m.flags).toContain('unknown_metadata_shape');
      expect(m.citations).toEqual([]);
    }
  });

  it('a PVA payload with an unknown path degrades without inventing a formulaId', () => {
    const m = normalizePvaSection({ path: 'tier_99_future', citations: [] });
    expect(m.formulaId).toBeNull();
    expect(m.flags).toContain('unknown_metadata_shape');
  });
});

describe('engine-year mirror tripwire', () => {
  it('KNOWN_ENGINE_TAX_YEAR matches the actual TAX_YEAR constant in the FSO source', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../../components/m4/FilingStatusOptimizer.jsx'),
      'utf8'
    );
    const match = src.match(/const TAX_YEAR = (\d{4});/);
    expect(match, 'TAX_YEAR constant not found in FilingStatusOptimizer.jsx').not.toBeNull();
    expect(Number(match[1])).toBe(KNOWN_ENGINE_TAX_YEAR);
  });
});
