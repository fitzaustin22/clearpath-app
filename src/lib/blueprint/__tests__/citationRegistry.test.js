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

  it('carries exactly 41 seed entries', () => {
    expect(REGISTRY_KEYS).toHaveLength(41);
  });
});

describe('citation registry — entry contract', () => {
  it('every entry is a complete, UNVERIFIED seed', () => {
    for (const [key, e] of Object.entries(REGISTRY)) {
      expect(e.key).toBe(key);
      expect(typeof e.shortCite).toBe('string');
      expect(e.shortCite.length).toBeGreaterThan(0);
      expect(typeof e.fullCite).toBe('string');
      expect(e.fullCite.length).toBeGreaterThan(0);
      expect(typeof e.scopeNote).toBe('string');
      expect(e.scopeNote.length).toBeGreaterThan(0);
      // Spec §6 authoring rule: no entry ships verified. Flips are Fitz's,
      // by hand, with a date.
      expect(e.verified).toBe(false);
      expect(e.verifiedDate).toBeNull();
    }
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
