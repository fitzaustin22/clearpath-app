/**
 * Per-path citation arrays surfaced to results.metadata.citations.
 * Originally spec §7.6.4 [R5a-7, R5a-8] verbatim. Three authorities were
 * re-cited in citation batch #2 (2026-06-18) after primary-source verification:
 *   - "Bender v. Bender" → "Barbour v. Barbour, 464 A.2d 915 (D.C. 1983)" (the
 *     DC coverture seat is Barbour; the prior Bender reporter cite does not
 *     exist).
 *   - "SOA actuarial standards (commutation methodology)" → "ASOP No. 34".
 *   - "Pension Protection Act of 2006 §1107 …" → "IRC §411(a)(13)(A)".
 * These strings are displayed consumer-facing (M5 PVA results → §6 Client
 * Blueprint) AND resolve to the V2 attorney registry. The OLD strings are
 * retained as backward-compat keys in citationRegistry.js RESOLUTION_MAP so
 * already-persisted user data still resolves; the registry keys are unchanged.
 */
export const CITATIONS_BY_PATH = {
  tier_1: [
    'IRC §417(e)(3)',
    '26 CFR §1.417(e)-1',
    'ASOP No. 34',
  ],
  tier_2: [
    'IRC §417(e)(3)',
    '26 CFR §1.417(e)-1',
    'ASOP No. 34',
  ],
  tier_3: [
    'Barbour v. Barbour, 464 A.2d 915 (D.C. 1983)',
    'Mosley v. Mosley, 19 Va. App. 192, 450 S.E.2d 161 (1994)',
    'Deering v. Deering, 292 Md. 115, 437 A.2d 883 (1981)',
  ],
  in_pay_status: [
    'IRC §417(e)(3)',
    'ASOP No. 34',
  ],
  cash_balance: [
    'IRS Notice 96-8',
    'IRC §411(a)(13)(A)',
    'Cooper v. IBM Personal Pension Plan, 457 F.3d 636 (7th Cir. 2006)',
  ],
  flag_only: [],
};
