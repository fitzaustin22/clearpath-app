# Attorney Blueprint Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the @react-pdf Attorney Blueprint so every section scores 5/5 on the R1–R8 rubric and the document passes D1–D5, with zero raw values reaching the page, exactly one hero answer per section, grouped entities, and method tables — presentation only, calculations unchanged.

**Architecture:** A new **presentation layer** (`presentation.js`) reads the EXISTING `documentModel` (values untouched → D5 holds) and maps each section to a hero block + supporting metric cards + grouped entities + method tables. A new @react-pdf **component kit** (`components.jsx`) renders HeroBand / MetricCard+bar / GroupedEntity / MethodTable / FootnotesBlock / NegativeValue / TableOfContents. `tokens.js` adopts the prompt palette. `format.js` is hardened to close residual raw-value leaks (ISO timestamps, booleans, hyphen-slugs, naked rate decimals, naked currency) and to render negatives accounting-style. `AttorneyBlueprintDocument.jsx` is rewritten to consume the presentation layer + kit.

**Tech Stack:** React 18, `@react-pdf/renderer` ^4.5.1, Vitest 4. Fonts already registered (Playfair display, Inter body, Newsreader). No Tailwind (PDF can't read it). No new deps unless TOC two-pass requires one.

---

## Design decisions (resolved with user 2026-06-17)

1. **Full redesign** — implement the prompt hierarchy in full.
2. **Adopt the prompt palette** as the new tokens (below).
3. **Full document in one pass**, then one graded scorecard.

### New palette (tokens.js COLORS)

| token | hex | use |
|---|---|---|
| navy | `#1B2A4A` | hero numbers, titles, primary ink |
| navySoft | `#2C3E63` | secondary ink, strong/closing rules |
| gold | `#9A7B2E` | eyebrows, citation markers, hero left-rule |
| goldLight | `#B6933D` | thin accent rules, proportion-bar fill |
| label | `#5F6B80` | row labels, body-secondary |
| labelLight | `#8A93A4` | captions, footer, de-emphasized inputs |
| rule | `#E6E8EC` | light dividers |
| negative | `#9E3A2F` | negative values (accounting) |
| tint | `#F6F4EE` | hero band + card backgrounds (parchment) |
| page | `#FFFFFF` | page bg |

Gold honored as the user chose: hero = **tint fill + gold left-rule** (NOT a gold wash).

### Two surfaced reconciliations (touch the A5-M-disclosed rounding contract — flag in final report)

- **R-A Coverture as percent.** Prompt R2 wants `0.6204 → 62.04%`, `1.0000 → 100%`, `0.8938 → 89.38%`. The disclosed rounding sentence currently says "coverture fractions to four decimals." Display coverture as a 2-decimal percent AND update the disclosure to: *"Actual amounts are stated to the cent; projected values to the nearest dollar; rates and coverture fractions are shown as a percentage to two decimals."* Underlying fraction value is unchanged — display + disclosure only.
- **R-B Drop redundant `.00`.** `currency_actual` renders cents only when the fractional part is non-zero (`$8,940` not `$8,940.00`; `$5,747.66` stays). Still accurate "to the cent." No disclosure change needed (whole-dollar actual is exact to the cent).

### Per-section presentation map (from the F1 sample)

Hero = the section's quotable conclusion. Inputs de-emphasized (labelLight). Line items sorted largest-first; liabilities/shortfalls in the negative group.

| Sec | Hero block | Supporting cards | Grouped entities / method tables |
|---|---|---|---|
| s1 Personal Profile | `s1.tier` "Ready" (subtitle: score 26 / 30) | monthlyGap, gapPercent | — |
| s2 Income | `s2.netMonthlyIncome` | grossMonthlyIncome, annualGrossIncome | Deductions group (sorted desc; pre-tax deferral tagged); mandatory subtotal |
| s3 Asset Inventory | `s3.netWorth` | totalAssets, totalLiabilities | Asset-mix bars by category (sorted desc); Liabilities in negative group |
| s4 Tax Analysis | `s4.bestOption` "Head of household" (subtitle: difference $3,582) | — | Scenario table: Eligible (single, hoh) vs Comparison-only (mfj, mfs), net tax, sorted |
| s5 Property Division | `s5.totalMaritalEstate` | — | 3 entities: Client / Spouse / Undecided — each face value + tax-adjusted + hidden tax |
| s6 Retirement | `s6.pva.headlinePV` DB present value (hero) | pit.taxAdjustedValue, pva.maritalPV | Entities: DC Account (PIT), DB Pension (PVA — coverture% ), QDRO order |
| s7 Expense | `s7.monthlyGap` (NEGATIVE hero −$2,212) | currentTotal, projectedTotal | Category method table: Current vs Projected (sorted desc) |
| s8 Support | `s8.totalMonthlySupport` | spousalSupport.monthly, childSupport.monthly | Inputs (payor/payee income) de-emphasized group |
| s9 Home Decision | userSelection or "3 scenarios analyzed" | — | Scenario list (presence) |
| s10 Negotiation | "2 priorities · 1 trade-off" | — | Priorities (ranked); Trade-offs as give→get rows (FIX ⇄) |
| s11 Settlement | `s11.gapCount` "1 offer silence" | mapCount | Map rows by status |
| s12 Action Plan | `s12.nextStepCount` "2 next steps" | professionalCount, keyDateCount | Key dates (formatted) |
| Supp→§5 Deferred Comp | per-grant box hero = intrinsic value | shares, strike | Per grant: GroupedEntity + Hug/Nelson MethodTable |
| Supp→§5 Tax-Adjusted | per-asset tax-adjusted value | — | Per asset: GroupedEntity (FMV→basis→tax→adjusted) |
| Supp→§6 QDRO | plan type | — | generatedAt formatted to date |

Carrier numbering (D1): eyebrow "SUPPLEMENT TO SECTION 5 / 6 — <title>" (preserves locked D-V2-3 12-section canon, no dropped numbering).

---

## File structure

- Create `src/lib/blueprint/pdf/presentation.js` — pure: `buildPresentation(model)` → `{ sections:[{id,number,title,hero,cards,groups,methodTables,lineItems,notes,sources}], supplements:[...], toc:[...] }`. Plus helpers `selectHero`, `rankDesc`, `humanizeCategory`.
- Create `src/lib/blueprint/pdf/components.jsx` — the kit (HeroBand, MetricCard, ProportionBar, GroupedEntity, MethodTable, FootnoteMarkers, NegativeValue, TocList).
- Create tests: `presentation.test.js`, `format.negatives.test.js`, `format.leaks.test.js`, `documentModel.docid.test.js`.
- Modify `src/lib/blueprint/pdf/format.js` — negatives, dates, booleans, percent, currency-no-.00, hyphen-slug + appendix hardening.
- Modify `src/lib/blueprint/pdf/tokens.js` — new palette + kit styles.
- Modify `src/lib/blueprint/documentModel.js` — exclude `generatedAt` (and other wall-clock) from `shortContentHash`; emit s10 trade-offs as `{get,give}`; emit key dates with ISO preserved for formatting; update rounding-contract disclosure (R-A).
- Modify `src/lib/blueprint/pdf/AttorneyBlueprintDocument.jsx` — rewrite render plan + views over the kit; add TOC; carrier supplement numbering; move citation markers to labels (R7).
- Modify `src/lib/blueprint/pdf/__tests__/renderer.a4.test.js` — extend leak denylist to catch ISO timestamps, ` true/false`, hyphen-slugs, naked rate decimals.

---

## Tasks

### Task 1: format.js — negatives, booleans, dates, percent, currency-no-.00

**Files:** Modify `src/lib/blueprint/pdf/format.js`; Test `src/lib/blueprint/pdf/__tests__/format.negatives.test.js`

- [ ] **Step 1: Write failing tests**

```js
import { describe, it, expect } from 'vitest';
import { formatValue, formatAppendixValue, formatBoolean, formatIsoDate, formatPercentFromFraction, isNegativeValue } from '../format';

describe('negatives — accounting style', () => {
  it('currency_projection negative → parentheses, no minus', () => {
    expect(formatValue({ value: -2212, valueClass: 'currency_projection' })).toBe('($2,212)');
  });
  it('currency_actual negative whole → parentheses, no .00', () => {
    expect(formatValue({ value: -8940, valueClass: 'currency_actual' })).toBe('($8,940)');
  });
  it('isNegativeValue flags negatives for color', () => {
    expect(isNegativeValue({ value: -2212, valueClass: 'currency_projection' })).toBe(true);
    expect(isNegativeValue({ value: 5922, valueClass: 'currency_projection' })).toBe(false);
  });
});

describe('currency drops redundant .00 (R-B)', () => {
  it('whole-dollar actual → no cents', () => {
    expect(formatValue({ value: 8940, valueClass: 'currency_actual' })).toBe('$8,940');
  });
  it('fractional actual → cents kept', () => {
    expect(formatValue({ value: 5747.66, valueClass: 'currency_actual' })).toBe('$5,747.66');
  });
});

describe('booleans + dates + percent', () => {
  it('formatBoolean', () => {
    expect(formatBoolean(true)).toBe('Yes');
    expect(formatBoolean(false)).toBe('No');
  });
  it('formatIsoDate', () => {
    expect(formatIsoDate('2026-08-15')).toBe('August 15, 2026');
    expect(formatIsoDate('2026-06-18T00:34:40.562Z')).toBe('June 18, 2026');
  });
  it('formatPercentFromFraction', () => {
    expect(formatPercentFromFraction(0.6824)).toBe('68.24%');
    expect(formatPercentFromFraction(1)).toBe('100%');
    expect(formatPercentFromFraction(0.8938)).toBe('89.38%');
  });
  it('fraction valueClass now renders as percent (R-A)', () => {
    expect(formatValue({ value: 0.6204, valueClass: 'fraction' })).toBe('62.04%');
    expect(formatValue({ value: 1, valueClass: 'fraction' })).toBe('100%');
  });
});
```

- [ ] **Step 2: Run — expect FAIL** `cd "$WT" && npx vitest run src/lib/blueprint/pdf/__tests__/format.negatives.test.js`

- [ ] **Step 3: Implement** in `format.js`:
  - `usd(n, fractionDigits)` → wrap negatives in parens, strip the locale minus: format `Math.abs(n)`, prepend `(` + `)` when `n < 0`.
  - `currency_actual` → `fractionDigits = Number.isInteger(value) ? 0 : 2`.
  - Add `formatBoolean`, `formatIsoDate` (uses existing `MONTHS`), `formatPercentFromFraction` (`100%` when no remainder else 2 decimals), `isNegativeValue`.
  - `case 'fraction'` → `formatPercentFromFraction(value)` (R-A).

- [ ] **Step 4: Run — expect PASS.**

- [ ] **Step 5: Commit** `feat(blueprint-pdf): accounting negatives, %-coverture, date/boolean formatters`

### Task 2: format.js — close appendix raw-value leaks

**Files:** Modify `format.js`; Test `src/lib/blueprint/pdf/__tests__/format.leaks.test.js`

- [ ] **Step 1: Failing tests**

```js
import { describe, it, expect } from 'vitest';
import { formatAppendixValue } from '../format';

describe('appendix leak closure', () => {
  it('booleans → Yes/No', () => {
    expect(formatAppendixValue(false)).toBe('No');
    expect(formatAppendixValue(true)).toBe('Yes');
  });
  it('hyphen-slug enums → human', () => {
    expect(formatAppendixValue('refi-at-current')).toBe('Refinance at current rate');
    expect(formatAppendixValue('margin-of-safety')).toBe('Margin of safety');
  });
  it('single-word enums Title-cased', () => {
    expect(formatAppendixValue('yellow')).toBe('Yellow');
  });
});
```

(Note: bare numeric appendix values like `0.6824`, `260000`, `0.05` cannot be unit-disambiguated here — they are fixed at the SOURCE in Task 6 by labeling them with the right valueClass/formatter at the push site, since the appendix carries no valueClass. This task only closes the string-class leaks.)

- [ ] **Step 2: Run — FAIL.**

- [ ] **Step 3: Implement** in `formatAppendixValue`: booleans → `formatBoolean`; add a known-enum map (`refi-at-current`, `margin-of-safety`, `pays100`, verdict tiers `yellow|green|red` → Title) before the humanize fallback; extend the slug humanizer to split on hyphens too (`a-b-c` → "A b c" → enum map preferred).

- [ ] **Step 4: Run — PASS.**

- [ ] **Step 5: Commit** `fix(blueprint-pdf): close appendix boolean + hyphen-slug leaks`

### Task 3: documentModel — deterministic doc ID (exclude wall-clock)

**Files:** Modify `documentModel.js`; Test `src/lib/blueprint/pdf/__tests__/documentModel.docid.test.js` (new, but lives near model — place in `src/lib/blueprint/__tests__/documentModel.docid.test.js`)

- [ ] **Step 1: Failing test** — build the F1 model twice (renders happen at different wall-clock instants) and assert the documentId is identical; assert the QDRO `generatedAt` block value is a formatted date, not an ISO `T..Z` string.

```js
it('doc ID is stable across renders (generatedAt excluded from hash)', () => {
  const id1 = buildF1().documentId; const id2 = buildF1().documentId;
  expect(id1).toBe(id2);
  expect(id1).toMatch(/^CP-BP-2026-\d{4}$/);
});
```

- [ ] **Step 2: Run — FAIL** (current hash includes generatedAt → values differ only if timestamps differ; force a differing timestamp in the test by stubbing two `generatedAt` values).

- [ ] **Step 3: Implement** — in `shortContentHash`, skip block ids ending in `generatedAt` (and any `*.calculationTimestamp`). Keep all financial values in the hash.

- [ ] **Step 4: Run — PASS.**

- [ ] **Step 5: Commit** `fix(blueprint): exclude wall-clock from doc-ID hash → stable ID`

### Task 4: presentation.js — pure section→hero/group/method mapping

**Files:** Create `src/lib/blueprint/pdf/presentation.js`; Test `src/lib/blueprint/pdf/__tests__/presentation.test.js`

- [ ] **Step 1: Failing tests** — over the F1 model: `buildPresentation(model)` returns one `hero` per section (`s3` hero is `netWorth` = 1206900; `s7` hero is `monthlyGap` = -2212 and `hero.negative === true`); `s3` line items sorted desc (Real estate first); deferred-comp supplement has 2 grouped entities each with a `methodTable` whose columns are `['Hug','Nelson']`; carrier supplements carry a `number` label ("Supplement to Section 5/6 …").

- [ ] **Step 2: Run — FAIL.**

- [ ] **Step 3: Implement** `buildPresentation(model)`:
  - `HERO_BY_SECTION = { s1:'s1.tier', s2:'s2.netMonthlyIncome', s3:'s3.netWorth', ... }` and a fallback (first count/text block) for count-based sections.
  - `CARDS_BY_SECTION` map for supporting metrics.
  - `groupEntities(blocks, idPrefixRegex)` → splits `carrier.dcs.<stub>.*` / `s5.*.<bucket>` into named boxes.
  - `buildMethodTable(blocks, ['hug','nelson'], ['Hug','Nelson'])` pairing `.hug`/`.nelson` siblings.
  - `rankDesc(lineItems)` numeric sort.
  - `humanizeCategory(name)` Title-cases category labels (fix `retirement` → `Retirement`).
  - Carrier `number`: `'Supplement to Section 5'` (deferredComp, costBasis), `'Supplement to Section 6'` (qdro).
  - Pass through `notes` + `sources` verbatim (A5-M content untouched).

- [ ] **Step 4: Run — PASS.**

- [ ] **Step 5: Commit** `feat(blueprint-pdf): presentation layer — heroes, groups, method tables`

### Task 5: components.jsx — the @react-pdf kit + tokens

**Files:** Create `src/lib/blueprint/pdf/components.jsx`; Modify `tokens.js`

- [ ] **Step 1** Update `tokens.js` `COLORS` to the new palette; remap every existing style ref (`ink2→navySoft/label`, `muted→labelLight`, `goldText→gold`, `line→rule`, `lineStrong→navySoft`); add kit styles: `heroBand` (tint bg, `borderLeftWidth:3, borderLeftColor:gold`, padding), `heroValue` (Playfair ~30pt navy), `heroLabel`, `card`, `cardValue`, `cardLabel`, `bar`/`barFill` (goldLight), `entityBox` (rule border), `entityHeader`, `methodTable*`, `negativeValue` (color negative), `tocRow`/`tocLeader`.
- [ ] **Step 2** Build kit components in `components.jsx` consuming `styles` (passed in): `HeroBand`, `MetricCard`, `ProportionBar`, `GroupedEntity`, `MethodTable`, `FootnoteMarkers`, `NegativeValue`, `TocList`.
- [ ] **Step 3** No unit test (visual) — verified by render smoke in Task 7 + grading.
- [ ] **Step 4: Commit** `feat(blueprint-pdf): token palette + component kit`

### Task 6: AttorneyBlueprintDocument.jsx — rewrite over the kit + TOC + appendix formatter wiring

**Files:** Modify `AttorneyBlueprintDocument.jsx`, `documentModel.js` (appendix push sites + s10 trade-off + key dates), `renderer.a4.test.js`

- [ ] **Step 1** `buildRenderPlan` consumes `buildPresentation(model)`. Sections render: eyebrow(number) · title · HeroBand · cards row · grouped entities / method tables · ranked line items · notes · sources. Move citation markers to the **label** (R7).
- [ ] **Step 2** Appendix B: each `entry` carries an optional `format` hint set at the push site in `documentModel.js` (e.g. `{format:'percent'}` for `ltvAtRefi`, `{format:'currency_actual'}` for `startingLiquidCash`/pension dollars, `{format:'percent'}` for `cola`/commission/closing-cost/interim-share, `{format:'boolean'}` for the stress-test/assumption flags). `formatAppendixValue(value, format)` applies it. This fixes the bare `0.6824`/`260000`/`false` leaks at the source.
- [ ] **Step 3** s10 trade-offs: emit `{get,give}` in the model; render as `get` → `give` with a drawn gold arrow (View triangle) — NO font glyph (fix Ä). Probe Inter first; if `→`(U+2192) is covered, may use it, else drawn.
- [ ] **Step 4** s12 key dates: format ISO via `formatIsoDate`.
- [ ] **Step 5** Carrier supplements render with the "Supplement to Section N" eyebrow.
- [ ] **Step 6** Add a **Table of Contents** page after the cover: two-pass render — pass 1 (no TOC) records each section's first page via `@react-pdf` `render`-callback page capture OR PDF text scan; pass 2 inserts the 1-page TOC and offsets every recorded page by the TOC page count. If two-pass proves fragile, fall back to a numberless ordered Contents list + PDF bookmarks and note it in the report.
- [ ] **Step 7** Extend `renderer.a4.test.js` denylist: add `/\d{4}-\d{2}-\d{2}T/` (ISO), `/\b(true|false)\b/`, `/\b[a-z]+(-[a-z]+)+\b/` (hyphen-slug), `/\b0\.\d{3,}\b/` (naked rate) over `collectRenderableStrings` for all fixtures.
- [ ] **Step 8** Run full blueprint suite — expect PASS.
- [ ] **Step 9: Commit** `feat(blueprint-pdf): redesigned renderer — heroes, grouped entities, TOC, footnotes`

### Task 7: Generate + adversarial grade loop (Workflow) + D5 diff

- [ ] Regenerate `tmp/baseline` AFTER, diff `*.values.json` (excluding `*generatedAt*`) against the pre-redesign capture → assert identical (D5).
- [ ] Render F1–F4b PDFs to `tmp/redesign/*.pdf`; serialize plans to `tmp/redesign/*.plan.txt`.
- [ ] Run the grading Workflow: per-section R1–R8 + document-wide D1–D5, adversarial worst-value hunt, loop until all 5/PASS.
- [ ] Full worktree gate: `npx vitest run` (whole suite) + `npm run lint` (no regression vs baseline floor).

### Task 8: Finalize

- [ ] Delete the temp `_dump_baseline.test.js`; ensure `tmp/` not committed.
- [ ] requesting-code-review; then finishing-a-development-branch (PR; user merges).
- [ ] Final scorecard (sections × R1–R8 + D1–D5) + changed-file summary + the two surfaced reconciliations (R-A/R-B).

---

## Self-review

- **Spec coverage:** R1 (Tasks 1,2,6), R2 (1,6 incl. R-A/R-B), R3 (1,5,6), R4 (4,5,6), R5 (4,6), R6 (4,5,6), R7 (6), R8 (5). D1 (4,6), D2 (6), D3 (already present + 6), D4 (6), D5 (7). ✓
- **Placeholders:** none — palette, hero map, formatters, denylist regexes all concrete.
- **Type consistency:** `buildPresentation` shape used identically in Tasks 4/6; `formatValue`/`formatAppendixValue(value, format)` signatures consistent.
