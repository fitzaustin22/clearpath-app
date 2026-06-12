ARCHIVE NOTE: Slot 6's pin line (70200) was overridden to 62500 at insertion — architect audit adjudicated the as-built year-granularity months convention (TC-HDA-12 chain); approved by Fitz 2026-06-12. See PR body.

# V2 Golden-Fixture Pins — PROPOSAL MEMO

**Date:** 2026-06-10
**Status:** Proposal only. No fixture, repo, or vault file was edited. All 21 slots derived by hand-computation under the independence rules of `CC-Prompt-Proposed-Pins.md`, against `V2-Pinning-Worksheet.md` (worksheet generated at main @ `ed6e66b`; the categorical-lane and §121(c) facts below reflect the post-#70 fixtures actually on disk).

---

## Contamination disclosure

Visible to me this session (auto-loaded project memory index, before this task started):

- **A relative figure — "F1 PV −1.9%"** — a user-communications delta tied to the PR #69 rate repair. No absolute F1 pension PV value was visible. I did not attempt to reverse a target from it; the Slot 20/21 derivations below are built only from fixture inputs, the verified rate table, and the mortality table.
- **Two amendment facts** that the task prompt itself also states: F3 §121 follows the reduced-cap rule (cap × qualifyingMonths/24), and Slots 5/12 pin as label strings in the `auditAssertions` lane.
- **No numeric target value for any of the 21 slots** appeared in my context this session. I did not open PR bodies, build logs, `docs/verification/`, engine sources, engine tests, prior session reports, or the `.claude/*.md` recon files at any point.

Per the prompt, **Slots 19, 20, and 21 (the F1 pension slots) carry the unconditional mark:** ⚠ prior engine output existed in project history — derivation shown in full; Fitz should hand-verify this slot.

## Independence statement — every file actually opened

1. `~/Downloads/CC-Prompt-Proposed-Pins.md` (the task prompt)
2. `~/Downloads/V2-Pinning-Worksheet.md` (the worksheet — sole source of all formula references)
3. `src/test/fixtures/v2-golden/F2.json` — via targeted `jq`: input paths, `auditPins`/`auditAssertions` literals (all `PIN_PENDING_FITZ`), `_notes` key names only
4. `src/test/fixtures/v2-golden/F4b.json` — same restriction
5. `src/test/fixtures/v2-golden/F3.json` — same restriction, plus `_notes.section121Partial` text and `clientState`
6. `src/test/fixtures/v2-golden/F1.json` — same restriction; DCA replay objects restricted to `hireDate`, `grantDate`, `separationDate`, `fmv`, and `tranches[].{id, vestDate, shares}`; stubs restricted to `{id, type, strikePrice}` — no saved computed fields were viewed
7. `src/lib/pensionValuation/effectiveDateConstants.js` (full — the seven verified IRS rows; allowed published data)
8. `src/lib/pensionValuation/mortalityTables/irs_417e_2026.js` (full — the 2026 unisex p_x table; allowed published data; also regex-parsed by the calculator script as data, never imported or executed)

Directory listings taken of `src/test/fixtures/v2-golden/` and `src/lib/pensionValuation/mortalityTables/`. **Not opened:** the `*.fieldProvenance.json` sidecars, `a1Runner.js`, `goldenFixtures.smoke.test.js`, `seedFixtureStores.js`, anything else under `src/lib` or `src/components`, any test file, any PR body or log.

All fixture input values re-quoted below were checked against the worksheet's tables; they match exactly. One extra fact found in the fixture and noted where relevant: F1 `supportEstimator.inputs.numChildren = 1` (unused by the AAML spousal formula).

## Conventions used in every derivation

- Python floats are IEEE-754 doubles, the same arithmetic JS uses; identical expressions produce identical doubles. `Math.round` emulated as `floor(x + 0.5)` (every rounded quantity here is non-negative); `round2(n) = floor(n×100 + 0.5)/100`.
- Day counts via Python `datetime.date` subtraction (proleptic Gregorian) — equivalent to the DCA engine's epoch-milliseconds arithmetic on ISO UTC midnights.
- `monthsBetween(d1, d2)` per the worksheet's documented rule: `(y2−y1)×12 + (m2−m1)`, **+1 unless d2 falls on the 1st** (trailing partial month counts as one full month).
- `yearsBetween(d1, d2) = (y2−y1) + (m2−m1)/12 + (d2−d1)/365.25`.
- Whole-dollar values are half-up rounded; where a block's class is "engine float; D-V2-5 whole-dollar at render," the PROPOSED PIN is given at whole-dollar and the exact double is shown beside it. For the two `x^y` evaluations (Slots 20/21), Python and JS `pow` may differ in the final ulp; both pins sit far from a rounding boundary (.34 and .61), so the whole-dollar values are robust.
- Full calculator script and raw output: Appendices A and B.

---

# F2 — "Partial Park" (VA)

## Slot 1 of 21 — `F2.json → auditPins.s2NetIncomeDerivationFromPayStub`

Worksheet block: Slot 1 (§2 net-income derivation from pay stub, incl. SS-cap behavior).

**Inputs** (`F2.json → stores["clearpath-m3-store"].payStubDecoder.inputs`):

| JSON path | Value |
|---|---|
| `.payFrequency` | `"semimonthly"` |
| `.useCustomPaychecks` | `false` → paychecks = `PAY_FREQUENCY_DEFAULTS.semimonthly` = 24 |
| `.grossPayPerCheck` | `7800` |
| `.deductions[id=fedTax].perPaycheck` | `1130` |
| `.deductions[id=stateTax].perPaycheck` | `372` |
| `.deductions[id=socialSecurity].perPaycheck` | `483.6` |
| `.deductions[id=medicare].perPaycheck` | `113.1` |
| `.deductions[id=medical].perPaycheck` | `210` |
| `.deductions[id=dental].perPaycheck` | `22` |
| `.deductions[id=401k].perPaycheck` | `980` |
| `.otherIncomeSources` | `[]` |

Fixture deduction rows carry only `{id, perPaycheck}`; voluntary flags come from the store defaults — only `401k` is voluntary (worksheet, `m3Store.js:104-110`).

**Formula** (worksheet, `m3Store.js:419-480`): `grossMonthly = round2(gross × 24 / 12)`; per-deduction `monthly = round2(perPaycheck × 24 / 12)`; `requiredMonthly = round2(Σ non-voluntary)`; `voluntaryMonthly = round2(Σ voluntary)`; `totalDeductions = round2(required + voluntary)`; `netMonthly = round2(gross − total)`; `takeHomePay = round2(netMonthly + voluntary)`. **The §2 figure is `takeHomePay`** (component maps `netMonthlyIncome: r.takeHomePay`).

**Substitution** (× 24 / 12 = × 2; all `round2` results exact at cents):

| row | perPaycheck | monthly |
|---|---|---|
| fedTax | 1130 | 2260.00 |
| stateTax | 372 | 744.00 |
| socialSecurity | 483.6 | 967.20 |
| medicare | 113.1 | 226.20 |
| medical | 210 | 420.00 |
| dental | 22 | 44.00 |
| 401k (voluntary) | 980 | 1960.00 |

- `grossMonthly = round2(7800 × 24 / 12)` = **15600.00**
- `requiredMonthly = round2(2260 + 744 + 967.2 + 226.2 + 420 + 44)` = **4661.40**
- `voluntaryMonthly` = **1960.00**; `totalDeductionsMonthly = round2(4661.4 + 1960)` = **6621.40**
- `netMonthly = round2(15600 − 6621.4)` = **8978.60**
- `takeHomePay = round2(8978.6 + 1960)` = **10938.60** (algebra check: gross − required = 15600 − 4661.4 = 10938.6 ✓)

**SS-cap behavior (warning-only, arithmetic unchanged):** gross annual = 7,800 × 24 = 187,200 > `SS_WAGE_CAP` 168,600 → warning path fires; the deduction stays at the stub's 483.60/check. (Also: 401(k) annual 980 × 24 = 23,520 > 23,500 → that warning fires too; equally non-arithmetic.)

Rounding: exact `round2` chain result (cents).

PROPOSED PIN: 10938.6

## Slot 2 of 21 — `F2.json → auditPins.budgetGapMonthlyFigure`

Worksheet block: Slot 2 (budget-gap figure).

**Inputs** (`F2.json → stores["m1-store"].budgetGap.inputs`):

| JSON path | Value |
|---|---|
| `.grossIncome` | `7800` |
| `.payFrequency` | `"semimonthly"` |
| `.expectedShare` | `100` |
| `.housing` / `.utilities` / `.groceries` / `.transportation` | `2750` / `310` / `720` / `410` |
| `.healthInsurance` / `.childcare` / `.debtPayments` / `.personal` | `520` / `0` / `540` / `380` |

**Formula** (worksheet, `BudgetGapCalculator.jsx`): semimonthly → `monthlyGross = gross × 2`; `adjusted = monthlyGross × (expectedShare/100)`; `totalExpenses = Σ` eight fields; `monthlyGap = adjusted − totalExpenses`; persisted as `Math.round(gap × 100)/100`.

**Substitution:** `monthlyGross = 7800 × 2 = 15600`; `adjusted = 15600 × 1.0 = 15600`; `totalExpenses = 2750+310+720+410+520+0+540+380 = 5630`; `monthlyGap = 15600 − 5630 = 9970`; persist: `Math.round(997000)/100 = 9970` (integer-exact, no float residue).

PROPOSED PIN: 9970

## Slot 3 of 21 — `F2.json → auditPins.s3InventoryTotalsFooting`

Worksheet block: Slot 3 (§3 totals footing — live A1 recomputer, strict `===`). Rule: sum `currentValue` over `maritalEstateInventory.items` whose category ∉ `{loans, creditCards, otherDebt}`, plus every personal-property item at `currentValue × quantity`; `outstandingBalance` ignored.

**Addends** (`F2.json → stores["m2-store"]`):

| JSON path | category | value | in footing |
|---|---|---|---|
| `maritalEstateInventory.items[0]` (workingCapital-f2chk) | workingCapital | 28000 | ✓ |
| `maritalEstateInventory.items[1]` (workingCapital-f2sav) | workingCapital | 41000 | ✓ |
| `maritalEstateInventory.items[2]` (otherAssets-f2car) | otherAssets | 24000 | ✓ (its `outstandingBalance: 11500` ignored) |
| `maritalEstateInventory.items[3]` (loans-f2auto) | loans | 11500 | ✗ liability |
| `maritalEstateInventory.items[4]` (creditCards-f2cc) | creditCards | 9500 | ✗ liability |
| `personalPropertyInventory.rooms[0].items[0]` (pp-homeoffice-f2a) | (PP) | 1400 × 1 | ✓ |
| `personalPropertyInventory.highValueItems` | — | empty | n/a |

**Substitution:** 28000 + 41000 + 24000 + 1400 = **94400**. Exact integer.

PROPOSED PIN: 94400

---

# F4b — "Minimal May+" (VA)

## Slot 4 of 21 — `F4b.json → auditPins.s3InventoryTotalsFooting`

Worksheet block: Slot 4 (same live recomputer and rule as Slot 3).

**Addends** (`F4b.json → stores["m2-store"]`):

| JSON path | category | value | in footing |
|---|---|---|---|
| `maritalEstateInventory.items[0]` (workingCapital-f4bchk) | workingCapital | 12000 | ✓ |
| `maritalEstateInventory.items[1]` (creditCards-f4bcc) | creditCards | 6800 | ✗ liability |
| `personalPropertyInventory.rooms[0].items[0]` (pp-livingroom-f4ba) | (PP) | 900 × 1 | ✓ |
| `personalPropertyInventory.highValueItems` | — | empty | n/a |

**Substitution:** 12000 + 900 = **12900**. Exact integer.

PROPOSED PIN: 12900

## Slot 5 of 21 — `F4b.json → auditAssertions.readinessTierBoundaryValue` (categorical)

Worksheet block: Slot 5 (readiness tier boundary). The slot lives in the **`auditAssertions` lane** in the fixture on disk (observed; `auditPins` for F4b holds only the footing). Per the task prompt, this is one of the two categorical slots and pins as a label string — the worksheet's string-reds-smoke ⚠ described the pre-#70 `auditPins` lane.

**Inputs** (`F4b.json → stores["m1-store"].readinessAssessment.answers`): all ten of `q1…q10` carry `score: 2`.

**Derivation:** `totalScore = Σ scores = 10 × 2 = 20`. The as-implemented rule, source quote (worksheet-quoted verbatim from `ReadinessAssessment.jsx:103-107`):

```js
function classify(totalScore) {
  if (totalScore <= 10) return 'exploring';
  if (totalScore <= 20) return 'preparing';
  return 'ready';
}
```

20 ≤ 20 → the second branch fires → **`'preparing'`** (ON the cut, by design; the boundary score itself is 20 if a numeric companion is ever wanted).

PROPOSED PIN: "preparing"

---

# F3 — "Edge Ellis" (DC) — non-pension

## Slot 6 of 21 — `F3.json → auditPins.s121PartialExclusionAmount`

Worksheet block: Slot 6, **as amended by the task prompt** (post-#70): reduced-cap rule `reducedCap = cap × min(ownershipMonths, useMonths)/24`, `exclusion = min(gain, reducedCap)`.

**Inputs:**

| JSON path | Value |
|---|---|
| `stores["clearpath-m5"].homeDecision.inputs.currentFMV` | `640000` |
| `…homeDecision.inputs.realtorCommissionPercent` | `0.05` |
| `…homeDecision.inputs.saleClosingCostsPercent` | `0.02` |
| `…homeDecision.inputs.expectedFilingStatusAtSellNow` | `"single"` → cap = 250,000 |
| `…homeDecision.inputs.homeAcquisitionYear` | `2025` (year precision only) |
| `…homeDecision.inputs.userMovedOutYearsAgo` | `0.5` |
| `…homeDecision.inputs.occupancyYears` | `3` |
| `stores["clearpath-blueprint"].costBasisEntries[0].costBasis` | `525000` (`isPrimaryResidence: true`, `fmv: 640000`) |
| `stores["clearpath-blueprint"].costBasisFilingStatus` | `"single"` |
| case date (`stores["clearpath-m5"].supportEstimator.inputs.caseEffectiveDate`, also on the pension asset) | `"2026-06-01"` — `homeDecision.inputs` carries no date of its own |

**Gain, per the engine's definition** (worksheet: basis subtracts from costs-reduced proceeds, NOT raw FMV):

- `grossSaleProceeds = 640000 × (1 − 0.05 − 0.02)`; in doubles `(1 − 0.05 − 0.02) = 0.9299999999999999`, and `640000 × 0.9299999999999999 = 595200.0` exactly
- `gainAtSale = 595200 − 525000 = 70200.0` exactly
- Use test (binary gate): `max(0, 5 − 0.5) = 4.5 ≥ 2` → passes

**Months derivation from the fixture's dates.** The fixture gives ownership only at year precision (`homeAcquisitionYear: 2025`) and the sale is "sell-now" at a 2026 case date (2026-06-01); use is implied by `occupancyYears: 3` ending `userMovedOutYearsAgo: 0.5` before sale. Fixture note verbatim (`_notes.section121Partial`): "Acquisition year 2025 → ownership < 2 years at a 2026 sale; movedOut 0.5 also stresses the use test … → §121 PARTIAL exclusion arithmetic … per the sold-then-bought narrative."

| reading | ownershipMonths | useMonths | min | reducedCap = 250000 × min/24 | exclusion = min(gain, reducedCap) |
|---|---|---|---|---|---|
| month-precision, Jan-1 anchor (2025-01-01 → 2026-06-01) | 17 | 11 (within-ownership) or 36 (occupancyYears) | 11–17 | 114,583.33 – 177,083.33 | **70,200** |
| coarse year-arithmetic (2026 − 2025 = 1 yr) | 12 | 12 − 6 = 6 | 6 | 62,500.00 | **62,500** |
| v1 caps-only chain (worksheet block as originally written) | — | — | — | 250,000 full cap | **70,200** |

The cap binds only when `min(ownershipMonths, useMonths) ≤ 6` (threshold: 70200 × 24 / 250000 = 6.7392 months). Every day- or month-precision reading of these inputs gives min ≥ 7 → exclusion = gain; only the single coarsest whole-year reading flips it.

**AMBIGUOUS:** the fixture's year-grade ownership input does not determine `ownershipMonths`/`useMonths` exactly. Reading (a) — any month-precision derivation, and equally the v1 caps-only chain — gives **70200** (exact double `70200.0`; whole-dollar 70,200). Reading (b) — whole-year arithmetic — gives **62500**. The line below records the robust candidate; Fitz adjudicates the months convention against the as-built engine.

PROPOSED PIN: 70200

## Slot 7 of 21 — `F3.json → auditPins.builtaExtrapolatedFigure`

Worksheet block: Slot 7 (Builta extrapolated figure). Task prompt: "derive the monthly figure and say so" — **this pin is the MONTHLY figure.**

**Inputs** (`F3.json → stores["clearpath-m5"].supportEstimator.inputs`):

| JSON path | Value |
|---|---|
| `.partyA.grossMonthly` | `7250` |
| `.partyB.grossMonthly` | `14583` |
| `.partyA.imputeIncome` / `.partyB.imputeIncome` | `false` / `false` |
| `.numChildren` | `2` → childColumnIndex 2 |
| `.state` | `"DC"` |
| `.temporal` | `"pendente_lite"` |

Published-data rows (worksheet-quoted from `dcChildSupport.js`): `INCOME_CAP = 240000`; last two schedule rows `[239400, 32986, 43343, 47536, 53332]` and `[240000, 33051, 43423, 47621, 53429]`.

**Formula** (worksheet-quoted `computeHollandExtrapolation`): `slope = (last[2] − prev[2])/(last[0] − prev[0])`; `annual = last[2] + (combinedAnnual − 240000) × slope`; orchestrator monthly surface `hollandExtrapolation = annual / 12`, with `Math.round` applied at the obligation conversion sites.

**Substitution:**

- `combinedAnnual = (7250 + 14583) × 12 = 21833 × 12 = 261,996` > 240,000 → extrapolation path
- `slope = (43423 − 43343)/(240000 − 239400) = 80/600` = `0.13333333333333333`
- `excess = 261996 − 240000 = 21,996`; `excess × slope = 2932.8` (exact double)
- `annual = 43423 + 2932.8 = 46355.8` (exact double)
- monthly raw: `46355.8 / 12 = 3862.9833333333336`; conversion-site `Math.round` → **3863**

**AMBIGUOUS (rounding/surface only — the monthly convention itself is per the prompt):** the worksheet exposes two monthly surfaces. Reading (a): conversion-site rounding (`:498-512`) applied to the monthly pin → **3863** (the worksheet's "conversion-site rounding … if you pin monthly" instruction; recorded on the line below). Reading (b): the orchestrator's raw `hollandExtrapolation = hollandAnnual/12` field → **3862.9833333333336**. Annual reference value, both readings: 46,355.80. Fitz adjudicates which surface the Phase-2 recomputer will target; the convention pinned here is **monthly, conversion-site rounded**.

PROPOSED PIN: 3863

---

# F1 — "Complete Carter" (MD) — non-pension

## Slot 8 of 21 — `F1.json → auditPins.hugTrancheValue`
## Slot 9 of 21 — `F1.json → auditPins.nelsonTrancheValue`

Worksheet block: Slots 8/9 (one Hug and one Nelson tranche value — both on `tranche_f1_r2`, the only tranche where the formulas diverge).

**Inputs** (`F1.json → replays.dcaAnalyses[1].analysis` — the RSU grant, stub `dcs_f1_rsu`; values are strings in the fixture, engine `Number()`s them):

| JSON path | Value |
|---|---|
| `.hireDate` | `"1998-04-01"` |
| `.grantDate` | `"2018-03-15"` |
| `.separationDate` | `"2026-03-31"` |
| `.fmv` | `"61.00"` |
| `.tranches[1]` (`tranche_f1_r2`) | `vestDate "2027-03-15"`, `shares "600"` |
| `stores["clearpath-blueprint"].deferredCompStubs[id=dcs_f1_rsu].strikePrice` | `null` → RSU: value = shares × fmv |

Vested-tranche check (fraction 1 under both formulas, so not the divergent pins): `tranche_f1_o1` vest 2012-05-01 ≤ separation ✓, `tranche_f1_o2` vest 2014-05-01 ✓, `tranche_f1_r1` vest 2021-03-15 ✓. Only `tranche_f1_r2` (vest 2027-03-15 > separation 2026-03-31) is unvested at separation.

**Formula** (worksheet, `coverture.js`): `fraction = days(startDate → min(separation, vest)) / days(startDate → vest)`, epoch-day arithmetic, clamp [0,1]; Hug `startDate = hireDate`, Nelson `startDate = grantDate`; `maritalShares = Math.round(shares × fraction)`; RSU value = `maritalShares × fmv`.

**Substitution — exact day counts** (Python `date` subtraction ≡ epoch-ms; hand-checked against leap-day counting: 7 leap days 2000–2024 in the hire span, 2 in the grant span):

Slot 8, Hug:
- numerator: 1998-04-01 → 2026-03-31 = **10,226 days**; denominator: 1998-04-01 → 2027-03-15 = **10,575 days**
- `fraction = 10226/10575 = 0.9669976359338062`
- `600 × fraction = 580.1985815602837` → `Math.round` → **580 marital shares**
- value = 580 × 61.00 = **35,380** (integer-exact)

Slot 9, Nelson:
- numerator: 2018-03-15 → 2026-03-31 = **2,938 days**; denominator: 2018-03-15 → 2027-03-15 = **3,287 days**
- `fraction = 2938/3287 = 0.8938241557651354`
- `600 × fraction = 536.2944934590812` → `Math.round` → **536 marital shares**
- value = 536 × 61.00 = **32,696** (integer-exact)

PROPOSED PIN: 35380

(Slot 8, Hug.)

PROPOSED PIN: 32696

(Slot 9, Nelson.)

## Slot 10 of 21 — `F1.json → auditPins.hdaScenarioBNetProceedsAfter121`

Worksheet block: Slot 10 (HDA Scenario B = sell-now net proceeds after §121).

**Inputs:**

| JSON path | Value |
|---|---|
| `stores["clearpath-m5"].homeDecision.inputs.currentFMV` | `850000` |
| `…homeDecision.inputs.existingMortgageBalance` | `310000` |
| `…homeDecision.inputs.realtorCommissionPercent` | `0.05` |
| `…homeDecision.inputs.saleClosingCostsPercent` | `0.02` |
| `…homeDecision.inputs.spouseEquityShare` | `0.5` |
| `…homeDecision.inputs.expectedFilingStatusAtSellNow` | `"single"` → cap 250,000 |
| `…homeDecision.inputs.userMovedOutYearsAgo` | `0` |
| `…homeDecision.inputs.homeAcquisitionYear` | `2008`; `occupancyYears: 6` |
| `stores["clearpath-blueprint"].costBasisEntries[0].costBasis` | `660000` (`isPrimaryResidence: true`) |
| `stores["clearpath-blueprint"].costBasisFilingStatus` | `"single"` |

(`startingLiquidCash: 260000` feeds horizon wealth lines, not this figure.)

**Formula** (worksheet, `calculateSellNow`): `gross = FMV × (1 − 0.05 − 0.02)`; `netEquity = gross − mortgage`; `gain = gross − costBasis`; use test; §121 exclusion; `tax = taxableGain × 0.15`; **pin** `saleProceedsNet = (1 − spouseEquityShare) × netEquity − tax`.

**Substitution:**

- `gross = 850000 × 0.9299999999999999 = 790500.0` exactly
- `netEquity = 790500 − 310000 = 480500.0`
- `gainAtSale = 790500 − 660000 = 130500.0` (engine definition: basis off costs-reduced proceeds; the fixture note's "850,000 − 660,000 = 190,000" is FMV shorthand for the narrative)
- Use test: `max(0, 5 − 0) = 5 ≥ 2` → passes. §121(c) reduced-cap check (post-#70): ownership from acquisition 2008 and use of 6 years both ≥ 24 qualifying months → `min(…, 24)/24 = 1` → full single cap 250,000 — full-exclusion path on every reading
- `excludedAmount = min(130500, 250000) = 130500`; `taxableGain = 0`; `tax = 0 × 0.15 = 0`
- `saleProceedsNet = (1 − 0.5) × 480500 − 0 = 240250.0` exactly

Rounding: engine float is exactly 240250.0; D-V2-5 whole-dollar at render.

PROPOSED PIN: 240250

## Slot 11 of 21 — `F1.json → auditPins.mdAamlSupportFigure`

Worksheet block: Slot 11 (MD AAML support figure).

**Inputs** (`F1.json → stores["clearpath-m5"].supportEstimator.inputs`):

| JSON path | Value |
|---|---|
| `.partyA.grossMonthly` | `7908` |
| `.partyB.grossMonthly` | `26667` |
| `.partyA.imputeIncome` / `.partyB.imputeIncome` | `false` / `false` |
| `.state` / `.temporal` | `"MD"` / `"post_divorce"` |
| `.marriageLengthYears` | `24` |
| (`.numChildren` | `1` — present in fixture, unused by the AAML spousal formula) |

**Payor mapping** (worksheet): effective gross = grossMonthly (no imputation); `payorIsPartyA = 7908 >= 26667` → false → **payor = partyB (26,667), payee = partyA (7,908)**.

**Formula** (worksheet, `aaml-spousal.js`, coefficients 0.30 / 0.20 / 0.40; MD delegates unrounded):

```
calcA     = 0.30 × 26667 − 0.20 × 7908
calcB_cap = 0.40 × (26667 + 7908) − 7908
monthly   = max(0, min(calcA, calcB_cap))
```

**Substitution (exact doubles):**

- `0.30 × 26667 = 8000.099999999999`; `0.20 × 7908 = 1581.6000000000001` → `calcA = 6418.499999999999`
- `0.40 × 34575 = 13830.0` → `calcB_cap = 13830 − 7908 = 5922.0` (exact)
- `monthly = max(0, min(6418.499999999999, 5922.0)) = 5922.0` — the cap binds; the engine float is exactly 5922.0, no residue

PROPOSED PIN: 5922

## Slot 12 of 21 — `F1.json → auditAssertions.mdAamlDurationBand` (categorical)

Worksheet block: Slot 12 (MD AAML duration band). The slot lives in the **`auditAssertions` lane** in the fixture on disk (observed); per the task prompt it pins as a label string — the worksheet's string/null/Infinity ⚠ described the pre-#70 `auditPins` lane.

**Inputs:** `.marriageLengthYears = 24`, `.temporal = "post_divorce"` (paths as Slot 11).

**Derivation:** source quote (worksheet-quoted verbatim from `aaml-spousal.js:44-49`):

```js
if (marriageLengthYears < 3) return { multiplier: 0.30, label: '0-3 years' };
if (marriageLengthYears < 10) return { multiplier: 0.50, label: '3-10 years' };
if (marriageLengthYears < 20) return { multiplier: 0.75, label: '10-20 years' };
return { multiplier: null, label: '20+ years (permanent)' };
```

24 ≥ 20 → falls through to the final return → label **`'20+ years (permanent)'`** (multiplier null; MD wraps as advisory with `minMonths = Math.round(24 × 12) = 288`, `maxMonths = Infinity` — 288 is the finite-number companion if ever needed).

PROPOSED PIN: "20+ years (permanent)"

## Slot 13 of 21 — `F1.json → auditPins.fsoFilingStatusDelta`

Worksheet block: Slot 13 (FSO delta between filing statuses; tax year 2026, Rev. Proc. 2025-32 tables as quoted in the worksheet).

**Inputs** (`F1.json → stores["clearpath-m4"].filingStatusOptimizer.inputs`):

| JSON path | Value |
|---|---|
| `.grossAnnualIncome` | `94900` |
| `.spouseGrossAnnualIncome` | `320000` (MFJ-only figure — MFJ ineligible here, unused) |
| `.otherIncome` | `0` |
| `.dependents` | `1` |
| `.hasQualifyingChild` | `true` |
| `.paidMoreThanHalfHouseholdCosts` | `true` |
| `.separatedLastSixMonths` | `false` |
| `.divorceTimeline` | `"beforeDec31"` |

**Eligibility** (worksheet): `beforeDec31` → divorced → **mfj, mfs ineligible; single eligible; hoh eligible** (qualifying child ✓ and >half household costs ✓).

**Formula:** `taxableIncome = max(0, 94900 + 0/2 − SD[status])`; progressive tax over the quoted brackets, rounded to cents; `netTax = max(0, tax − dependents × 2200)`; **pin = worst-eligible netTax − best-eligible netTax**.

**Substitution — single** (SD 16,100 → taxable 78,800):

| bracket | width × rate | tax |
|---|---|---|
| 10% to 12,400 | 12,400 × .10 | 1,240.00 |
| 12% to 50,400 | 38,000 × .12 | 4,560.00 |
| 22% to 105,700 | 28,400 × .22 | 6,248.00 |
| **federal tax** | | **12,048.00** (exact; cents-round is a no-op) |

`netTax(single) = max(0, 12048 − 2200) = 9,848.00`

**Substitution — hoh** (SD 24,150 → taxable 70,750):

| bracket | width × rate | tax |
|---|---|---|
| 10% to 17,700 | 17,700 × .10 | 1,770.00 |
| 12% to 67,450 | 49,750 × .12 | 5,970.00 |
| 22% to 105,700 | 3,300 × .22 | 726.00 |
| **federal tax** | | **8,466.00** (exact) |

`netTax(hoh) = max(0, 8466 − 2200) = 6,266.00`

**Delta:** `maxSavings = 9848 − 6266 = 3582.0` (exact; hoh is best, single is worst).

PROPOSED PIN: 3582

## Slot 14 of 21 — `F1.json → auditPins.s3InventoryTotalFooting`

Worksheet block: Slot 14 (§3 inventory total footing — live recomputer, strict `===`; F1 spells it `…TotalFooting`).

**Addends** (`F1.json → stores["m2-store"]`):

| JSON path | category | value | in footing |
|---|---|---|---|
| `maritalEstateInventory.items[0]` (realEstate-f1home) | realEstate | 850000 | ✓ (`outstandingBalance: 310000` ignored) |
| `maritalEstateInventory.items[1]` (pensions-f1db) | pensions | 0 | ✓ (zero by design — valued in M5 PVA) |
| `maritalEstateInventory.items[2]` (retirement-f1c401k) | retirement | 410000 | ✓ |
| `maritalEstateInventory.items[3]` (workingCapital-f1brok) | workingCapital | 220000 | ✓ |
| `maritalEstateInventory.items[4]` (workingCapital-f1chk) | workingCapital | 40000 | ✓ |
| `maritalEstateInventory.items[5]` (creditCards-f1visa) | creditCards | 9800 | ✗ liability |
| `personalPropertyInventory.rooms[0].items[0]` (pp-livingroom-f1a) | (PP) | 2200 × 1 | ✓ |
| `personalPropertyInventory.highValueItems[0]` (pp-jewelry-f1a) | (PP) | 4500 × 1 | ✓ |

**Substitution:** 850000 + 0 + 410000 + 220000 + 40000 + 2200 + 4500 = **1,526,700**. Exact integer.

PROPOSED PIN: 1526700

---

# F3 — pension slots

## Slot 15 of 21 — `F3.json → auditPins.covertureFraction14Months`

Worksheet block: Slot 15 (coverture fraction, 4dp + months/months display).

**Inputs** (`F3.json → stores["clearpath-m5"].pensionValuation.assets["pensions-f3cb"].inputs`):

| JSON path | Value |
|---|---|
| `.dateOfHire` | `"2021-06-01"` |
| `.dateOfMarriage` | `"2022-01-10"` |
| `.maritalCutoffDate` | `"2023-03-10"` |
| `.participantDOB` | `"1979-05-20"` |
| `.expectedRetirementAge` | `67` |
| `.applyCoverture` | `true` |

**Formula** (worksheet, shared §7.4.3a utility): `retirement = addYears(DOB, 67)` month/day preserved → **2046-05-20**; `start = max(hire, marriage)`; `end = min(cutoff, retirement)`; `monthsBetween(d1,d2) = (y2−y1)×12 + (m2−m1), +1 unless d2 is on the 1st`; `fraction = monthsBetween(start, end) / monthsBetween(hire, retirement)`, clamped [0,1].

**Substitution:**

- `start = max(2021-06-01, 2022-01-10) = 2022-01-10`; `end = min(2023-03-10, 2046-05-20) = 2023-03-10`
- numerator = `monthsBetween(2022-01-10, 2023-03-10)` = (2023−2022)×12 + (3−1) = 14; end day 10 ≠ 1 → **+1 → 15**
- denominator = `monthsBetween(2021-06-01, 2046-05-20)` = (2046−2021)×12 + (5−6) = 299; end day 20 ≠ 1 → **+1 → 300**
- `fraction = 15/300 = 0.05` exactly (full-precision double: `0.05`); **4dp pin class → 0.0500**; months/months display 15/300

**⚠ Rule-vs-note conflict — flagged, not absorbed.** The fixture note narrates the window as "exactly 14 months" (2022-01-10 → 2023-03-10 is 14 calendar months), but the documented `monthsBetween` rule is day-insensitive with the trailing +1, giving numerator 15 and denominator 300. I pinned per the documented rule — the same engine-over-narrative precedent the worksheet itself sets at Slots 6/10/17/18 — and the note's own "4dp boundary rendering exerciser" purpose corroborates it (0.05 must render as "0.0500"). If the as-built `monthsBetween` instead counts complete calendar months, the candidates become 14/299 = **0.0468** (or 14/300 = **0.0467**); Slot 16's value moves in lockstep (see below). Carry to the architect.

PROPOSED PIN: 0.0500

## Slot 16 of 21 — `F3.json → auditPins.cashBalancePassThroughPV`

Worksheet block: Slot 16 (cash-balance PV — pass-through per `pva_cashbalance_passthrough_v1`).

**Inputs:** `.currentAccountBalance = 68000` plus the Slot-15 coverture inputs (same JSON paths). `.cola = 2` and `.discountRateBps = 5234` are present but **inert on this path** (no discounting, no mortality; bps is a legacy echo since PR #69).

**Formula** (worksheet): `pvBase = currentAccountBalance` (no discounting); **pin = pvMarital = pvBase × coverture.fraction** using the UNROUNDED Slot-15 quotient.

**Substitution:** `pvMarital = 68000 × (15/300) = 68000 × 0.05 = 3400.0` exactly (clean double). Whole-dollar D-V2-5 class → **3400**.

If Fitz adjudicates Slot 15 to the complete-months reading: `68000 × 14/299 = 3183.9464882943143` → 3184 (or `68000 × 14/300 = 3173.3333333333335` → 3173).

PROPOSED PIN: 3400

## Slot 17 of 21 — `F3.json → auditPins.sensitivityLowMinus100bp`
## Slot 18 of 21 — `F3.json → auditPins.sensitivityHighPlus100bp`

Worksheet block: Slots 17/18 (±100bp sensitivity). **As-implemented engine truth:** the cash-balance sensitivity bracket is degenerate by design — `pv.low = pv.high = pv.best` (balance fixed at statement date; no rate enters this path at all). Pass-through arithmetic, all three shown equal:

- `pv.best (Slot 16) = 3400`
- `pv.low (Slot 17) = 3400`
- `pv.high (Slot 18) = 3400`

These pin the marital row matching Slot 16's computation (the prompt's "low = high = best, all three shown equal"); if the slots were ever meant to target the `pv.total` rows instead, the degenerate value there is 68,000 — for the architect, not the pin. The fixture note `_notes.sensitivityBounds` ("computed at both bounds around discountRateBps 5234 … remain distinguishable at whole-dollar rounding") describes tier-engine behavior F3 does not exercise and is stale on two counts (worksheet header: bps inert since PR #69; cash-balance path rate-free) — carried to the architect below.

PROPOSED PIN: 3400

(Slot 17, low / −100bp.)

PROPOSED PIN: 3400

(Slot 18, high / +100bp.)

---

# F1 — pension slots (computed blind, last, per the worksheet's warning)

> ⚠ All three slots: prior engine output existed in project history — derivation shown in full; Fitz should hand-verify this slot. (Computed from first principles only; no PR #69 table, prior report, or engine output was consulted. The only contamination-adjacent item in context was the relative "−1.9%" figure disclosed in the header.)

## Slot 19 of 21 — `F1.json → auditPins.covertureFractionPensionTranche`

Worksheet block: Slot 19 (coverture fraction, months/months, 4dp).

**Inputs** (`F1.json → stores["clearpath-m5"].pensionValuation.assets["pensions-f1db"].inputs`):

| JSON path | Value |
|---|---|
| `.dateOfHire` | `"1998-04-01"` |
| `.dateOfMarriage` | `"2002-06-15"` |
| `.maritalCutoffDate` | `"2026-03-31"` |
| `.participantDOB` | `"1971-08-22"` |
| `.expectedRetirementAge` | `65` |

**Formula:** tier-3 coverture, same `monthsBetween` rule as Slot 15 (calendar-months +1 rule — NOT the DCA engine's day arithmetic). `retirement = addYears(1971-08-22, 65) = 2036-08-22`.

**Substitution:**

- `start = max(1998-04-01, 2002-06-15) = 2002-06-15`; `end = min(2026-03-31, 2036-08-22) = 2026-03-31`
- numerator = `monthsBetween(2002-06-15, 2026-03-31)` = (2026−2002)×12 + (3−6) = 288 − 3 = 285; end day 31 ≠ 1 → **+1 → 286**
- denominator = `monthsBetween(1998-04-01, 2036-08-22)` = (2036−1998)×12 + (8−4) = 456 + 4 = 460; end day 22 ≠ 1 → **+1 → 461**
- `fraction = 286/461 = 0.6203904555314533` (full precision) → **4dp pin class → 0.6204**; months/months display 286/461

(Unlike Slot 15, both end dates here fall mid-month with real partial months trailing, so the +1 rule and a complete-months reading agree on 286 — no rule-vs-note tension; the unrounded quotient feeds Slot 21.)

PROPOSED PIN: 0.6204

## Slot 20 of 21 — `F1.json → auditPins.pensionPVAtBaseSegmentRate`

Worksheet block: Slot 20 (PV at base segment rate ↔ `pv.total.best`; blocker cleared 2026-06-10 per worksheet header — pension pins are GO).

**Inputs** (same asset as Slot 19):

| JSON path | Value |
|---|---|
| `.currentAccruedMonthlyBenefit` | `4100` (monthly, frozen at valuation) |
| `.caseEffectiveDate` | `"2026-06-01"` (valuation date) |
| `.participantDOB` | `"1971-08-22"` |
| `.expectedRetirementAge` | `65` |
| `.mortalityTable` | `"irs_417e"` → `irs_417e_2026.js` (IRS Notice 2025-40, 2026 unisex p_x, ages 0–119, p_119 = 0) |
| `.cola` | `0` |
| `.discountRateBps` | `5234` — INERT legacy echo, not used |

**Rate resolution (published data, `effectiveDateConstants.js`):** most recent published month ≤ valuation 2026-06-01 is **2026-04 → segment2Pct 5.34 (Notice 2026-31)**; applied annual discount `r = 5.34/100` (double: `0.053399999999999996`). The seven seeded rows in the file match the worksheet's quoted table verbatim.

**Formula** (worksheet, `calculateTier3Coverture` + `computeAnnuityFactor`):

1. `participantAgeToday = yearsBetween(1971-08-22, 2026-06-01)` = (2026−1971) + (6−8)/12 + (1−22)/365.25 = 55 − 0.16666666666666666 − 0.057494866529774126 = **54.77583846680356**
2. `yearsToRetirement = max(0, 65 − 54.77583846680356) = 10.224161533196437`
3. Annuity-factor age = 65 (yearsToRetirement > 0)
4. `ä65 = Σ_{k=0, 65+k<120} S_k / (1+r)^k` (annual annuity-due; cola 0 so the `(1+cola)^k` factor is 1; Woolhouse monthly correction NOT applied, per [R5a-2]); `S_0 = 1`, `S_{k+1} = S_k × p_{65+k}`; k runs 0…54
5. `deferralFactor = (1+r)^(−10.224161533196437) = 0.5874924745017587`
6. **PV = 4100 × 12 × ä65 × deferralFactor**

**Annuity factor — computed twice by independent passes (prompt requirement):**

- PASS A (forward survival-chain summation): **ä65 = 12.66147832840924**
- PASS B (separately-built l_x table, l_65 = 1, l_{x+1} = l_x·p_x, then Σ (l_{65+k}/l_65)·v^k): **ä65 = 12.661478328409236**
- |difference| = 3.6e-15 — **agreement far inside 6 decimals ✓**

Survival-chain summary (PASS A; p_x from the table — spot-checks p65 = 0.99271, p90 = 0.86888, p118 = 0.50005, p119 = 0):

| k | age | S_k | v^k | term S_k·v^k |
|---|---|---|---|---|
| 0 | 65 | 1.000000 | 1.000000 | 1.000000 |
| 1 | 66 | 0.992710 | 0.949307 | 0.942387 |
| 2 | 67 | 0.984580 | 0.901184 | 0.887287 |
| 5 | 70 | 0.955191 | 0.770963 | 0.736417 |
| 10 | 75 | 0.883086 | 0.594384 | 0.524892 |
| 15 | 80 | 0.765935 | 0.458248 | 0.350988 |
| 20 | 85 | 0.588188 | 0.353292 | 0.207802 |
| 25 | 90 | 0.360478 | 0.272375 | 0.098185 |
| 30 | 95 | 0.148622 | 0.209991 | 0.031209 |
| 35 | 100 | 0.036159 | 0.161895 | 0.005854 |
| 40 | 105 | 0.004495 | 0.124815 | 0.000561 |
| 45 | 110 | 0.000265 | 0.096228 | 0.000026 |
| 50 | 115 | 0.000009 | 0.074188 | 0.000001 |
| 54 | 119 | 0.000001 | 0.060251 | 0.000000 |

**Substitution:** `4100 × 12 = 49,200`; `49200 × 12.66147832840924 = 622,944.7337577346`; `× 0.5874924745017587 = 365,975.34311317076` → cents **365,975.34** → whole-dollar D-V2-5 pin class:

PROPOSED PIN: 365975

(Exact hand-computed figure 365,975.34; Python/JS `pow` may differ in the last ulp but the dollar value is robust.)

## Slot 21 of 21 — `F1.json → auditPins.covertureMaritalSharePensionTranche`

Worksheet block: Slot 21 (marital share ↔ `pv.marital.best` = Slot 20 × coverture fraction, UNROUNDED quotient from Slot 19).

**Substitution:** `365975.34311317076 × (286/461 = 0.6203904555314533) = 227,047.60982725993` → cents **227,047.61** → whole-dollar D-V2-5 pin class:

PROPOSED PIN: 227048

(Worksheet note retained: confirm the Slot 20 ↔ `pv.total.best` / Slot 21 ↔ `pv.marital.best` mapping against the Phase-2 recomputer when it lands; both numbers come out of the same hand computation above.)

---

## Flags to carry to the architect (not absorbed into any pin)

1. **Slot 6 months convention (AMBIGUOUS):** year-grade `homeAcquisitionYear` cannot fix `ownershipMonths` exactly; 70200 is robust across every month-precision reading (cap binds only at min-months ≤ 6.74), 62500 only under whole-year arithmetic. Also note the worksheet block's original "no partial arithmetic exists in v1" finding vs. the post-#70 reduced-cap rule — both chains give 70200 here.
2. **Slot 7 surface/rounding (AMBIGUOUS):** monthly pin recorded as conversion-site-rounded **3863**; raw orchestrator surface would be 3862.9833333333336 (annual 46,355.80). Phase-2 recomputer must target the same convention.
3. **Slot 15/16 fourteen-vs-fifteen:** documented `monthsBetween` (+1 trailing-partial rule) gives 15/300 = 0.0500 and 3400; the fixture note's "exactly 14 months" narrative would give 0.0468 (14/299) and 3184. Pinned per the documented rule; adjudicate against the as-built utility.
4. **Slots 17/18:** `_notes.sensitivityBounds` is stale twice over (bps inert since PR #69; cash-balance path has no rate, bracket degenerate). If the design wants a live ±100bp exerciser, F3 needs a discounting asset — fixture-design question.
5. **Categorical lane confirmation:** Slots 5/12 pinned as label strings in `auditAssertions` per the prompt; the smoke test was not opened (forbidden), so its current treatment of that lane was taken on the prompt's authority.
6. Numeric companions if ever needed: Slot 5 boundary score = 20; Slot 12 `minMonths` = 288.

---

## Appendix A — calculator script (verbatim)

Implements only the worksheet's documented formulas; imports nothing from the repo; reads `irs_417e_2026.js` as data via regex.

```python
import math, re
from datetime import date

def js_round(x):           # JS Math.round for x >= 0
    return math.floor(x + 0.5)
def round2(x):             # m3Store round2 = Math.round(n*100)/100
    return math.floor(x * 100 + 0.5) / 100

# Slot 1
paychecks = 24
grossMonthly = round2(7800 * paychecks / 12)
ded = [('fedTax',1130),('stateTax',372),('socialSecurity',483.6),('medicare',113.1),
       ('medical',210),('dental',22),('401k',980)]
monthly = {k: round2(v * paychecks / 12) for k, v in ded}
req = sum(monthly[k] for k in ['fedTax','stateTax','socialSecurity','medicare','medical','dental'])
requiredMonthly = round2(req); voluntaryMonthly = round2(monthly['401k'])
totalDed = round2(requiredMonthly + voluntaryMonthly)
netMonthly = round2(grossMonthly - totalDed)
takeHome = round2(netMonthly + voluntaryMonthly)          # 10938.6

# Slot 2
gap = 7800*2 * (100/100) - (2750+310+720+410+520+0+540+380)
persisted = js_round(gap*100)/100                          # 9970.0

# Slots 3 / 4 / 14
f2_foot  = 28000 + 41000 + 24000 + 1400*1                  # 94400
f4b_foot = 12000 + 900*1                                   # 12900
f1_foot  = 850000 + 0 + 410000 + 220000 + 40000 + 2200*1 + 4500*1   # 1526700

# Slot 5: total 10*2 = 20 -> classify: <=20 -> 'preparing'

# Slot 6
factor = 1 - 0.05 - 0.02                                   # 0.9299999999999999
gain6 = 640000*factor - 525000                             # 70200.0 exactly
# reducedCap = 250000*min(m,24)/24; exclusion = min(gain6, reducedCap)
# m>=7 -> 70200 ; m=6 (coarse-year reading) -> 62500

# Slot 7
combined = (7250 + 14583) * 12                             # 261996
slope = (43423 - 43343) / (240000 - 239400)                # 80/600
annual = 43423 + (combined - 240000) * slope               # 46355.8
monthly_raw = annual / 12                                  # 3862.9833333333336
monthly_rounded = js_round(monthly_raw)                    # 3863

# Slots 8/9 (epoch-day arithmetic == datetime.date subtraction)
d_hire, d_grant = date(1998,4,1), date(2018,3,15)
d_sep,  d_vest  = date(2026,3,31), date(2027,3,15)
end = min(d_sep, d_vest)
hug = js_round(600 * (end-d_hire).days  / (d_vest-d_hire).days)  * 61.00   # 580*61 = 35380
nel = js_round(600 * (end-d_grant).days / (d_vest-d_grant).days) * 61.00   # 536*61 = 32696

# Slot 10
gross10 = 850000 * factor                                  # 790500.0
netEq, gain10 = gross10 - 310000, gross10 - 660000         # 480500.0, 130500.0
excl = max(0.0, min(gain10, 250000))                       # full cap (>=24 qualifying months)
tax  = max(0.0, gain10 - excl) * 0.15                      # 0.0
pin10 = (1 - 0.5) * netEq - tax                            # 240250.0

# Slot 11
calcA = 0.30*26667 - 0.20*7908                             # 6418.499999999999
calcB = 0.40*(26667+7908) - 7908                           # 5922.0
amt = max(0.0, min(calcA, calcB))                          # 5922.0

# Slot 12: 24 >= 20 -> '20+ years (permanent)'

# Slot 13
def progressive(taxable, brackets):
    tax = 0.0; lower = 0.0
    for upper, rate in brackets:
        if upper is None or taxable <= upper:
            tax += max(0.0, taxable - lower) * rate; break
        tax += (upper - lower) * rate; lower = upper
    return js_round(tax * 100) / 100
single_b = [(12400,.10),(50400,.12),(105700,.22),(201775,.24),(256225,.32),(640600,.35),(None,.37)]
hoh_b    = [(17700,.10),(67450,.12),(105700,.22),(201775,.24),(256200,.32),(640600,.35),(None,.37)]
net_s = max(0.0, progressive(94900 + 0/2 - 16100, single_b) - 1*2200)   # 9848.0
net_h = max(0.0, progressive(94900 + 0/2 - 24150, hoh_b)    - 1*2200)   # 6266.0
delta = net_s - net_h                                                   # 3582.0

# Slots 15/16/19 coverture (calendar-months rule)
def months_between(d1, d2):
    m = (d2.year - d1.year)*12 + (d2.month - d1.month)
    if d2.day != 1: m += 1
    return m
frac3 = months_between(date(2022,1,10), date(2023,3,10)) / \
        months_between(date(2021,6,1),  date(2046,5,20))   # 15/300 = 0.05
pv16  = 68000 * frac3                                      # 3400.0  (slots 17/18 = same)
frac1 = months_between(date(2002,6,15), date(2026,3,31)) / \
        months_between(date(1998,4,1),  date(2036,8,22))   # 286/461 = 0.6203904555314533

# Slots 20/21
src = open('src/lib/pensionValuation/mortalityTables/irs_417e_2026.js').read()
P = {int(a): float(v) for v, a in re.findall(r'^\s+(0\.\d+|0\.00000),\s*// age (\d+)', src, re.M)}
r = 5.34 / 100
S, afA = 1.0, 0.0
for k in range(0, 120 - 65):           # PASS A: survival chain
    afA += S / (1 + r)**k
    S *= P[65 + k]
l = [1.0]
for k in range(1, 120 - 65):           # PASS B: l_x table
    l.append(l[k-1] * P[65 + k - 1])
afB = sum(l[k] * (1/(1+r))**k for k in range(0, 120 - 65))
assert abs(afA - afB) < 5e-7           # 6dp agreement (actual diff 3.6e-15)
ageToday = (2026-1971) + (6-8)/12 + (1-22)/365.25          # 54.77583846680356
ytr = max(0, 65 - ageToday)                                # 10.224161533196437
deferral = (1 + r)**(-ytr)                                 # 0.5874924745017587
pv20 = 4100 * 12 * afA * deferral                          # 365975.34311317076
pv21 = pv20 * frac1                                        # 227047.60982725993
```

## Appendix B — selected raw output (exact doubles)

```
takeHomePay: 10938.6   budgetGap: 9970.0
footings: F2 94400 | F4b 12900 | F1 1526700
readiness: 20 -> preparing
(1-0.05-0.02) = 0.9299999999999999
F3: gross 595200.0  gain 70200.0 ; m=6 -> 62500.0 ; m=11 -> 70200.0 ; m=12 -> 70200.0 ; m=17 -> 70200.0
Builta: slope 0.13333333333333333  excess*slope 2932.8  annual 46355.8  /12 3862.9833333333336 -> 3863
Hug:    10226/10575 = 0.9669976359338062 ; 600x = 580.1985815602837 -> 580 -> 35380.0
Nelson:  2938/3287  = 0.8938241557651354 ; 600x = 536.2944934590812 -> 536 -> 32696.0
F1 HDA: gross 790500.0  netEq 480500.0  gain 130500.0  tax 0.0  pin 240250.0
AAML: calcA 6418.499999999999  calcB 5922.0 -> 5922.0
FSO: single 12048.0 -> net 9848.0 ; hoh 8466.0 -> net 6266.0 ; delta 3582.0
F3 coverture: 15/300 = 0.05 -> 0.0500 ; 68000x = 3400.0
F1 coverture: 286/461 = 0.6203904555314533 -> 0.6204
mortality spot-checks: p65 0.99271  p90 0.86888  p118 0.50005  p119 0.0
ageToday 54.77583846680356  ytr 10.224161533196437  r 0.053399999999999996
annuity PASS A 12.66147832840924 | PASS B 12.661478328409236 | diff 3.6e-15
deferral 0.5874924745017587
pv20 365975.34311317076 (365,975.34) ; pv21 227047.60982725993 (227,047.61)
```

---

PROPOSAL ONLY — no fixture was edited. Insertion requires Fitz's explicit review of the shown work (recommended: hand-verify the F1 pension, F3 §121, and one support figure), after which the insertion prompt records spec amendment D-V2-9 (pin provenance: model-computed under independence rules, human-verified by review/sampling).
