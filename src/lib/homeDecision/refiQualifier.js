// src/lib/homeDecision/refiQualifier.js
//
// Refi qualification verdict per M5-Tool-Specs.md §9.6.2 (Q-10).
// Three-state output (green / yellow / red) with binding-constraint case
// branching: 'dti' | 'credit' | 'margin-of-safety' | 'multiple' | 'underwater' | 'none'.
//
// Computation order:
//   1. Underwater short-circuit (per §9.4.3 / §9.6.2 Session 23 revision)
//   2. DTI matrix (top-to-bottom, first-match-wins; margin-of-safety rows are
//      closed-on-upper per Session 23 decision)
//   3. Modifier rules (downgrade-only): LTV > 80% and credit fair downgrade
//      green → yellow; credit poor forces red
//   4. Binding-constraint computation

import { isUnderwater } from './ltvCalculator';

const LTV_PMI_THRESHOLD = 0.80;

const DTI_THRESHOLD = {
  FE_MARGIN_LOW: 0.26,
  FE_MARGIN_HIGH: 0.28,
  BE_MARGIN_LOW: 0.34,
  BE_MARGIN_HIGH: 0.36,
  FE_BORDERLINE_HIGH: 0.30,
  BE_BORDERLINE_HIGH: 0.38,
};

/**
 * DTI matrix evaluation per §9.6.2 (Session 23 closed-on-upper for margin-of-safety).
 *
 * @param {Object} args
 * @param {number} args.frontEndDti
 * @param {number} args.backEndDti
 * @returns {{ tier: 'green'|'yellow'|'red', subtype: string }}
 */
function evaluateDtiMatrix({ frontEndDti, backEndDti }) {
  const {
    FE_MARGIN_LOW, FE_MARGIN_HIGH,
    BE_MARGIN_LOW, BE_MARGIN_HIGH,
    FE_BORDERLINE_HIGH, BE_BORDERLINE_HIGH,
  } = DTI_THRESHOLD;

  // Row 1: front-end margin-of-safety [26%, 28%] closed-on-upper
  if (
    frontEndDti >= FE_MARGIN_LOW &&
    frontEndDti <= FE_MARGIN_HIGH &&
    backEndDti <= BE_MARGIN_HIGH
  ) {
    return { tier: 'yellow', subtype: 'margin-of-safety-front-end' };
  }
  // Row 2: back-end margin-of-safety [34%, 36%] closed-on-upper
  if (
    frontEndDti <= FE_MARGIN_HIGH &&
    backEndDti >= BE_MARGIN_LOW &&
    backEndDti <= BE_MARGIN_HIGH
  ) {
    return { tier: 'yellow', subtype: 'margin-of-safety-back-end' };
  }
  // Row 3: green
  if (frontEndDti <= FE_MARGIN_HIGH && backEndDti <= BE_MARGIN_HIGH) {
    return { tier: 'green', subtype: 'qualifies' };
  }
  // Row 4: back-end borderline
  if (frontEndDti <= FE_MARGIN_HIGH && backEndDti <= BE_BORDERLINE_HIGH) {
    return { tier: 'yellow', subtype: 'back-end-borderline' };
  }
  // Row 5: front-end borderline
  if (frontEndDti <= FE_BORDERLINE_HIGH && backEndDti <= BE_MARGIN_HIGH) {
    return { tier: 'yellow', subtype: 'front-end-borderline' };
  }
  // Rows 6-7: red (high DTI)
  return { tier: 'red', subtype: 'dti-exceeded' };
}

function applyModifiers(baseTier, { ltv, creditBand }) {
  if (creditBand === 'poor') return 'red';
  if (baseTier === 'green' && (ltv > LTV_PMI_THRESHOLD || creditBand === 'fair')) {
    return 'yellow';
  }
  return baseTier;
}

function computeBindingConstraint({
  baseDtiResult,
  finalTier,
  ltv,
  creditBand,
  underwater,
}) {
  if (underwater) return 'underwater';
  if (finalTier === 'green') return 'none';

  const dtiContributes = baseDtiResult.tier !== 'green';
  const modifierContributes = ltv > LTV_PMI_THRESHOLD || creditBand === 'fair' || creditBand === 'poor';
  const dtiIsMarginOfSafety = baseDtiResult.subtype.startsWith('margin-of-safety');

  if (dtiIsMarginOfSafety) {
    return modifierContributes ? 'multiple' : 'margin-of-safety';
  }
  if (dtiContributes && modifierContributes) return 'multiple';
  if (dtiContributes && !modifierContributes) return 'dti';
  return 'credit';
}

function formatPercent(decimal) {
  return `${Math.round(decimal * 100)}%`;
}

function formatDollars(amount) {
  return `$${amount.toLocaleString('en-US')}`;
}

function buildUnderwaterNarrative({ currentFMV, existingMortgageBalance }) {
  return (
    `Your home's current FMV (${formatDollars(currentFMV)}) is below the outstanding mortgage ` +
    `balance (${formatDollars(existingMortgageBalance)}). Refinancing requires positive equity; ` +
    `the Keep & refi scenario is not viable at this LTV. Sell-now and Deferred-sale projections ` +
    `remain meaningful — discuss with your CDFA whether a short-sale, lender modification, or ` +
    `deferred-sale strategy fits your situation.`
  );
}

function buildVerdictNarrative({
  bindingConstraint,
  baseDtiResult,
  frontEndDti,
  backEndDti,
  ltv,
  creditBand,
  currentFMV,
  existingMortgageBalance,
}) {
  if (bindingConstraint === 'underwater') {
    return buildUnderwaterNarrative({ currentFMV, existingMortgageBalance });
  }
  if (bindingConstraint === 'none') return null;

  if (bindingConstraint === 'dti') {
    if (backEndDti > DTI_THRESHOLD.BE_BORDERLINE_HIGH) {
      return `Back-end DTI of ${formatPercent(backEndDti)} exceeds the 38% threshold. Discuss with your CDFA.`;
    }
    if (frontEndDti > DTI_THRESHOLD.FE_BORDERLINE_HIGH) {
      return `Front-end DTI of ${formatPercent(frontEndDti)} exceeds the 30% threshold. Discuss with your CDFA.`;
    }
    if (baseDtiResult.subtype === 'back-end-borderline') {
      return `Back-end DTI at ${formatPercent(backEndDti)} is in the borderline 36–38% zone. Discuss with your CDFA.`;
    }
    if (baseDtiResult.subtype === 'front-end-borderline') {
      return `Front-end DTI at ${formatPercent(frontEndDti)} is in the borderline 28–30% zone. Discuss with your CDFA.`;
    }
    return 'DTI is the binding constraint. Discuss with your CDFA.';
  }

  if (bindingConstraint === 'credit') {
    if (creditBand === 'poor') {
      return `Your DTI ratios fall in the qualifying range, but \`poor\` credit (<580) typically routes a verdict to "likely doesn't qualify." Discuss with your CDFA about credit-improvement runway before refi application.`;
    }
    if (creditBand === 'fair') {
      return `Your DTI ratios fall in the qualifying range, but \`fair\` credit (580–669) typically downgrades a 'likely qualifies' verdict to borderline. Discuss with your CDFA about credit-improvement runway before refi application.`;
    }
    if (ltv > LTV_PMI_THRESHOLD) {
      return `Your DTI ratios fall in the qualifying range, but LTV at ${formatPercent(ltv)} exceeds 80% which moves the verdict to borderline. Discuss with your CDFA.`;
    }
    return 'A credit or LTV modifier is the binding constraint. Discuss with your CDFA.';
  }

  if (bindingConstraint === 'margin-of-safety') {
    const feProximity = baseDtiResult.subtype === 'margin-of-safety-front-end';
    const beProximity = baseDtiResult.subtype === 'margin-of-safety-back-end';
    const feInBand = frontEndDti >= DTI_THRESHOLD.FE_MARGIN_LOW && frontEndDti <= DTI_THRESHOLD.FE_MARGIN_HIGH;
    const beInBand = backEndDti >= DTI_THRESHOLD.BE_MARGIN_LOW && backEndDti <= DTI_THRESHOLD.BE_MARGIN_HIGH;
    if (feInBand && beInBand) {
      return `Your DTI ratios pass the qualifying thresholds, but both your front-end and back-end DTI land within 2 percentage points of their limits. Some lenders apply tighter overlays at this margin. Discuss with your CDFA.`;
    }
    if (feProximity) {
      return `Your DTI ratios pass the qualifying thresholds, but your front-end DTI lands within 2 percentage points of the limit. Some lenders apply tighter overlays at this margin. Discuss with your CDFA.`;
    }
    if (beProximity) {
      return `Your DTI ratios pass the qualifying thresholds, but your back-end DTI lands within 2 percentage points of the limit. Some lenders apply tighter overlays at this margin. Discuss with your CDFA.`;
    }
    return 'DTI ratios are within 2 percentage points of the qualifying limit. Discuss with your CDFA.';
  }

  // multiple
  const parts = [];
  if (baseDtiResult.subtype === 'back-end-borderline') {
    parts.push(`back-end DTI at ${formatPercent(backEndDti)} is in the borderline zone`);
  } else if (baseDtiResult.subtype === 'front-end-borderline') {
    parts.push(`front-end DTI at ${formatPercent(frontEndDti)} is in the borderline zone`);
  } else if (baseDtiResult.subtype === 'dti-exceeded') {
    parts.push(`DTI ratios exceed the qualifying thresholds`);
  } else if (baseDtiResult.subtype.startsWith('margin-of-safety')) {
    parts.push(`DTI ratios are within 2 percentage points of the limit`);
  }
  if (ltv > LTV_PMI_THRESHOLD) {
    parts.push(`LTV at ${formatPercent(ltv)} adds further pressure`);
  }
  if (creditBand === 'fair') {
    parts.push(`\`fair\` credit (580–669) adds further pressure`);
  } else if (creditBand === 'poor') {
    parts.push(`\`poor\` credit (<580) adds further pressure`);
  }
  const joined = parts.join(', and ');
  return `${joined.charAt(0).toUpperCase()}${joined.slice(1)}. Discuss with your CDFA.`;
}

/**
 * Top-level refi-qualifier evaluation per §9.6.2.
 *
 * @param {Object} args
 * @param {number} args.frontEndDti - decimal (e.g., 0.25 for 25%)
 * @param {number} args.backEndDti - decimal
 * @param {number} args.ltv - decimal
 * @param {'excellent'|'good'|'fair'|'poor'} args.creditBand
 * @param {number} args.currentFMV
 * @param {number} args.existingMortgageBalance
 * @returns {{
 *   verdictTier: 'green'|'yellow'|'red',
 *   bindingConstraint: 'dti'|'credit'|'margin-of-safety'|'multiple'|'underwater'|'none',
 *   narrative: string | null
 * }}
 */
export function evaluateRefiVerdict({
  frontEndDti,
  backEndDti,
  ltv,
  creditBand,
  currentFMV,
  existingMortgageBalance,
}) {
  const underwater = isUnderwater({ currentFMV, existingMortgageBalance });

  if (underwater) {
    return {
      verdictTier: 'red',
      bindingConstraint: 'underwater',
      narrative: buildUnderwaterNarrative({ currentFMV, existingMortgageBalance }),
    };
  }

  const baseDtiResult = evaluateDtiMatrix({ frontEndDti, backEndDti });
  const finalTier = applyModifiers(baseDtiResult.tier, { ltv, creditBand });
  const bindingConstraint = computeBindingConstraint({
    baseDtiResult,
    finalTier,
    ltv,
    creditBand,
    underwater: false,
  });
  const narrative = buildVerdictNarrative({
    bindingConstraint,
    baseDtiResult,
    frontEndDti,
    backEndDti,
    ltv,
    creditBand,
    currentFMV,
    existingMortgageBalance,
  });

  return { verdictTier: finalTier, bindingConstraint, narrative };
}
