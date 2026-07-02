// src/lib/supportRange/computeSupportRange.js
//
// Pure support-estimate math for the Module 5 Support Estimator wizard (the
// design bundle's documented uniform-AAML rule-of-thumb math, ported verbatim
// from `Support Estimator.dc.html`). Region is DISPLAY-ONLY here: it never
// affects a dollar figure; it only feeds copy. State-specific statutory math
// lives in the retained src/lib/supportEstimator/ engine, which this module
// intentionally does NOT use.

export const RANGE_SPREAD = 0.15; // tunable (prototype data-prop: 0.05–0.40)
export const ROUND_TO = 25;       // tunable (prototype data-prop: 5–100)

const PCT_BY_N = { 0: 0, 1: 0.17, 2: 0.25, 3: 0.29, 4: 0.31, 5: 0.34 };

export const STATE_NAMES = {
  VA: 'Virginia', MD: 'Maryland', DC: 'Washington, D.C.', NY: 'New York', CA: 'California',
};

// Strips all non-numeric chars incl. sign/commas; callers pass unsigned monthly amounts (verbatim from the design prototype).
const num = (v) => {
  const n = parseFloat(String(v).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
};
const money = (n) => '$' + Math.round(n).toLocaleString('en-US');

export const roundToIncrement = (n, step = ROUND_TO) => Math.round(n / step) * step;

export function computeSupport(inputs) {
  const you = num(inputs.incomeYou);
  const sp = num(inputs.incomeSpouse);
  const combined = you + sp;
  const n = Math.min(5, parseInt(inputs.numChildren, 10) || 0);
  const childcare = num(inputs.childcare);
  const health = num(inputs.health);
  const existing = num(inputs.existingSupport);
  const yearsM = num(inputs.marriageYears);
  const herTime = Math.min(100, Math.max(0, num(inputs.parentingPct))) / 100;
  const spTime = 1 - herTime;

  const payorInc = Math.max(you, sp);
  const payeeInc = Math.min(you, sp);
  const sheIsPayee = you <= sp;
  const payorEff = Math.max(0, payorInc - existing);
  let alimony = 0.30 * payorEff - 0.20 * payeeInc;
  const cap = 0.40 * combined - payeeInc;
  alimony = Math.max(0, Math.min(alimony, Math.max(0, cap)));

  const basic = combined > 0 ? combined * (PCT_BY_N[n] || 0) : 0;
  const totalNeed = basic + childcare + health;
  const youShare = combined > 0 ? you / combined : 0;
  const spShare = combined > 0 ? sp / combined : 0;
  const spOwes = totalNeed * spShare * herTime;
  const youOwes = totalNeed * youShare * spTime;
  const childToHer = spOwes - youOwes;

  return {
    you, sp, combined, n, childcare, health, existing, yearsM, herTime, spTime,
    sheIsPayee, alimony, childToHer, totalNeed, basic, payorInc, payeeInc, youShare, spShare,
  };
}

export function deriveSupportEstimate(inputs, opts = {}) {
  const spread = opts.spread ?? RANGE_SPREAD;
  const step = opts.roundTo ?? ROUND_TO;
  const c = computeSupport(inputs);
  const band = (v) => ({
    low: roundToIncrement((1 - spread) * v, step),
    likely: roundToIncrement(v, step),
    high: roundToIncrement((1 + spread) * v, step),
  });

  // Spousal (from her perspective)
  const aMag = c.alimony;
  const spousal = { ...band(aMag) };
  if (aMag < 1) {
    spousal.direction = 'none';
    spousal.label = 'No spousal support indicated';
    spousal.driver = 'Your incomes are close enough that the guideline points to little or no spousal support.';
  } else if (c.sheIsPayee) {
    spousal.direction = 'receive';
    spousal.label = 'Spousal support you may receive';
    spousal.driver = 'Your spouse earns about ' + money(c.payorInc - c.payeeInc) + ' more each month, so the guideline shifts some of that over to you.';
  } else {
    spousal.direction = 'pay';
    spousal.label = 'Spousal support you may pay';
    spousal.driver = 'You earn about ' + money(c.payorInc - c.payeeInc) + ' more each month, so the guideline has you helping close that gap.';
  }

  // Child (from her perspective)
  const childMag = Math.abs(c.childToHer);
  const child = { ...band(childMag) };
  if (c.n === 0) {
    child.direction = 'none';
    child.label = 'No child support';
    child.driver = 'You told us there are no children to support.';
  } else if (childMag < 1) {
    // Twin of the spousal aMag < 1 zero-state (2026-07 design refinement): a ~$0
    // computation renders the calm label+sentence, never a $0/$0/$0 band. Copy
    // echoes only the real input the tool has (the custody split) plus the calm
    // finding — no cost/income rationale the engine didn't actually compute.
    child.direction = 'none';
    child.label = 'No child support indicated';
    child.driver = 'With ' + c.n + (c.n === 1 ? ' child' : ' children') + ' in your care ' + Math.round(c.herTime * 100) + '% of nights, the guideline points to little or no child support changing hands here.';
  } else if (c.childToHer >= 0) {
    child.direction = 'receive';
    child.label = 'Child support you may receive';
    child.driver = 'With ' + c.n + (c.n === 1 ? ' child' : ' children') + ' in your care ' + Math.round(c.herTime * 100) + '% of nights, your spouse covers their share of the children’s costs.';
  } else {
    child.direction = 'pay';
    child.label = 'Child support you may pay';
    child.driver = 'The children are with their other parent most nights, so you cover your share of their costs.';
  }

  // Combined (net to her)
  const netToHer = (c.sheIsPayee ? aMag : -aMag) + c.childToHer;
  const combinedSection = {
    direction: netToHer >= 0 ? 'receive' : 'pay',
    headline: roundToIncrement(Math.abs(netToHer), step),
    sub: netToHer >= 0
      ? 'Estimated total support you may receive each month'
      : 'Estimated total support you may pay each month',
  };

  // Duration (spousal): blank if no spousal / no marriage length entered
  // Prototype-faithful: a typed "0" (not blank) yields "About 1 year". Intentional — do not "fix" without product sign-off.
  // (The former ~$0-child "receive" band got that sign-off: it now renders the 'none' zero-state above.)
  let duration;
  if (aMag < 1 || inputs.marriageYears === '' || inputs.marriageYears == null) {
    duration = '—';
  } else if (c.yearsM >= 20) {
    duration = 'Often long-term';
  } else {
    const d = Math.max(1, Math.round(c.yearsM * 0.4));
    duration = 'About ' + d + (d === 1 ? ' year' : ' years');
  }

  const stateName = STATE_NAMES[inputs.region] ?? inputs.region ?? '';
  const summaryLine = stateName + ' · ' +
    (c.n > 0 ? c.n + (c.n === 1 ? ' child' : ' children') : 'no children') +
    ' · AAML guideline';

  return {
    spousal, child, combined: combinedSection, duration, summaryLine, stateName,
    pctYou: Math.round(c.herTime * 100),
    pctSpouse: 100 - Math.round(c.herTime * 100),
    nightsYou: Math.round(c.herTime * 365),
    nightsSpouse: 365 - Math.round(c.herTime * 365),
    hasKids: c.n > 0,
    _netToHer: netToHer,
    _payorMonthly: c.payorInc,
    _payeeMonthly: c.payeeInc,
    _numChildren: c.n,
  };
}
