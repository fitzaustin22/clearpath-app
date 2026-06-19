/**
 * V2 Attorney Blueprint — closed citation registry (code mirror).
 *
 * MIRRORS the human-side source of truth: vault Roadmap/v1.x/V2-Citation-Registry.md.
 * Any divergence between this module and the vault doc is a defect (Acceptance
 * Spec §4-A2; vault parity is reviewed at PR time — the registryManifest.json
 * parity test below is only a tripwire against accidental in-repo edits).
 *
 * AUTHORING RULE (hard, spec §6): every entry is a SEED. No entry renders until
 * Fitz verifies the pin cite against the primary source and flips
 * `verified: true` with a date. The registry is the ONLY path to a rendered
 * citation. Renderers (Phase 2) emit citations by registry KEY exclusively.
 *
 * CA/NY authority strings are deliberately ABSENT from RESOLUTION_MAP per
 * D-V2-8 (client-state gate): those engines stay live for consumer surfaces,
 * but their citations enter the registry only when each expansion lands with
 * its own A5-H panel seat. Until then they resolve to the unresolved path.
 */

/**
 * Verification state of record, mirrored from the vault
 * (Roadmap/v1.x/V2-Citation-Registry.md). Spec §6 authoring rule: an entry
 * renders its cite as settled authority ONLY when verified; the Phase 2
 * renderer reads `entry.verified` to drive the verified-vs-"methodology under
 * review" treatment (Acceptance Spec §4-A2). Flips are Fitz's, by primary-
 * source verification; this map records the verifications of record:
 *   - 18 flipped 2026-06-12 (DMV support block incl. Voishan/Builta, AAML
 *     formula+duration+Boemio, NY-CSSA fallback, tax/mortality constants),
 *     evidence memos A/B/C/D + engine corrections PR #72.
 *   - irc_417e3 flipped 2026-06-10 (repair PR #69; 417e-evidence memo).
 *   - 21 flipped 2026-06-18 (batch #2, Cowork primary-source verification):
 *     coverture method + the DMV/CA coverture cases (Mosley/Deering/Hug/Nelson),
 *     the §417(e) reg + mortality tables (Pub-2010/RP-2014) + cash-balance
 *     basis (Notice 96-8/Cooper), the §121 family + §7703 + CTC + LTCG + HPA,
 *     and the three RE-CITED authorities (Barbour for the DC coverture seat,
 *     ASOP No. 34 for the actuarial basis, IRC §411(a)(13) for the cash-balance
 *     safe harbor) — cite text replaced below, then flipped.
 * Keys ABSENT here stay unverified seeds (verified:false, verifiedDate:null).
 * sutherland_pit is INTENTIONALLY absent: it credits Sutherland's published
 * "Point in Time" formula but is ClearPath's disclosed IMPLEMENTATION of it (not
 * an independently verified primary-source authority), so it carries
 * `disclosedMethod` (renders without the "methodology under review" suffix)
 * rather than a verification date.
 */
const VERIFIED_DATES = Object.freeze({
  aaml_30_20_40: '2026-06-12',
  aaml_duration_schedule: '2026-06-12',
  boemio_2010: '2026-06-12',
  va_16_1_278_17_1: '2026-06-12',
  va_20_108_2: '2026-06-12',
  va_20_103: '2026-06-12',
  va_20_107_1: '2026-06-12',
  md_fl_12_201_202_204: '2026-06-12',
  md_fl_11_106: '2026-06-12',
  voishan_1992: '2026-06-12',
  dc_16_916_01_911: '2026-06-12',
  dc_16_913: '2026-06-12',
  builta_2024: '2026-06-12',
  hhs_ocse_income_shares: '2026-06-12',
  irs_notice_2025_40: '2026-06-12',
  rev_proc_2025_32: '2026-06-12',
  ssa_wage_base: '2026-06-12',
  irs_401k_limits: '2026-06-12',
  irc_417e3: '2026-06-10',
  // ── Batch #2 (2026-06-18) — Cowork primary-source verification ─────────────
  coverture_time_rule: '2026-06-18',
  bender_dc_1972: '2026-06-18', // re-cited to Barbour v. Barbour (below)
  mosley_va_1994: '2026-06-18',
  deering_md_1981: '2026-06-18',
  hug_1984: '2026-06-18',
  nelson_1986: '2026-06-18',
  reg_1_417e_1: '2026-06-18',
  soa_commutation: '2026-06-18', // re-cited to ASOP No. 34 (below)
  soa_pub2010: '2026-06-18',
  soa_rp2014: '2026-06-18',
  irs_notice_96_8: '2026-06-18',
  ppa_2006_1107: '2026-06-18', // re-cited to IRC §411(a)(13)(A) (below)
  cooper_v_ibm_2006: '2026-06-18',
  irc_121: '2026-06-18',
  irc_121_d_3: '2026-06-18',
  treas_reg_1_121_3: '2026-06-18',
  irc_1041: '2026-06-18',
  irc_7703: '2026-06-18',
  irc_24_ctc_2026: '2026-06-18',
  ltcg_15_simplification: '2026-06-18',
  hpa_pmi_cancellation: '2026-06-18',
});

const entry = (key, shortCite, fullCite, scopeNote, opts = {}) => ({
  key,
  shortCite,
  fullCite,
  scopeNote,
  verified: Object.prototype.hasOwnProperty.call(VERIFIED_DATES, key),
  verifiedDate: VERIFIED_DATES[key] ?? null,
  // A disclosed ClearPath method (not an external authority): renders as settled
  // — the renderer suppresses the "methodology under review" suffix for it — even
  // though it carries no verification date. Field is OMITTED unless set so it
  // never appears on ordinary entries. Mutually exclusive with `verified` by
  // construction (a disclosed method is never added to VERIFIED_DATES).
  ...(opts.disclosedMethod ? { disclosedMethod: true } : {}),
});

export const REGISTRY = Object.freeze({
  // ── §1 Support — DMV + fallback ────────────────────────────────────────────
  aaml_30_20_40: entry(
    'aaml_30_20_40',
    'AAML formula',
    'AAML Considerations (2007): 30% payor − 20% payee gross, 40% combined-income cap',
    "Benchmark support estimate; variant pinned v1_canonical (the commented v1_1_post_tcja 24% variant is NOT in scope); persists as formulaUsed 'aaml_30_20_with_40pct_cap'."
  ),
  aaml_duration_schedule: entry(
    'aaml_duration_schedule',
    'AAML duration multipliers',
    'AAML Considerations: <3y → 0.30, <10y → 0.50, <20y → 0.75, 20y+ → indefinite',
    'Duration framing only — distinct entry from the 30/20/40 formula.'
  ),
  boemio_2010: entry(
    'boemio_2010',
    'Boemio v. Boemio',
    'Boemio v. Boemio, 414 Md. 118 (2010)',
    'Maryland approval of AAML-formula consideration; pairs with aaml_30_20_40 in MD renders.'
  ),
  kaufman_guidelines: entry(
    'kaufman_guidelines',
    'Kaufman Alimony Guidelines',
    'Kaufman Alimony Guidelines (Maryland)',
    "EDUCATIONAL MENTION ONLY — no Kaufman computation exists in the codebase; renders solely in educational copy, never as a figure's authority."
  ),
  va_16_1_278_17_1: entry(
    'va_16_1_278_17_1',
    'Va. Code § 16.1-278.17:1',
    'Va. Code Ann. § 16.1-278.17:1',
    'Pendente lite spousal formula (26/58 | 27/50) INCLUDING the $120,000 combined-income presumption cap.'
  ),
  va_20_108_2: entry(
    'va_20_108_2',
    'Va. Code § 20-108.2',
    'Va. Code Ann. § 20-108.2',
    'Child-support schedule table AND above-cap marginal percentages (0.026–0.050 by child count); session-law provenance: SB 805, 2025 Va. Acts ch. 702.'
  ),
  va_20_103: entry(
    'va_20_103',
    'Va. Code § 20-103',
    'Va. Code Ann. § 20-103',
    'Pendente lite authority, persisted alongside § 16.1-278.17:1 in VA citation arrays.'
  ),
  va_20_107_1: entry(
    'va_20_107_1',
    'Va. Code § 20-107.1',
    'Va. Code Ann. § 20-107.1',
    'Post-divorce spousal factors.'
  ),
  md_fl_12_201_202_204: entry(
    'md_fl_12_201_202_204',
    'Md. Code, Fam. Law §§ 12-201/202/204',
    'Md. Code Ann., Fam. Law §§ 12-201, 12-202, 12-204',
    'Child-support framework INCLUDING § 12-204(c) next-higher-row rule and § 12-204(d); cap raise per 2020 Md. Laws ch. 384 (eff. 7/1/2022).'
  ),
  md_fl_11_106: entry(
    'md_fl_11_106',
    'Md. Code, Fam. Law § 11-106',
    'Md. Code Ann., Fam. Law § 11-106',
    'Alimony factors; persisted in MD citation arrays.'
  ),
  voishan_1992: entry(
    'voishan_1992',
    'Voishan v. Palma',
    'Voishan v. Palma, 327 Md. 318 (1992)',
    "Above-schedule discretion; engine method 'md_voishan_presumptive_floor'."
  ),
  dc_16_916_01_911: entry(
    'dc_16_916_01_911',
    'D.C. Code §§ 16-916.01, 16-911',
    'D.C. Code §§ 16-916.01, 16-911',
    'Guideline + PL authority INCLUDING (d)(3) alimony-first ordering, (f)(1)(B) rounding, (g) minimum order ($50) with self-support reserve ($15,654 = 133% FPL single), (h) cap; as-implemented schedule values (incl. two suspected source typo rows) are fixture truth.'
  ),
  dc_16_913: entry(
    'dc_16_913',
    'D.C. Code § 16-913',
    'D.C. Code § 16-913',
    'Persisted in DC citation arrays alongside the guideline pair.'
  ),
  builta_2024: entry(
    'builta_2024',
    'Builta v. Guzman',
    'Builta v. Guzman, 324 A.3d 269 (D.C. 2024)',
    'Above-cap extrapolation (slope-from-last-two-rows, computeHollandExtrapolation).'
  ),
  hhs_ocse_income_shares: entry(
    'hhs_ocse_income_shares',
    'HHS/OCSE income-shares model',
    'Federal HHS/OCSE income-shares national model',
    'Generic-state FALLBACK national approximation (17/25/29/31/35%) — must render as approximation, never as state authority.'
  ),

  // ── §2 Marital share — case law & method ──────────────────────────────────
  coverture_time_rule: entry(
    'coverture_time_rule',
    'Coverture fraction / time rule',
    'Coverture fraction / time-rule marital-share method',
    'Per-tranche marital-share method (DCA + PVA tier 3). The "Lehman-style" label is RETIRED — implemented authorities are bender_dc_1972 / mosley_va_1994 / deering_md_1981 / hug_1984 / nelson_1986.'
  ),
  bender_dc_1972: entry(
    'bender_dc_1972',
    'Barbour v. Barbour',
    'Barbour v. Barbour, 464 A.2d 915 (D.C. 1983)',
    'DC coverture authority (PVA tier 3). Re-cited 2026-06-18 (batch #2): the DC coverture seat is Barbour, not Bender; registry key retained for the persisted-string resolution mapping.'
  ),
  mosley_va_1994: entry(
    'mosley_va_1994',
    'Mosley v. Mosley',
    'Mosley v. Mosley, 19 Va. App. 192, 450 S.E.2d 161 (1994)',
    'VA coverture authority (PVA tier 3).'
  ),
  deering_md_1981: entry(
    'deering_md_1981',
    'Deering v. Deering',
    'Deering v. Deering, 292 Md. 115, 437 A.2d 883 (1981)',
    'MD coverture authority (PVA tier 3).'
  ),
  hug_1984: entry(
    'hug_1984',
    'In re Marriage of Hug',
    'In re Marriage of Hug, 154 Cal. App. 3d 780 (1984)',
    'Time-rule variant for deferred comp (DCA). California case — illustrative of an accepted method; not controlling DMV authority.'
  ),
  nelson_1986: entry(
    'nelson_1986',
    'In re Marriage of Nelson',
    'In re Marriage of Nelson, 177 Cal. App. 3d 150 (1986)',
    'Companion time-rule variant. California case — illustrative of an accepted method; not controlling DMV authority.'
  ),

  // ── §3 Pension / PV apparatus ─────────────────────────────────────────────
  irc_417e3: entry(
    'irc_417e3',
    'IRC § 417(e)(3)',
    '26 U.S.C. § 417(e)(3)',
    "PV discount basis, segment 2, ±100bp sensitivity. BLOCKED: code pins segment-2 values to placeholder 'IRS Notice 2026-XX' — verification pulls the actual Notices and replaces the placeholder."
  ),
  reg_1_417e_1: entry(
    'reg_1_417e_1',
    '26 CFR § 1.417(e)-1',
    '26 C.F.R. § 1.417(e)-1',
    'Implementing regulation, PVA tiers 1/2.'
  ),
  soa_commutation: entry(
    'soa_commutation',
    'ASOP No. 34',
    'Actuarial Standard of Practice No. 34 (Actuarial Practice Concerning Retirement Plan Benefits in Domestic Relations Actions); ASOP No. 4 (secondary)',
    'Actuarial basis, tiers 1/2 + in-pay. Re-cited 2026-06-18 (batch #2): pinned to ASOP No. 34 (ASOP No. 4 secondary); the generic "commutation" label is dropped. Registry key retained for the persisted-string resolution mapping.'
  ),
  irs_notice_2025_40: entry(
    'irs_notice_2025_40',
    'IRS Notice 2025-40',
    'IRS Notice 2025-40, IRB 2025-31',
    '§ 417(e) applicable mortality table; derived per Rev. Rul. 2007-67 blend under § 1.430(h)(3)-1.'
  ),
  soa_pub2010: entry(
    'soa_pub2010',
    'SOA Pub-2010',
    'Society of Actuaries, Pub-2010 Public Retirement Plans Mortality Tables Report (2019)',
    'Alternative mortality table; unisex blend convention in scope.'
  ),
  soa_rp2014: entry(
    'soa_rp2014',
    'SOA RP-2014',
    'Society of Actuaries, RP-2014 Mortality Tables Report (2014)',
    'Legacy mortality table option.'
  ),
  irs_notice_96_8: entry(
    'irs_notice_96_8',
    'IRS Notice 96-8',
    'IRS Notice 96-8',
    'Cash-balance valuation basis.'
  ),
  ppa_2006_1107: entry(
    'ppa_2006_1107',
    'IRC § 411(a)(13)(A)',
    '26 U.S.C. § 411(a)(13)(A); 26 C.F.R. § 1.411(a)(13)-1',
    'Lump-sum-equals-balance safe harbor (cash-balance path). Re-cited 2026-06-18 (batch #2): the governing law is IRC § 411(a)(13)(A) and its regulation, not a PPA act-section number. Registry key retained for the persisted-string resolution mapping.'
  ),
  cooper_v_ibm_2006: entry(
    'cooper_v_ibm_2006',
    'Cooper v. IBM',
    'Cooper v. IBM Personal Pension Plan, 457 F.3d 636 (7th Cir. 2006)',
    'Cash-balance path.'
  ),

  // ── §4 Federal tax ────────────────────────────────────────────────────────
  irc_121: entry(
    'irc_121',
    'IRC § 121',
    '26 U.S.C. § 121',
    'Principal-residence exclusion incl. partial; consumers: homeDecision projectionEngine + tax-adjusted asset view.'
  ),
  irc_121_d_3: entry(
    'irc_121_d_3',
    'IRC § 121(d)(3)',
    '26 U.S.C. § 121(d)(3)',
    'Spousal ownership/use tacking — drives the copy correction of the § 1041 misattribution.'
  ),
  treas_reg_1_121_3: entry(
    'treas_reg_1_121_3',
    'Treas. Reg. § 1.121-3',
    'Treas. Reg. § 1.121-3',
    "Reduced maximum exclusion — unforeseen-circumstances qualification; divorce enumerated at § 1.121-3(e)(2)(iii)(D); basis for the engine's categorical §121(c) partial qualification (no user-facing reason input). Implemented PR #70."
  ),
  irc_1041: entry(
    'irc_1041',
    'IRC § 1041',
    '26 U.S.C. § 1041',
    'Transfer-incident-to-divorce basis carryover (and ONLY that, post-correction).'
  ),
  irc_7703: entry(
    'irc_7703',
    'IRC § 7703 + Pub. 501',
    '26 U.S.C. § 7703; IRS Publication 501',
    'Dec-31 marital-status determination AND § 7703(b) abandoned-spouse/HoH eligibility.'
  ),
  irc_24_ctc_2026: entry(
    'irc_24_ctc_2026',
    'IRC § 24 (CTC, 2026)',
    '26 U.S.C. § 24',
    'Child Tax Credit, 2026 amount $2,200; year-pinned.'
  ),
  sutherland_pit: entry(
    'sutherland_pit',
    'Point-in-time tax discount (Sutherland "Point in Time" formula)',
    'Sutherland, "Is Your Retirement Plan Tax Discount Too High?", DFA Journal (IDFA), Q2 2025 — point-in-time 401(k) tax-discount formula; ClearPath disclosed implementation, formula in Appendix A.',
    "PIT tax-discount basis. Implements Steven E. Sutherland's published 'Point in Time' 401(k) tax-discount formula (DFA Journal/IDFA, Q2 2025) verbatim — same formula, terminology, and result (9.79% at n=23 in F1). Credited 2026-06-18 (batch #2) to the article rather than dropped: it is ClearPath's disclosed implementation of a third-party-derived formula, not an independently verified primary-source authority, so it stays verified:false and renders WITHOUT the 'methodology under review' suffix via disclosedMethod, and is NOT counted among the verified authorities. The point-in-time MATH (METHODOLOGY_DESCRIPTIONS) is unchanged.",
    { disclosedMethod: true }
  ),
  rev_proc_2025_32: entry(
    'rev_proc_2025_32',
    'Rev. Proc. 2025-32',
    'IRS Revenue Procedure 2025-32',
    '2026 federal brackets / inflation adjustments; renderer must source taxYear from the engine, not the blueprintStore taxYear literal (defect filed separately).'
  ),
  ltcg_15_simplification: entry(
    'ltcg_15_simplification',
    'Flat 15% LTCG (disclosed simplification)',
    '26 U.S.C. § 1(h) (background rate structure)',
    'The flat 15% LTCG rate is a DISCLOSED v1 SIMPLIFICATION (per D-V2-5/D-V2-7 register), never cited as the law’s rate structure; renders with the simplification label.'
  ),
  ssa_wage_base: entry(
    'ssa_wage_base',
    'SSA wage base (year-pinned)',
    'Social Security Administration contribution and benefit base (year-pinned)',
    'STALE: code constant 168,600 is the 2024 base — must be year-labeled and updated before any attorney surface renders it.'
  ),
  irs_401k_limits: entry(
    'irs_401k_limits',
    'IRS 401(k) limits (year-pinned)',
    'IRS notice, 401(k) elective deferral + catch-up limits (year-pinned)',
    'Backs the paystub warning constants; verification pins the governing notice for the labeled year.'
  ),

  // ── §5 Housing ────────────────────────────────────────────────────────────
  hpa_pmi_cancellation: entry(
    'hpa_pmi_cancellation',
    'Homeowners Protection Act',
    '12 U.S.C. §§ 4901–4902',
    '78% scheduled-LTV auto-cancel / 80% borrower-initiated PMI cancellation.'
  ),
});

export const REGISTRY_KEYS = Object.freeze(Object.keys(REGISTRY));

/**
 * Verbatim-persisted-string → registry-key mapping (gap-scan §3 inventory).
 * Keys of this map are EXACT string literals found in persisted tool metadata.
 * One string may resolve to multiple registry keys (the DCA combined cite).
 * Strings deliberately absent (CA/NY authorities, the generic-state
 * factor-analysis caveat) take the unresolved path per D-V2-8.
 */
export const RESOLUTION_MAP = Object.freeze({
  // PVA — src/lib/pensionValuation/citations.js
  // Batch #2 (2026-06-18) re-cited three of these authorities. The CONSUMER
  // display string (CITATIONS_BY_PATH) was corrected to the NEW cite; the OLD
  // persisted string is RETAINED here UNCONDITIONALLY so already-saved user data
  // still resolves. Both old and new map to the same key (see the resolution
  // test in citationRegistry.test.js). Never drop the old strings.
  'IRC §417(e)(3)': ['irc_417e3'],
  '26 CFR §1.417(e)-1': ['reg_1_417e_1'],
  // soa_commutation re-cited "SOA … commutation methodology" → "ASOP No. 34":
  'SOA actuarial standards (commutation methodology)': ['soa_commutation'], // OLD persisted — backward-compat
  'ASOP No. 34': ['soa_commutation'], // NEW consumer display
  // bender_dc_1972 re-cited "Bender v. Bender" → "Barbour v. Barbour":
  'Bender v. Bender, 297 A.2d 786 (DC 1972)': ['bender_dc_1972'], // OLD persisted — backward-compat
  'Barbour v. Barbour, 464 A.2d 915 (D.C. 1983)': ['bender_dc_1972'], // NEW consumer display
  'Mosley v. Mosley, 19 Va. App. 192, 450 S.E.2d 161 (1994)': ['mosley_va_1994'],
  'Deering v. Deering, 292 Md. 115, 437 A.2d 883 (1981)': ['deering_md_1981'],
  'IRS Notice 96-8': ['irs_notice_96_8'],
  // ppa_2006_1107 re-cited "Pension Protection Act of 2006 §1107" → "IRC §411(a)(13)(A)":
  'Pension Protection Act of 2006 §1107 (lump-sum-equals-balance safe harbor)': ['ppa_2006_1107'], // OLD persisted — backward-compat
  'IRC §411(a)(13)(A)': ['ppa_2006_1107'], // NEW consumer display
  'Cooper v. IBM Personal Pension Plan, 457 F.3d 636 (7th Cir. 2006)': ['cooper_v_ibm_2006'],
  // DCA — m6Store DEFERRED_COMP_CITATION (one string, two authorities)
  'In re Marriage of Hug (1984) 154 Cal.App.3d 780; In re Marriage of Nelson (1986) 177 Cal.App.3d 150':
    ['hug_1984', 'nelson_1986'],
  // Support estimator (m5Store-persisted today; reaches the document via the
  // V2 §8 writer) — src/lib/supportEstimator/paths/{va,md,dc,generic}.js
  'Va. Code §16.1-278.17:1': ['va_16_1_278_17_1'],
  'Va. Code §20-103': ['va_20_103'],
  'Va. Code §20-108.2': ['va_20_108_2'],
  'Va. Code §20-107.1': ['va_20_107_1'],
  'Md. Fam. Law §11-106': ['md_fl_11_106'],
  'Md. Fam. Law §12-204': ['md_fl_12_201_202_204'],
  'Boemio v. Boemio, 414 Md. 118 (2010)': ['boemio_2010'],
  'Voishan v. Palma, 327 Md. 318 (1992)': ['voishan_1992'],
  'D.C. Code §16-913': ['dc_16_913'],
  'D.C. Code §16-916.01': ['dc_16_916_01_911'],
  'Builta v. Guzman, 324 A.3d 269 (D.C. 2024)': ['builta_2024'],
  'Federal HHS/OCSE income-shares national model': ['hhs_ocse_income_shares'],
});

/**
 * Per-source citation synthesis for tools that persist NO metadata (spec §4-A3
 * drift case 6 family). Synthesis is ONLY ever applied from this map — never
 * ad hoc. Prompt-seeded sources: fso, pit, qdroNullStub. AUDITED ADDITIONS
 * (flagged in the Phase 1 PR body): taxAdjustedAssetView, payStubDecoder,
 * homeDecision — each matched to its registry scope per the gap-scan findings.
 */
export const SYNTHESIS_MAP = Object.freeze({
  fso: ['irc_7703', 'rev_proc_2025_32', 'irc_24_ctc_2026'],
  pit: ['sutherland_pit'],
  // Process/classification content; external-authority need adjudicated in
  // Phase 2 — deliberately empty, flagged 'synthesis_deliberately_empty'.
  qdroNullStub: [],
  // ADDITION: §5 tax-adjusted overlay + costBasisEntries carrier ride the flat
  // 15% LTCG simplification, §121 (primary residence), and §1041 basis
  // carryover — gap-scan §1 findings 3/7/8.
  taxAdjustedAssetView: ['ltcg_15_simplification', 'irc_121', 'irc_1041'],
  // ADDITION: §2 figures ride the SSA wage base + 401(k) limit constants
  // (gap-scan §1 finding 9; F2 trap encoding).
  payStubDecoder: ['ssa_wage_base', 'irs_401k_limits'],
  // ADDITION: §9 metadata carries assumptions but no citations; HPA is the one
  // external authority in HDA mechanics (gap-scan §1 finding 28). The broader
  // HDA assumption sweep is D-V2-7 appendix material, not citations.
  homeDecision: ['hpa_pmi_cancellation'],
});

export function hasKey(key) {
  return Object.prototype.hasOwnProperty.call(REGISTRY, key);
}

export function getEntry(key) {
  return hasKey(key) ? REGISTRY[key] : null;
}

/**
 * Resolve free-text persisted citation strings to registry keys.
 * Returns { keys, unresolved } — keys deduped in first-seen order; unresolved
 * preserves the raw strings verbatim (the caller quarantines them; they are
 * never rendered and never silently dropped).
 */
export function resolveCitationStrings(strings) {
  const keys = [];
  const unresolved = [];
  const seen = new Set();
  for (const raw of strings || []) {
    const mapped = RESOLUTION_MAP[raw];
    if (mapped) {
      for (const k of mapped) {
        if (!seen.has(k)) {
          seen.add(k);
          keys.push(k);
        }
      }
    } else {
      unresolved.push(raw);
    }
  }
  return { keys, unresolved };
}

/**
 * Synthesize citations for a no-metadata source. Returns null when the source
 * is not in SYNTHESIS_MAP (callers must NOT invent synthesis outside the map).
 */
export function synthesizeCitations(sourceId) {
  if (!Object.prototype.hasOwnProperty.call(SYNTHESIS_MAP, sourceId)) return null;
  const keys = SYNTHESIS_MAP[sourceId];
  const flags =
    keys.length === 0
      ? ['synthesis_deliberately_empty']
      : ['citation_synthesized_from_registry', 'no_persisted_metadata'];
  return { keys: [...keys], flags };
}
