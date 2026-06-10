# §417(e) Segment-Rate Evidence Memo (EVIDENCE ONLY)

Prepared: 2026-06-10 14:23 UTC
Scope: Read-only evidence pull per Cowork-Prompt-417e-Evidence-Pull.md. No repo edits, no vault writes. This memo is the only file created.

---

## 1. Verbatim code extract

File: `/Users/austinfitzpatrick/clearpath-app/src/lib/pensionValuation/effectiveDateConstants.js`
(entire file, 19 lines — quoted verbatim)

```js
// src/lib/pensionValuation/effectiveDateConstants.js
// Date-keyed §417(e) segment-2 rates per spec §7.4.7. All effectiveDate /
// expirationDate values are ISO8601 strings (mirrors §6.5.6 convention).
// Runtime Date objects only inside the shared lookupAtDate utility during comparison.
//
// NOTE [R5c-9]: Two effectiveDateConstants.js files exist in src/lib/:
//   - src/lib/supportGuidelines/effectiveDateConstants.js (defines lookupAtDate + state support constants)
//   - src/lib/pensionValuation/effectiveDateConstants.js (this file — defines IRS_417E_SEGMENT_2_RATES + re-exports lookupAtDate)
// Parallel structure intentional at v1; consolidating into a neutral
// src/lib/dateConstants.js is a candidate Phase 6 refactor.

import { lookupAtDate } from '../supportGuidelines/effectiveDateConstants.js';

export const IRS_417E_SEGMENT_2_RATES = [
  { effectiveDate: '2026-04-01', expirationDate: '2026-04-30', annualRateBps: 5234, source: 'IRS Notice 2026-XX' },
  { effectiveDate: '2026-03-01', expirationDate: '2026-03-31', annualRateBps: 5198, source: 'IRS Notice 2026-XX' },
];

export { lookupAtDate };
```

Comment search (task asked for all comment lines mentioning "lookup", "stability", "Notice", or "segment"):

- "lookup" appears only in the header comment line `// Runtime Date objects only inside the shared lookupAtDate utility during comparison.` and in NOTE [R5c-9] (both quoted above), referring to the `lookupAtDate` utility — not to a rate lookup month.
- "Notice" appears only in the data values (`source: 'IRS Notice 2026-XX'`), not in any comment.
- "segment" appears in the header comment `// Date-keyed §417(e) segment-2 rates per spec §7.4.7.` and in NOTE [R5c-9] (`IRS_417E_SEGMENT_2_RATES`), both quoted above.
- "stability" appears nowhere in the file.

**Observation (stated as observation only):** The task brief said "the comments state which lookup month / Notice each window intends." No such comments exist in this file. Neither constant entry has a comment identifying an intended lookup month or an actual Notice number; both `source` fields are the placeholder string `'IRS Notice 2026-XX'`.

---

## 2. IRS published rates — browser capture

Primary source: [IRS — Minimum present value segment rates](https://www.irs.gov/retirement-plans/minimum-present-value-segment-rates)
Captured: 2026-06-10 14:23 UTC. Page footer: "Page Last Reviewed or Updated: 29-May-2026".
Most recent month published on the page: **Apr-26**.

Rows quoted exactly as published (the page lists months newest-first; "For plan years beginning in" column reads "All" for every row below):

| For plan years beginning in | Month/Year | First segment | Second segment | Third segment |
| --- | --- | --- | --- | --- |
| All | Apr-26 | 4.27 | 5.34 | 6.22 |
| All | Mar-26 | 4.24 | 5.35 | 6.25 |
| All | Feb-26 | 3.96 | 5.15 | 6.11 |
| All | Jan-26 | 4.03 | 5.20 | 6.12 |
| All | Dec-25 | 4.03 | 5.17 | 6.11 |
| All | Nov-25 | 4.07 | 5.15 | 6.01 |
| All | Oct-25 | 4.01 | 5.04 | 5.83 |

Generous over-capture — two months before the requested start, same page, same capture:

| For plan years beginning in | Month/Year | First segment | Second segment | Third segment |
| --- | --- | --- | --- | --- |
| All | Sep-25 | 4.06 | 5.12 | 5.93 |
| All | Aug-25 | 4.20 | 5.29 | 6.08 |

### Notice numbers per month

The segment-rates page itself does **not** link a Notice for any month — the table cells are plain text. The IRS ["Recent interest rate notices"](https://www.irs.gov/retirement-plans/recent-interest-rate-notices) index page is stale: its most recent entry is Notice 2025-14 (covering minimum present value transitional rates for January 2025). Notice numbers below were therefore located via irs.gov search and confirmed by fetching each Notice PDF directly from irs.gov (primary source). Each PDF states, verbatim: "the minimum present value segment rates determined for [Month Year] are as follows" followed by the table row quoted here.

| Month | Notice # | Verbatim MPV table row in Notice (First / Second / Third) | Notice URL | Confirmation |
| --- | --- | --- | --- | --- |
| April 2026 | Notice 2026-31 | April 2026 4.27 5.34 6.22 | https://www.irs.gov/pub/irs-drop/n-26-31.pdf | PDF fetched, quoted verbatim |
| March 2026 | Notice 2026-26 | March 2026 4.24 5.35 6.25 | https://www.irs.gov/pub/irs-drop/n-26-26.pdf | PDF fetched, quoted verbatim |
| February 2026 | Notice 2026-19 | February 2026 3.96 5.15 6.11 | https://www.irs.gov/pub/irs-drop/n-26-19.pdf | PDF fetched, quoted verbatim |
| January 2026 | Notice 2026-14 | January 2026 4.03 5.20 6.12 | https://www.irs.gov/pub/irs-drop/n-26-14.pdf | PDF fetched, quoted verbatim |
| December 2025 | Notice 2026-12 | December 2025 4.03 5.17 6.11 | https://www.irs.gov/pub/irs-drop/n-26-12.pdf | PDF fetched, quoted verbatim |
| November 2025 | Notice 2026-2 | November 2025 4.07 5.15 6.01 | https://www.irs.gov/pub/irs-drop/n-26-02.pdf | PDF fetched, quoted verbatim (PDF header reads "Notice 2026-2") |
| October 2025 | Notice 2025-74 | October 2025 4.01 5.04 5.83 | https://www.irs.gov/pub/irs-drop/n-25-74.pdf | PDF fetched, quoted verbatim |

All Notice PDF values agree exactly with the segment-rates page table rows above.

---

## 3. Comparison table (mechanical only)

The code comments do not state an intended lookup month for either window (see §1), so the "intended month/Notice" column is empty-by-source and both rows are marked **AMBIGUOUS** with all candidate months' published segment-2 values listed. No candidate is selected.

| Engine window | Pinned value (verbatim) | Code comment's intended month/Notice (verbatim) | Published segment-2 for that month | Published Notice # | MATCH / MISMATCH / AMBIGUOUS |
| --- | --- | --- | --- | --- | --- |
| effectiveDate '2026-03-01' → expirationDate '2026-03-31' | `annualRateBps: 5198`, `source: 'IRS Notice 2026-XX'` | (none — no comment states an intended month or Notice) | Candidates: Oct-25 5.04 · Nov-25 5.15 · Dec-25 5.17 · Jan-26 5.20 · Feb-26 5.15 · Mar-26 5.35 · Apr-26 5.34 | Candidates: 2025-74 · 2026-2 · 2026-12 · 2026-14 · 2026-19 · 2026-26 · 2026-31 | **AMBIGUOUS** |
| effectiveDate '2026-04-01' → expirationDate '2026-04-30' | `annualRateBps: 5234`, `source: 'IRS Notice 2026-XX'` | (none — no comment states an intended month or Notice) | Candidates: Oct-25 5.04 · Nov-25 5.15 · Dec-25 5.17 · Jan-26 5.20 · Feb-26 5.15 · Mar-26 5.35 · Apr-26 5.34 | Candidates: 2025-74 · 2026-2 · 2026-12 · 2026-14 · 2026-19 · 2026-26 · 2026-31 | **AMBIGUOUS** |

**Unit note (not resolved here):** The pinned field is named `annualRateBps` (basis points implied); IRS publishes percentages with two decimals (e.g., `5.34`). As string-and-number facts: 5.34% expressed in basis points is 534; no candidate month's published segment-2, converted at 100 bps = 1%, equals 5198 or 5234. If the pinned integers were instead read as percent × 1000 (5198 → 5.198, 5234 → 5.234), neither result string-equals any published candidate value (nearest published strings are 5.20 (Jan-26) and 5.34 (Apr-26) / 5.35 (Mar-26)). Which reading the engine intends, and which lookup month applies, are the human's call.

---

## 4. Anomalies noticed (observations only)

1. Both `source` fields are the placeholder `'IRS Notice 2026-XX'`; no actual Notice number appears anywhere in the file.
2. The file contains no comment stating a lookup month, stability period, or intended Notice for either window, although the task brief expected such comments to exist.
3. Field name `annualRateBps` implies basis points, but neither pinned integer equals any candidate month's published segment-2 under either a ×100 (bps) or ×1000 (percent-mills) reading — see unit note in §3.
4. The two engine windows (March and April 2026) are the two most recent months on the IRS page; whether the engine intends same-month rates or a lookback month is not stated in the code.
5. The IRS "Recent interest rate notices" index page is stale (most recent entry: Notice 2025-14), while Notices through 2026-31 exist as PDFs on irs.gov; Notice numbers for Oct 2025–Apr 2026 were located via irs.gov search and verified against the fetched Notice PDFs (all irs.gov primary sources; no secondary sources used).
6. Notice numbering observed is non-consecutive month-to-month (2025-74, 2026-2, 2026-12, 2026-14, 2026-19, 2026-26, 2026-31); recorded as observed, no inference drawn.

---

"EVIDENCE ONLY — verification decision and registry flip are Fitz's, per V2-Citation-Registry authoring rule."
