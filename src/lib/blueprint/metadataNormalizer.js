/**
 * V2 Attorney Blueprint — read-time metadata normalizer (Acceptance Spec §4-A3).
 *
 * PURE, READ-TIME ONLY. Absorbs the six known metadata drift cases (Q4
 * inventory of record, gap-scan §3) plus the unknown-future-shape degradation
 * into ONE canonical per-value shape:
 *
 *   { formulaId: string|null,
 *     citations: string[],            // registry KEYS only, never free text
 *     source: { tool, storeKey },
 *     flags: string[],
 *     quarantinedCitations?: string[] } // raw unresolvable strings, preserved
 *
 * M1–M6 persisted data is NEVER touched — these functions read store snapshots
 * and return new objects. A flagged gap is honest; an invented citation is
 * disqualifying; a crash is unacceptable (spec §4-A3 degradation contract).
 */

import { resolveCitationStrings, synthesizeCitations } from './citationRegistry.js';
import { ENGINE_TAX_YEAR } from '../tax/taxYear.js';

/**
 * Engine tax year, single-sourced from src/lib/tax/taxYear.js (taxYear rider,
 * 2026-06-10) — no longer a hand-kept mirror. The store-vs-engine mismatch
 * flag below stays load-bearing: freshly-written §4 payloads now agree by
 * construction, but PERSISTED legacy states (written while the store
 * hardcoded 2024) still surface the discrepancy at read time, which is
 * exactly the honest-disclosure behavior A3 requires.
 */
export const KNOWN_ENGINE_TAX_YEAR = ENGINE_TAX_YEAR;

/**
 * Engine path → formulaId, mirroring src/lib/pensionValuation per-path ids
 * (tier1And2.js:66, tier3Coverture.js:173, inPayStatus.js:53,
 * cashBalancePassthrough.js:30; flag_only carries null). PVA.jsx:199-206 drops
 * formulaId at the blueprint boundary (drift case 4) — this map restores the
 * lineage at read time.
 */
export const PVA_PATH_FORMULA_ID = Object.freeze({
  tier_1: 'pva_db_tier1_v1',
  tier_2: 'pva_db_tier2_v1',
  tier_3: 'pva_db_tier3_coverture_v1',
  in_pay_status: 'pva_db_inpaystatus_v1',
  cash_balance: 'pva_cashbalance_passthrough_v1',
  flag_only: null,
});

function canonical({ formulaId = null, citations = [], source, flags = [], quarantined = [] }) {
  const out = {
    formulaId,
    citations,
    source: { tool: source.tool, storeKey: source.storeKey },
    flags,
  };
  if (quarantined.length > 0) out.quarantinedCitations = quarantined;
  return out;
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/** No-metadata path: SYNTHESIS_MAP if the source is mapped, honest gap if not. */
function normalizeAbsent(source, synthesisSourceId, extraFlags = []) {
  const synth = synthesisSourceId ? synthesizeCitations(synthesisSourceId) : null;
  if (synth) {
    return canonical({
      citations: synth.keys,
      source,
      flags: [...synth.flags, ...extraFlags],
    });
  }
  return canonical({ citations: [], source, flags: ['no_persisted_metadata', ...extraFlags] });
}

/**
 * Generic shape-driven normalizer for nested `metadata: {…}` objects and
 * canonical-ish shapes. Recognizes:
 *  - `formulaId` (canonical key) or `formula` (drift case 2, DCA)
 *  - `citations` array (drift case 3a) or `citation` string (drift case 3b)
 * Anything else → unknown-future-shape degradation (flagged, quarantined raw
 * keys preserved via JSON snapshot in quarantinedCitations? no — raw strings
 * only; unknown shapes simply flag).
 */
export function normalizeMetadataObject(raw, source) {
  if (raw == null) return normalizeAbsent(source, null);
  if (!isPlainObject(raw)) {
    return canonical({ citations: [], source, flags: ['unknown_metadata_shape'] });
  }

  const hasFormulaId = Object.prototype.hasOwnProperty.call(raw, 'formulaId');
  const hasFormula = Object.prototype.hasOwnProperty.call(raw, 'formula');
  const hasCitations = Array.isArray(raw.citations);
  const hasCitationString = typeof raw.citation === 'string';

  if (!hasFormulaId && !hasFormula && !hasCitations && !hasCitationString) {
    return canonical({ citations: [], source, flags: ['unknown_metadata_shape'] });
  }

  const flags = [];
  const formulaId = hasFormulaId ? (raw.formulaId ?? null) : hasFormula ? (raw.formula ?? null) : null;
  if (!hasFormulaId && hasFormula) flags.push('formula_key_normalized');

  let rawCitations = [];
  if (hasCitations) rawCitations = raw.citations;
  else if (hasCitationString) {
    rawCitations = [raw.citation];
    flags.push('citation_string_normalized');
  }

  const { keys, unresolved } = resolveCitationStrings(rawCitations);
  if (unresolved.length > 0) flags.push('unresolved_citation_string');

  return canonical({ formulaId, citations: keys, source, flags, quarantined: unresolved });
}

/** §6 data.pva — drift case 4 (PVA drops everything but citations; restore formulaId). */
export function normalizePvaSection(pvaData) {
  const source = { tool: 'pensionValuationAnalyzer', storeKey: 'clearpath-blueprint:s6.pva' };
  if (pvaData == null) return normalizeAbsent(source, null);

  const flags = [];
  let formulaId = null;
  if (typeof pvaData.path === 'string') {
    if (Object.prototype.hasOwnProperty.call(PVA_PATH_FORMULA_ID, pvaData.path)) {
      formulaId = PVA_PATH_FORMULA_ID[pvaData.path];
      if (formulaId !== null) flags.push('formula_id_restored_from_engine_knowledge');
    } else {
      flags.push('unknown_metadata_shape');
    }
  } else {
    flags.push('unknown_metadata_shape');
  }

  const { keys, unresolved } = resolveCitationStrings(
    Array.isArray(pvaData.citations) ? pvaData.citations : []
  );
  if (unresolved.length > 0) flags.push('unresolved_citation_string');

  return canonical({ formulaId, citations: keys, source, flags, quarantined: unresolved });
}

/** §6 data.qdro per-asset metadata — drift case 5 (permanent null-stub). */
export function normalizeQdroAssetMetadata(meta) {
  const source = { tool: 'qdroDecisionGuide', storeKey: 'clearpath-blueprint:s6.qdro' };
  const isNullStub =
    isPlainObject(meta) &&
    (meta.formulaId ?? null) === null &&
    Array.isArray(meta.citations) &&
    meta.citations.length === 0;

  if (meta == null || isNullStub) {
    // Process/classification content; external-authority need adjudicated in
    // Phase 2 (SYNTHESIS_MAP.qdroNullStub is deliberately empty).
    return normalizeAbsent(source, 'qdroNullStub');
  }
  return normalizeMetadataObject(meta, source);
}

/** deferredCompStubs[].metadata — drift cases 1/2/3 (nested wrapper, formula key, citation string). */
export function normalizeDcaStubMetadata(meta) {
  const source = { tool: 'deferredCompAnalyzer', storeKey: 'clearpath-blueprint:deferredCompStubs' };
  if (meta == null) return normalizeAbsent(source, null);
  return normalizeMetadataObject(meta, source);
}

/** §6 data.pit — drift case 6 (no persisted metadata at all). */
export function normalizePitSection(pitData) {
  const source = { tool: 'pitTaxDiscountCalculator', storeKey: 'clearpath-blueprint:s6.pit' };
  if (pitData == null) return normalizeAbsent(source, null);
  return normalizeAbsent(source, 'pit');
}

/** §4 — drift case 6 (no metadata) + the store/engine tax-year mismatch trap. */
export function normalizeFsoSection(s4Data) {
  const source = { tool: 'filingStatusOptimizer', storeKey: 'clearpath-blueprint:s4' };
  if (s4Data == null) return normalizeAbsent(source, null);
  const mismatch =
    s4Data.taxYear != null && Number(s4Data.taxYear) !== KNOWN_ENGINE_TAX_YEAR
      ? ['store_engine_year_mismatch']
      : [];
  return normalizeAbsent(source, 'fso', mismatch);
}

/** §9 metadata — nested wrapper with assumptions but NO citation content. */
export function normalizeHdaMetadata(meta) {
  const source = { tool: 'homeDecisionAnalyzer', storeKey: 'clearpath-blueprint:s9' };
  if (meta == null) return normalizeAbsent(source, null);
  // HDA's nested metadata carries assumption/attribution keys only — citation
  // synthesis comes from the map; the assumptions themselves feed the D-V2-7
  // appendix via the document-model builder, not the citation contract.
  return normalizeAbsent(source, 'homeDecision');
}

/** costBasisEntries / §5 tax-adjusted overlay — no per-entry metadata persisted. */
export function normalizeTavMetadata() {
  const source = { tool: 'taxAdjustedAssetView', storeKey: 'clearpath-blueprint:costBasisEntries' };
  return normalizeAbsent(source, 'taxAdjustedAssetView');
}

/** §2 — no metadata; figures ride year-pinned constants (F2 trap). */
export function normalizePayStubMetadata() {
  const source = { tool: 'payStubDecoder', storeKey: 'clearpath-blueprint:s2' };
  return normalizeAbsent(source, 'payStubDecoder');
}

/** Sections with no metadata AND no synthesis mapping — honest gap. */
export function normalizeUnmappedSection(tool, storeKey, extraFlags = []) {
  return normalizeAbsent({ tool, storeKey }, null, extraFlags);
}
