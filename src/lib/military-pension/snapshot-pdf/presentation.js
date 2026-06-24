// src/lib/military-pension/snapshot-pdf/presentation.js
//
// Turns the tool's inputs + getCalc() output into the plain view-model the
// @react-pdf document renders. All number formatting goes through getCalc's
// own usd/usdRange/pct (the same formatters the tool uses), so the report and
// the tool can never drift. No model/format logic lives in the components.
import { num, usd, usdRange, pct } from '../getCalc';
import {
  COPY, METHOD_CHIPS, CHECKLIST, CTA, COVER_DISCLAIMER, DISCLAIMER,
  tenTenFlag, frozenFlag, sbpFlag, vaFlag,
} from './copy';

function systemLabel(inp) {
  if (inp.system === 'brs') return 'Blended Retirement System · 2.0%/yr';
  if (inp.system === 'legacy') return 'Legacy / High-3 · 2.5%/yr';
  return 'High-3 · 2.5%/yr (assumed)'; // 'unsure' — multiplier defaults to legacy 2.5%
}

function serviceLabel(inp, calc) {
  if (calc.isReserve) {
    const eq = num(inp.pointsAtRetirement) / 360;
    return `Reserve / Guard · ≈ ${eq.toFixed(0)} equiv. yrs at retirement`;
  }
  const yrs = num(inp.yearsAtRetirement) || num(inp.yearsNow);
  return `Active duty · ${yrs} yrs at retirement`;
}

function recapTiles(inp, calc) {
  return [
    { label: 'Retirement system', value: systemLabel(inp) },
    { label: 'Service', value: serviceLabel(inp, calc) },
    { label: 'High-3 monthly base pay', value: `${usd(num(inp.high3Pay))} / month` },
    { label: 'Marriage overlap with service', value: `≈ ${Math.round(Math.max(0, calc.overlapYears))} years · award ${inp.awardPct}%` },
  ];
}

/**
 * @param {object} args
 * @param {object} args.inp           the tool's input field map
 * @param {object} args.calc          getCalc(inp) output
 * @param {string} args.preparedDate  display date string (e.g. "June 23, 2026")
 * @returns {object} plain view-model consumed by SnapshotReportDocument
 */
export function buildSnapshotModel({ inp, calc, preparedDate }) {
  return {
    preparedDate,
    copy: COPY,
    coverDisclaimer: COVER_DISCLAIMER,
    disclaimer: DISCLAIMER,

    cover: {
      pvRange: `${usdRange(calc.pvLow)} – ${usdRange(calc.pvHigh)}`,
      monthlyShare: usd(calc.spouseMonthly),
      monthlyNote: `≈ ${usd(calc.spouseMonthly)} / month once payments begin · a range, not a single number`,
    },

    recap: recapTiles(inp, calc),

    result: {
      gross: usd(calc.grossMonthly),
      grossSub: calc.isFrozen ? COPY.resultSection.grossSubFrozen : COPY.resultSection.grossSub,
      share: `${usd(calc.spouseMonthly)} / mo`,
      shareSub: `≈ ${pct(calc.shareFraction, 0)} of the pension / month`,
      explainer: COPY.resultSection.explainer,
    },

    pv: {
      lower: `≈ ${usdRange(calc.pvLow)}`,
      middle: `≈ ${usdRange(calc.pvBase)}`,
      higher: `≈ ${usdRange(calc.pvHigh)}`,
      methods: METHOD_CHIPS,
    },

    flags: [tenTenFlag(calc), frozenFlag(inp, calc), sbpFlag(inp), vaFlag()],

    checklist: CHECKLIST,
    cta: CTA,
  };
}
