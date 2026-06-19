import { describe, it, expect } from 'vitest';
import {
  REGISTRY,
  REGISTRY_KEYS,
  RESOLUTION_MAP,
  SYNTHESIS_MAP,
  hasKey,
  getEntry,
  resolveCitationStrings,
  synthesizeCitations,
} from '../citationRegistry.js';
import manifest from '../registryManifest.json';

describe('citation registry — manifest parity (anti-edit tripwire)', () => {
  it('key set matches the checked-in manifest exactly', () => {
    expect([...REGISTRY_KEYS].sort()).toEqual([...manifest.keys].sort());
    expect(REGISTRY_KEYS).toHaveLength(manifest.count);
  });

  it('carries exactly 42 entries (full closed set, vault-mirrored)', () => {
    expect(REGISTRY_KEYS).toHaveLength(42);
  });

  it('includes the 42nd key treas_reg_1_121_3 (vault parity)', () => {
    expect(hasKey('treas_reg_1_121_3')).toBe(true);
  });
});

// Vault verification state of record (V2-Citation-Registry.md): 40 entries are
// verified:true (19 @ 2026-06-12 / irc_417e3 @ 2026-06-10, then 21 @ 2026-06-18
// in batch #2, which includes the three RE-CITED authorities bender→Barbour,
// soa_commutation→ASOP 34, ppa→IRC §411(a)(13)). The remaining 2 stay
// unverified: kaufman_guidelines (educational mention only) and sutherland_pit
// (a DISCLOSED ClearPath method, not an external authority — it carries
// disclosedMethod and renders without the "methodology under review" suffix,
// rather than a verification date). The Phase 2 renderer's verified-vs-"under
// review" treatment (Acceptance Spec §4-A2) reads entry.verified, so the code
// mirror MUST carry the flags. Flips remain Fitz's by primary-source verification.
const VERIFIED_KEYS = new Set([
  // 19 verified pre-batch-2 (2026-06-12; irc_417e3 @ 2026-06-10)
  'aaml_30_20_40', 'aaml_duration_schedule', 'boemio_2010',
  'va_16_1_278_17_1', 'va_20_108_2', 'va_20_103', 'va_20_107_1',
  'md_fl_12_201_202_204', 'md_fl_11_106', 'voishan_1992',
  'dc_16_916_01_911', 'dc_16_913', 'builta_2024', 'hhs_ocse_income_shares',
  'irc_417e3', 'irs_notice_2025_40', 'rev_proc_2025_32',
  'ssa_wage_base', 'irs_401k_limits',
  // 21 verified in batch #2 (2026-06-18); bender/soa_commutation/ppa re-cited then flipped
  'coverture_time_rule', 'bender_dc_1972', 'mosley_va_1994', 'deering_md_1981',
  'hug_1984', 'nelson_1986', 'reg_1_417e_1', 'soa_commutation', 'soa_pub2010',
  'soa_rp2014', 'irs_notice_96_8', 'ppa_2006_1107', 'cooper_v_ibm_2006',
  'irc_121', 'irc_121_d_3', 'treas_reg_1_121_3', 'irc_1041', 'irc_7703',
  'irc_24_ctc_2026', 'ltcg_15_simplification', 'hpa_pmi_cancellation',
]);

describe('citation registry — entry contract', () => {
  it('every entry is structurally complete', () => {
    for (const [key, e] of Object.entries(REGISTRY)) {
      expect(e.key).toBe(key);
      expect(typeof e.shortCite).toBe('string');
      expect(e.shortCite.length).toBeGreaterThan(0);
      expect(typeof e.fullCite).toBe('string');
      expect(e.fullCite.length).toBeGreaterThan(0);
      expect(typeof e.scopeNote).toBe('string');
      expect(e.scopeNote.length).toBeGreaterThan(0);
    }
  });

  it('verified state mirrors the vault: 40 verified (with dates), 2 unverified', () => {
    let verifiedCount = 0;
    for (const [key, e] of Object.entries(REGISTRY)) {
      if (VERIFIED_KEYS.has(key)) {
        expect(e.verified, key).toBe(true);
        expect(typeof e.verifiedDate, key).toBe('string');
        expect(e.verifiedDate.length, key).toBeGreaterThan(0);
        verifiedCount += 1;
      } else {
        // Spec §6 authoring rule: unverified seeds never ship verified.
        expect(e.verified, key).toBe(false);
        expect(e.verifiedDate, key).toBeNull();
      }
    }
    expect(verifiedCount).toBe(40);
    expect(VERIFIED_KEYS.size).toBe(40);
  });

  it('sutherland_pit is a DISCLOSED method: not verified, no date, carries disclosedMethod, and credits the Sutherland article', () => {
    const e = getEntry('sutherland_pit');
    expect(e.verified).toBe(false);
    expect(e.verifiedDate).toBeNull();
    expect(e.disclosedMethod).toBe(true);
    // The cite CREDITS Sutherland's published "Point in Time" formula (ClearPath's
    // disclosed implementation of it), rather than dropping the attribution.
    expect(e.shortCite).toMatch(/Sutherland/i);
    expect(e.fullCite).toMatch(/Sutherland/i);
    // It is the ONLY disclosed-method entry; ordinary entries omit the field.
    const disclosed = REGISTRY_KEYS.filter((k) => REGISTRY[k].disclosedMethod);
    expect(disclosed).toEqual(['sutherland_pit']);
    expect('disclosedMethod' in getEntry('irc_121')).toBe(false);
  });

  it('hasKey/getEntry agree and reject unknown keys', () => {
    expect(hasKey('irc_417e3')).toBe(true);
    expect(getEntry('irc_417e3').shortCite).toBe('IRC § 417(e)(3)');
    expect(hasKey('made_up_key')).toBe(false);
    expect(getEntry('made_up_key')).toBeNull();
  });
});

describe('citation registry — RESOLUTION_MAP', () => {
  it('every mapped target key exists in the registry (closed set)', () => {
    for (const [raw, keys] of Object.entries(RESOLUTION_MAP)) {
      expect(Array.isArray(keys), raw).toBe(true);
      for (const k of keys) expect(hasKey(k), `${raw} → ${k}`).toBe(true);
    }
  });

  it('resolves the PVA tier_3 citation array verbatim', () => {
    const { keys, unresolved } = resolveCitationStrings([
      'Bender v. Bender, 297 A.2d 786 (DC 1972)',
      'Mosley v. Mosley, 19 Va. App. 192, 450 S.E.2d 161 (1994)',
      'Deering v. Deering, 292 Md. 115, 437 A.2d 883 (1981)',
    ]);
    expect(keys).toEqual(['bender_dc_1972', 'mosley_va_1994', 'deering_md_1981']);
    expect(unresolved).toEqual([]);
  });

  it('resolves the DCA combined Hug/Nelson string to TWO keys', () => {
    const { keys, unresolved } = resolveCitationStrings([
      'In re Marriage of Hug (1984) 154 Cal.App.3d 780; In re Marriage of Nelson (1986) 177 Cal.App.3d 150',
    ]);
    expect(keys).toEqual(['hug_1984', 'nelson_1986']);
    expect(unresolved).toEqual([]);
  });

  it('dedupes keys across repeated strings, first-seen order', () => {
    const { keys } = resolveCitationStrings([
      'IRC §417(e)(3)',
      'IRC §417(e)(3)',
      '26 CFR §1.417(e)-1',
    ]);
    expect(keys).toEqual(['irc_417e3', 'reg_1_417e_1']);
  });

  it('quarantines unknown strings verbatim instead of dropping or inventing', () => {
    const { keys, unresolved } = resolveCitationStrings([
      'IRS Notice 96-8',
      'Some Future Authority, 1 X.4th 1 (2099)',
    ]);
    expect(keys).toEqual(['irs_notice_96_8']);
    expect(unresolved).toEqual(['Some Future Authority, 1 X.4th 1 (2099)']);
  });

  it('routes CA/NY authority strings to the unresolved path per D-V2-8', () => {
    const { keys, unresolved } = resolveCitationStrings([
      'Cal. Fam. Code §3600',
      'DRL §236(B)(5-a)',
      'state-specific factor analysis (no federal spousal formula)',
    ]);
    expect(keys).toEqual([]);
    expect(unresolved).toHaveLength(3);
  });

  it('tolerates empty and missing input', () => {
    expect(resolveCitationStrings([])).toEqual({ keys: [], unresolved: [] });
    expect(resolveCitationStrings(undefined)).toEqual({ keys: [], unresolved: [] });
  });
});

describe('citation registry — SYNTHESIS_MAP', () => {
  it('every synthesized key exists in the registry, across the FULL map', () => {
    for (const [source, keys] of Object.entries(SYNTHESIS_MAP)) {
      for (const k of keys) expect(hasKey(k), `${source} → ${k}`).toBe(true);
    }
  });

  it('fso synthesizes the prompt-pinned triple with synthesis flags', () => {
    expect(synthesizeCitations('fso')).toEqual({
      keys: ['irc_7703', 'rev_proc_2025_32', 'irc_24_ctc_2026'],
      flags: ['citation_synthesized_from_registry', 'no_persisted_metadata'],
    });
  });

  it('pit synthesizes sutherland_pit', () => {
    expect(synthesizeCitations('pit')).toEqual({
      keys: ['sutherland_pit'],
      flags: ['citation_synthesized_from_registry', 'no_persisted_metadata'],
    });
  });

  it('qdroNullStub is EXPLICITLY empty with the deliberate flag', () => {
    expect(synthesizeCitations('qdroNullStub')).toEqual({
      keys: [],
      flags: ['synthesis_deliberately_empty'],
    });
  });

  it('audited additions synthesize their matched scopes', () => {
    expect(synthesizeCitations('taxAdjustedAssetView').keys).toEqual([
      'ltcg_15_simplification',
      'irc_121',
      'irc_1041',
    ]);
    expect(synthesizeCitations('payStubDecoder').keys).toEqual([
      'ssa_wage_base',
      'irs_401k_limits',
    ]);
    expect(synthesizeCitations('homeDecision').keys).toEqual(['hpa_pmi_cancellation']);
  });

  it('returns null for sources outside the map — no ad hoc synthesis', () => {
    expect(synthesizeCitations('budgetModeler')).toBeNull();
    expect(synthesizeCitations('')).toBeNull();
  });
});
