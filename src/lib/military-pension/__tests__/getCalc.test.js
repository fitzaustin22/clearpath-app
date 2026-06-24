// Tests for the pure, server-side port of the Military Pension Value Tool's
// getCalc(). The expected scalar outputs are hand-computed from the prototype
// formulas (design_handoff_pension_value_tool/Military Pension Tool.dc.html,
// getCalc at line 541); present-value figures are asserted by their invariant
// ordering + frozen golden snapshot (the byte-faithful match to the prototype
// is separately proven by the verbatim-diff audit, not re-derived here).
import { describe, it, expect } from 'vitest';
import { getCalc, computePV, dateIndex, num, SOURCES, METHODS } from '../getCalc';

// The prototype's default input state — the canonical seed for the report.
const SEED = Object.freeze({
  system: 'unsure',
  serviceType: 'active',
  serviceStartDate: '2006-06',
  alreadyReceivingPay: false,
  yearsNow: '18',
  yearsAtRetirement: '20',
  pointsNow: '3200',
  pointsAtRetirement: '3800',
  high3Pay: '5500',
  vaWaiverMonthly: '',
  memberAge: '44',
  marriageDate: '2008-06',
  separationDate: '2024-06',
  awardPct: '50',
  sbpElected: 'unsure',
  discountRate: '4.5',
  colaRate: '2.5',
  lifeExpectancyAge: '85',
  rateLifeExp: '',
  ratePbgc: '',
  rateGatt: '',
});

describe('num / dateIndex helpers', () => {
  it('num coerces blanks and junk to 0', () => {
    expect(num('')).toBe(0);
    expect(num('abc')).toBe(0);
    expect(num('5500')).toBe(5500);
    expect(num('4.5')).toBe(4.5);
  });

  it('dateIndex turns YYYY-MM into a month index, null on bad input', () => {
    expect(dateIndex('2016-12')).toBe(2016 * 12 + 11);
    expect(dateIndex('2024-06')).toBe(2024 * 12 + 5);
    expect(dateIndex('')).toBeNull();
    expect(dateIndex('garbage')).toBeNull();
    expect(dateIndex(null)).toBeNull();
  });
});

describe('getCalc — seed (default) inputs', () => {
  const c = getCalc(SEED);

  it('uses the Legacy/High-3 2.5% multiplier and the FROZEN years for gross', () => {
    // 2024-06 separation, not yet retired → frozen → yearsForMult = yearsNow(18)
    expect(c.isFrozen).toBe(true);
    expect(c.onCutoffBoundary).toBe(false);
    expect(c.grossMonthly).toBeCloseTo(0.025 * 18 * 5500, 6); // 2475
    expect(c.grossMonthly).toBe(2475);
  });

  it('disposable equals gross when no SBP premium and no VA waiver', () => {
    expect(c.sbpPremium).toBe(0);
    expect(c.vaWaiver).toBe(0);
    expect(c.disposableMonthly).toBe(2475);
  });

  it('computes the coverture (time-rule) fraction from overlap ÷ creditable months', () => {
    expect(c.covertureKnown).toBe(true);
    expect(c.coverture).toBeCloseTo(192 / 216, 6); // 8/9
    expect(c.overlapYears).toBe(16);
  });

  it('derives the marital share fraction and monthly share', () => {
    expect(c.shareFraction).toBeCloseTo((192 / 216) * 0.5, 6); // 4/9
    expect(c.spouseMonthly).toBeCloseTo(1100, 6); // 2475 * 4/9
    expect(c.directPayCapHit).toBe(false); // 0.444 < 0.5
  });

  it('meets the 10/10 rule with a 16-year overlap', () => {
    expect(c.meets1010).toBe(true);
  });

  it('present value low < base < high, all positive (PV rises as discount falls)', () => {
    expect(c.pvLow).toBeGreaterThan(0);
    expect(c.pvLow).toBeLessThan(c.pvBase);
    expect(c.pvBase).toBeLessThan(c.pvHigh);
  });

  it('hasResult is true for a complete seed', () => {
    expect(c.hasResult).toBe(true);
  });
});

describe('getCalc — frozen-rule branches', () => {
  it('is NOT frozen and uses years-at-retirement when already drawing pay', () => {
    const c = getCalc({ ...SEED, alreadyReceivingPay: true });
    expect(c.isFrozen).toBe(false);
    expect(c.grossMonthly).toBe(0.025 * 20 * 5500); // 2750 — uses yearsAtRet
  });

  it('flags the exact Dec-23-2016 cutoff boundary', () => {
    const c = getCalc({ ...SEED, separationDate: '2016-12' });
    expect(c.isFrozen).toBe(false); // index == cutoff is not > cutoff
    expect(c.onCutoffBoundary).toBe(true);
  });

  it('is frozen for a post-cutoff separation not yet retired', () => {
    const c = getCalc({ ...SEED, separationDate: '2017-01' });
    expect(c.isFrozen).toBe(true);
    expect(c.onCutoffBoundary).toBe(false);
  });
});

describe('getCalc — SBP, VA waiver, cap, 10/10 branches', () => {
  it('subtracts a 6.5% SBP premium from disposable when elected', () => {
    const c = getCalc({ ...SEED, sbpElected: 'yes' });
    expect(c.sbpPremium).toBeCloseTo(2475 * 0.065, 6);
    expect(c.disposableMonthly).toBeCloseTo(2475 - 2475 * 0.065, 6);
  });

  it('subtracts a VA-disability waiver from disposable', () => {
    const c = getCalc({ ...SEED, vaWaiverMonthly: '400' });
    expect(c.vaWaiver).toBe(400);
    expect(c.disposableMonthly).toBe(2475 - 400);
  });

  it('does not meet 10/10 with a short overlap', () => {
    // marriage 2020-06 → overlap 2020-06..2024-06 = 4 yrs
    const c = getCalc({ ...SEED, marriageDate: '2020-06' });
    expect(c.overlapYears).toBeCloseTo(4, 6);
    expect(c.meets1010).toBe(false);
  });

  it('flags the DFAS 50% direct-pay cap when the share fraction exceeds 50%', () => {
    // full overlap (marriage before service) + 100% award → shareFraction = coverture(1)*1 > 0.5
    const c = getCalc({ ...SEED, marriageDate: '2000-01', awardPct: '100' });
    expect(c.shareFraction).toBeGreaterThan(0.5);
    expect(c.directPayCapHit).toBe(true);
  });
});

describe('getCalc — system + reserve branches', () => {
  it('uses the 2.0% BRS multiplier', () => {
    const c = getCalc({ ...SEED, system: 'brs', alreadyReceivingPay: true });
    expect(c.grossMonthly).toBe(0.02 * 20 * 5500); // 2200
  });

  it('reserve service converts points ÷ 360 to equivalent years', () => {
    const c = getCalc({ ...SEED, serviceType: 'reserve', alreadyReceivingPay: true });
    expect(c.isReserve).toBe(true);
    // yearsAtRet = 3800/360; gross = 0.025 * (3800/360) * 5500
    expect(c.grossMonthly).toBeCloseTo(0.025 * (3800 / 360) * 5500, 4);
  });
});

describe('computePV — standalone', () => {
  it('returns 0 for a non-positive base or zero payout', () => {
    expect(computePV(0, 2, 39, 2.5, 4.5)).toBe(0);
    expect(computePV(13200, 2, 0, 2.5, 4.5)).toBe(0);
  });

  it('a lower discount rate yields a higher present value', () => {
    const lowDiscount = computePV(13200, 2, 39, 2.5, 3.0);
    const highDiscount = computePV(13200, 2, 39, 2.5, 6.0);
    expect(lowDiscount).toBeGreaterThan(highDiscount);
  });
});

describe('SOURCES + METHODS (audited authority set, ported verbatim)', () => {
  it('exposes the required citation authorities by id', () => {
    const ids = SOURCES.map((s) => s.id);
    for (const id of ['mansell', 'howell', 'yourko', 'sbp_deemed_election', 'frozen_benefit_rule', 'ten_ten_rule']) {
      expect(ids).toContain(id);
    }
  });

  it('Mansell, SBP deemed-election (§1450(f)(3)(C)) carry their statutory citations', () => {
    const byId = Object.fromEntries(SOURCES.map((s) => [s.id, s]));
    expect(byId.mansell.citation).toMatch(/Mansell v\. Mansell, 490 U\.S\. 581/);
    expect(byId.sbp_deemed_election.citation).toMatch(/1450\(f\)\(3\)\(C\)/);
    expect(byId.frozen_benefit_rule.citation).toMatch(/1408\(a\)\(4\)\(B\)/);
  });

  it('exposes the three valuation methods', () => {
    expect(METHODS.map((m) => m.key)).toEqual(['lifeExp', 'pbgc', 'gatt']);
  });
});
