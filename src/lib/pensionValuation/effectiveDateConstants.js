// src/lib/pensionValuation/effectiveDateConstants.js
//
// §417(e) SEGMENT-2 RATES — VERIFIED DATA (v1 correctness repair, 2026-06-10).
//
// CONVENTION: the segment-2 rate of the most recent published month ≤ the
// valuation date. The latest seeded month serves ALL later valuation dates
// until a newer month is seeded (no expiration windows). Valuation dates
// earlier than the earliest seeded month resolve to the earliest month AND
// the resolver emits the flag 'rate_month_floor_applied'.
//
// UNITS: `segment2Pct` is the IRS-published percentage VERBATIM (two decimals;
// 5.34 means 5.34%). The applied annual discount rate is segment2Pct / 100
// exactly. No basis points, no milli-percent, ever again — the prior pinned
// integers (5198/5234, basis-point-named) matched no published value under
// any unit reading and are repaired by this table.
//
// PROVENANCE: values verified against fetched IRS Notice PDFs — evidence memo
// 2026-06-10 (in-repo copy: docs/verification/417e-evidence-memo-2026-06-10.md),
// human-confirmed by Fitz. Each row cites its governing Notice and PDF URL.
//
// NOTE [R5c-9] (retained): a parallel effectiveDateConstants.js lives in
// src/lib/supportGuidelines/ (defines the shared lookupAtDate + state support
// constants). lookupAtDate's expiration-window semantics do NOT fit the
// convention above, so this file no longer imports or re-exports it — the
// resolver below is local to pensionValuation. supportGuidelines is untouched.

// Ascending by month; append newer months at the end as Notices publish.
export const IRS_417E_SEGMENT_2_RATES = [
  { month: '2025-10', segment2Pct: 5.04, noticeId: 'Notice 2025-74', noticeUrl: 'https://www.irs.gov/pub/irs-drop/n-25-74.pdf' },
  { month: '2025-11', segment2Pct: 5.15, noticeId: 'Notice 2026-2', noticeUrl: 'https://www.irs.gov/pub/irs-drop/n-26-02.pdf' },
  { month: '2025-12', segment2Pct: 5.17, noticeId: 'Notice 2026-12', noticeUrl: 'https://www.irs.gov/pub/irs-drop/n-26-12.pdf' },
  { month: '2026-01', segment2Pct: 5.2, noticeId: 'Notice 2026-14', noticeUrl: 'https://www.irs.gov/pub/irs-drop/n-26-14.pdf' },
  { month: '2026-02', segment2Pct: 5.15, noticeId: 'Notice 2026-19', noticeUrl: 'https://www.irs.gov/pub/irs-drop/n-26-19.pdf' },
  { month: '2026-03', segment2Pct: 5.35, noticeId: 'Notice 2026-26', noticeUrl: 'https://www.irs.gov/pub/irs-drop/n-26-26.pdf' },
  { month: '2026-04', segment2Pct: 5.34, noticeId: 'Notice 2026-31', noticeUrl: 'https://www.irs.gov/pub/irs-drop/n-26-31.pdf' },
];

/**
 * Resolve the §417(e) segment-2 rate for a valuation date per the convention
 * above. Returns { segment2Pct, rateMonth, noticeId, flags } — flags is
 * ['rate_month_floor_applied'] when the valuation date precedes the earliest
 * seeded month, otherwise [].
 */
export function resolveSegment2Rate(valuationDateISO) {
  const month = String(valuationDateISO).slice(0, 7);
  let chosen = null;
  for (const row of IRS_417E_SEGMENT_2_RATES) {
    if (row.month <= month) chosen = row;
  }
  if (chosen) {
    return {
      segment2Pct: chosen.segment2Pct,
      rateMonth: chosen.month,
      noticeId: chosen.noticeId,
      flags: [],
    };
  }
  const earliest = IRS_417E_SEGMENT_2_RATES[0];
  return {
    segment2Pct: earliest.segment2Pct,
    rateMonth: earliest.month,
    noticeId: earliest.noticeId,
    flags: ['rate_month_floor_applied'],
  };
}
