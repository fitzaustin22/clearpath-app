// src/lib/military-pension/getCalc.js
//
// Pure, server-side port of the Military Pension Value Tool's getCalc() and its
// audited authority set. Lifted VERBATIM from the standalone prototype
// (design_handoff_pension_value_tool/Military Pension Tool.dc.html — getCalc at
// line 541, helpers 516–537, SOURCES 462–480, METHODS 501–505). The arithmetic
// is byte-faithful to the prototype (verified by the verbatim-diff HALT-audit);
// the only change is mechanical — `this.num/this.dateIndex/this.computePV/
// this.state.inp` become module functions / a parameter. Do not re-derive or
// "improve" the math here: this is the single source of truth shared by the
// (future in-repo) tool and the Snapshot PDF report.
//
// Forward-compat (CLAUDE.md Cumulative Data Pipeline): SOURCES carries the
// formula/citation/data-source attribution alongside the numbers so the report
// — and any later pipeline consumer — can extract provenance without retrofit.

/** parseFloat coercion: blanks and junk → 0. */
export function num(v) {
  const x = parseFloat(v);
  return isNaN(x) ? 0 : x;
}

/** YYYY-MM → an absolute month index (year*12 + month-1); null on bad input. */
export function dateIndex(ym) {
  if (!ym || typeof ym !== 'string') return null;
  const p = ym.split('-');
  if (p.length < 2) return null;
  const y = parseInt(p[0], 10);
  const m = parseInt(p[1], 10);
  if (isNaN(y) || isNaN(m)) return null;
  return y * 12 + (m - 1);
}

/** USD, whole dollars. */
export function usd(v) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Math.round(v || 0));
}

/** USD rounded to the nearest $1,000 — the tool's "range" display rounding. */
export function usdRange(v) {
  return usd(Math.round((v || 0) / 1000) * 1000);
}

/** A fraction as a percent string (d decimals). */
export function pct(v, d = 0) {
  return `${(v * 100).toFixed(d)}%`;
}

/**
 * Present value of a COLA-grown monthly share, discounted to today as a
 * deferred life annuity that begins at `yearsUntilStart` and runs `payoutYears`.
 * Deterministic life-expectancy method; the range comes from varying the
 * discount rate ±1.5% in getCalc.
 */
export function computePV(annualBaseToday, yearsUntilStart, payoutYears, colaPct, discountPct) {
  if (annualBaseToday <= 0 || payoutYears <= 0) return 0;
  const g = 1 + colaPct / 100;
  const d = 1 + Math.max(0.01, discountPct) / 100;
  let pv = 0;
  const startY = Math.round(yearsUntilStart);
  const endY = startY + Math.round(payoutYears);
  for (let y = startY; y < endY; y++) { pv += (annualBaseToday * Math.pow(g, y)) / Math.pow(d, y); }
  return pv;
}

/**
 * The audited military-pension estimate. Input shape = the tool's `inp` object
 * (the canonical I/O contract the report and backend coordinate on). Output is
 * the same object the prototype returns — consumed unchanged by the report.
 * @param {object} inp  the tool's input field map
 */
export function getCalc(inp) {
  const isReserve = inp.serviceType === 'reserve';
  const FROZEN_CUTOFF_INDEX = 2016 * 12 + 11;
  const multiplier = inp.system === 'brs' ? 0.02 : 0.025;
  const eqYears = (pts) => num(pts) / 360;
  const yearsNow = isReserve ? eqYears(inp.pointsNow) : num(inp.yearsNow);
  const yearsAtRet = isReserve ? eqYears(inp.pointsAtRetirement) : num(inp.yearsAtRetirement);
  const sepIdx = dateIndex(inp.separationDate);
  const isFrozen = !inp.alreadyReceivingPay && sepIdx !== null && sepIdx > FROZEN_CUTOFF_INDEX;
  const onCutoffBoundary = !inp.alreadyReceivingPay && sepIdx !== null && sepIdx === FROZEN_CUTOFF_INDEX;
  const yearsForMult = isFrozen ? yearsNow : (yearsAtRet || yearsNow);
  const high3 = num(inp.high3Pay);
  const grossMonthly = multiplier * yearsForMult * high3;
  const sbpPremium = inp.sbpElected === 'yes' ? grossMonthly * 0.065 : 0;
  const vaWaiver = num(inp.vaWaiverMonthly);
  const disposableMonthly = Math.max(0, grossMonthly - sbpPremium - vaWaiver);
  const svcStart = dateIndex(inp.serviceStartDate);
  const marr = dateIndex(inp.marriageDate);
  const totalSvcMonths = yearsForMult * 12;
  let overlapMonths = 0;
  let coverture = 0;
  let covertureKnown = false;
  if (svcStart !== null && marr !== null && sepIdx !== null && totalSvcMonths > 0) {
    const start = Math.max(marr, svcStart);
    overlapMonths = Math.max(0, sepIdx - start);
    coverture = Math.min(1, Math.max(0, overlapMonths / totalSvcMonths));
    covertureKnown = true;
  }
  const award = num(inp.awardPct) / 100;
  const shareFraction = coverture * award;
  const spouseMonthly = shareFraction * disposableMonthly;
  const directPayCapHit = shareFraction > 0.5;
  const overlapYears = overlapMonths / 12;
  const meets1010 = covertureKnown && overlapYears >= 10;
  const memberAge = num(inp.memberAge);
  let payStartAge;
  if (inp.alreadyReceivingPay) payStartAge = memberAge;
  else if (isReserve) payStartAge = Math.max(60, memberAge);
  else payStartAge = memberAge + Math.max(0, yearsAtRet - yearsNow);
  const lifeAge = num(inp.lifeExpectancyAge) || 85;
  const yearsUntilStart = Math.max(0, payStartAge - memberAge);
  const payoutYears = Math.max(0, lifeAge - Math.max(payStartAge, memberAge));
  const annualBase = spouseMonthly * 12;
  const cola = num(inp.colaRate);
  const dCentral = num(inp.discountRate);
  const band = 1.5;
  const pvBase = computePV(annualBase, yearsUntilStart, payoutYears, cola, dCentral);
  const pvHigh = computePV(annualBase, yearsUntilStart, payoutYears, cola, Math.max(0.5, dCentral - band));
  const pvLow = computePV(annualBase, yearsUntilStart, payoutYears, cola, dCentral + band);
  const rLifeExp = num(inp.rateLifeExp) || dCentral;
  const rPbgc = num(inp.ratePbgc) || dCentral;
  const rGatt = num(inp.rateGatt) || dCentral;
  const pvLifeExp = computePV(annualBase, yearsUntilStart, payoutYears, cola, rLifeExp);
  const pvPbgc = computePV(annualBase, yearsUntilStart, payoutYears, cola, rPbgc);
  const pvGatt = computePV(annualBase, yearsUntilStart, payoutYears, cola, rGatt);
  const methodPVs = [{ key: 'lifeExp', pv: pvLifeExp }, { key: 'pbgc', pv: pvPbgc }, { key: 'gatt', pv: pvGatt }];
  const pvSpread = Math.max(...methodPVs.map((m) => m.pv)) - Math.min(...methodPVs.map((m) => m.pv));
  const methodsDiffer = pvSpread > 1;
  const highestKey = methodsDiffer ? methodPVs.reduce((a, b) => (b.pv > a.pv ? b : a)).key : null;
  const lowestKey = methodsDiffer ? methodPVs.reduce((a, b) => (b.pv < a.pv ? b : a)).key : null;
  const hasResult = grossMonthly > 0 && covertureKnown && spouseMonthly > 0;
  return {
    isReserve, grossMonthly, disposableMonthly, sbpPremium, vaWaiver, coverture, covertureKnown,
    overlapYears, shareFraction, spouseMonthly, directPayCapHit, meets1010, isFrozen, onCutoffBoundary,
    yearsUntilStart, pvLow, pvBase, pvHigh, pvLifeExp, pvPbgc, pvGatt, highestKey, lowestKey,
    methodsDiffer, hasResult,
  };
}

// Audited citation authorities — ported verbatim from the prototype's SOURCES.
// Every flag/figure in the report traces to one of these by id.
export const SOURCES = [
  { id: 'usfspa', label: 'USFSPA — the law that lets courts divide military retired pay', citation: '10 U.S.C. § 1408 (property-division authority at § 1408(c)(1))', url: 'https://www.law.cornell.edu/uscode/text/10/1408', verified: true, note: 'Permissive/enabling — it lets STATE courts treat DISPOSABLE (net) retired pay as divisible property. It does not itself grant any share.' },
  { id: 'ten_ten_rule', label: '10/10 rule — direct payment by DFAS', citation: '10 U.S.C. § 1408(d)(2)', url: 'https://www.law.cornell.edu/uscode/text/10/1408', verified: true, note: 'Governs WHO cuts the check (DFAS vs. the member) — NOT whether a share is owed. Under 10 years of overlap, a court can still award a share.' },
  { id: 'disposable_retired_pay', label: 'Disposable (divisible) retired pay', citation: '10 U.S.C. § 1408(a)(4)(A)(i)–(iv)', url: 'https://www.law.cornell.edu/uscode/text/10/1408', verified: true, note: 'Courts divide the NET figure, after specified deductions (incl. VA-disability waivers and SBP premiums).' },
  { id: 'frozen_benefit_rule', label: 'Frozen benefit rule (NDAA FY2017)', citation: 'Pub. L. 114-328, § 641(a) (Dec. 23, 2016); 10 U.S.C. § 1408(a)(4)(B)(i)–(ii)', url: 'https://www.law.cornell.edu/uscode/text/10/1408', verified: true, note: 'Freezes the member’s rank/grade and years of service inputs as of the divorce date (plus COLA) for decrees finalized after Dec. 23, 2016 where the member was not yet drawing retired pay.' },
  { id: 'howell', label: 'Howell v. Howell — no court-ordered make-whole for VA waivers', citation: 'Howell v. Howell, 581 U.S. 214, 137 S. Ct. 1400 (2017)', url: 'https://www.courtlistener.com/opinion/4391111/howell-v-howell/', verified: true, note: 'A state court cannot order a veteran to reimburse a former spouse for a reduction caused by a post-divorce VA-disability waiver.' },
  { id: 'mansell', label: 'Mansell v. Mansell — waived pay is not divisible', citation: 'Mansell v. Mansell, 490 U.S. 581 (1989)', url: 'https://www.law.cornell.edu/supremecourt/text/490/581', verified: true, note: 'Retired pay waived to receive VA disability compensation is excluded from divisible disposable retired pay.' },
  { id: 'yourko', label: 'Yourko v. Yourko (VA) — indemnification by agreement is allowed', citation: 'Yourko v. Yourko, 302 Va. 149 (2023), cert. denied, 145 S. Ct. 137 (2024)', url: 'https://law.justia.com/cases/virginia/supreme-court/2023/220039.html', verified: true, note: 'Virginia: Howell bars court-ORDERED indemnification for VA-waiver reductions, but parties MAY contract for a guaranteed-payment/indemnification provision and a court may enforce it.' },
  { id: 'sbp', label: 'Survivor Benefit Plan (SBP)', citation: '10 U.S.C. §§ 1447–1455 (annuity § 1451(a)(1)(A); former-spouse election § 1448(b)(2))', url: 'https://www.law.cornell.edu/uscode/text/10/1450', verified: true, note: 'A separate survivor annuity (up to 55% of the elected base). The divided pension itself stops at the member’s death without it.' },
  { id: 'sbp_deemed_election', label: 'SBP deemed election — one-year deadline', citation: '10 U.S.C. § 1450(f)(3)(C)', url: 'https://www.law.cornell.edu/uscode/text/10/1450', verified: true, note: 'A former spouse must get a deemed-election request to DFAS within ONE YEAR of the court order/filing.' },
  { id: 'high3', label: 'Legacy High-3 multiplier (2.5%/yr) and High-3 definition', citation: 'Multiplier 10 U.S.C. § 1409(b)(1)(A); High-3 average 10 U.S.C. § 1407(c)(1)', url: 'https://www.law.cornell.edu/uscode/text/10/1409', verified: true, note: 'High-3 = average of the highest 36 months of basic pay ÷ 36 (basic pay only — excludes BAH/BAS).' },
  { id: 'brs', label: 'Blended Retirement System multiplier (2.0%/yr)', citation: '10 U.S.C. § 1409(b)(4)(A); enacted by §§ 631–635 of Pub. L. 114-92; effective Jan. 1, 2018', url: 'https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title10-section1409', verified: true, note: 'Members who first entered on/after Jan. 1, 2018 are in BRS; a limited 2018 opt-in window applied to some then-serving members.' },
  { id: 'reserve_points', label: 'Reserve/Guard — points ÷ 360 = equivalent years; age-60 deferral', citation: '10 U.S.C. § 12733 (points ÷ 360); § 12731(f) (default age 60, floor 50)', url: 'https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title10-section12733', verified: true, note: 'Reserve retired pay is generally deferred to age 60 (reducible to a floor of 50 with qualifying active service).' },
  { id: 'coverture', label: 'Coverture (marital) fraction — the "time rule"', citation: 'Judicially adopted apportionment method under USFSPA (not a statutory term)', url: 'https://www.law.cornell.edu/uscode/text/10/1408', verified: true, note: 'overlap-months ÷ total creditable-service months. A state-law/case-law construct, not defined in § 1408.' },
  { id: 'dfas_50pct_cap', label: 'DFAS 50% direct-pay cap', citation: '10 U.S.C. § 1408(e)(1) (65% aggregate with support garnishment)', url: 'https://www.law.cornell.edu/uscode/text/10/1408', verified: true, note: 'DFAS will not direct-pay a former spouse more than 50% of disposable retired pay for a property division.' },
  { id: 'asop_34', label: 'ASOP No. 34 — actuarial valuation in divorce', citation: 'Actuarial Standards Board, ASOP No. 34 — adopted Sept. 1999; revised June 2015', url: 'http://www.actuarialstandardsboard.org/asops/actuarial-practice-concerning-retirement-plan-benefits-in-domestic-relations-actions/', verified: true, note: 'Supports presenting a RANGE rather than a single point; emphasizes disclosing method, mortality table, discount rate, and retirement-age assumptions.' },
  { id: 'apv_methodology', label: 'Present value of a COLA-adjusted life annuity', citation: 'Standard actuarial present-value method; recognized methods incl. Life-Expectancy, PBGC, GATT', url: 'https://en.wikipedia.org/wiki/Actuarial_present_value', verified: true, note: 'PV is highly sensitive to the discount rate and mortality table. This tool illustrates that spread at a user-entered rate; it does not compute method-specific mortality or use live published rates.' },
  { id: 'ssa_life_table', label: 'SSA Period Life Table (life-expectancy anchor)', citation: 'SSA Office of the Actuary, Period Life Table (2021 table, 2024 Trustees Report)', url: 'https://www.ssa.gov/oact/STATS/table4c6_2021_TR2024.html', verified: true, note: 'Life-expectancy anchor by age and sex. Runs shorter than IRS § 7520 table factors — do not mix the two.' },
];

// Items the prototype flags as still requiring human verification — carried for
// provenance; the consumer report does not render them.
export const NEEDS_VERIFICATION = [
  'Rank → High-3 figures are CY2026 DFAS basic pay (effective Jan. 1, 2026), rounded. Validate the exact cell against the official DFAS table before non-prototype use, and replace with the member’s actual High-3 where known.',
  'Default assumptions (discount 4.5%, COLA 2.5%, life expectancy age 85) are illustrative editorial anchors, not authoritative rates. Have a CDFA® practitioner review and date-stamp the defaults and band widths.',
  'SBP premium (6.5% of base) and the 65% aggregate direct-pay cap are sourced to DoD FMR (Vol. 7B), not the face of § 1408 — pull the regulation for litigation-grade precision.',
];

// The three recognized valuation methods (the report's "why the methods differ"
// chips). Ported verbatim from the prototype's METHODS.
export const METHODS = [
  { key: 'lifeExp', name: 'Life-expectancy method', rateKey: 'rateLifeExp', driver: 'Life-expectancy table + a bond-based discount rate (e.g., high-grade municipal).' },
  { key: 'pbgc', name: 'PBGC method', rateKey: 'ratePbgc', driver: 'Group Annuity Mortality table + PBGC’s published immediate/deferred interest rates.' },
  { key: 'gatt', name: 'GATT / IRC § 417(e) method', rateKey: 'rateGatt', driver: 'Applicable mortality table + the 30-year Treasury rate or the § 417(e)(3) segment rates.' },
];
