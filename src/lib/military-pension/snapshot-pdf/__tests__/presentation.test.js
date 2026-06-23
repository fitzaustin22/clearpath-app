// Field-mapping + conditional-copy tests for the Snapshot report view-model.
// buildSnapshotModel turns the tool's inputs + getCalc() output into the plain
// data the @react-pdf document renders. These guard: (a) getCalc → report field
// mapping, (b) conditional flag copy for every branch, (c) the citation set
// (post-decision: match the audited tool + add § 1450(f)(3)(C)), (d) the
// PV-range rendering, and (e) the UPL guardrail (every flag is a question).
import { describe, it, expect } from 'vitest';
import { getCalc, usd, usdRange } from '../../getCalc';
import { buildSnapshotModel } from '../presentation';

const SEED = Object.freeze({
  system: 'unsure', serviceType: 'active', serviceStartDate: '2006-06',
  alreadyReceivingPay: false, yearsNow: '18', yearsAtRetirement: '20',
  pointsNow: '3200', pointsAtRetirement: '3800', high3Pay: '5500',
  vaWaiverMonthly: '', memberAge: '44', marriageDate: '2008-06',
  separationDate: '2024-06', awardPct: '50', sbpElected: 'unsure',
  discountRate: '4.5', colaRate: '2.5', lifeExpectancyAge: '85',
  rateLifeExp: '', ratePbgc: '', rateGatt: '',
});
const build = (overrides = {}) => {
  const inp = { ...SEED, ...overrides };
  return buildSnapshotModel({ inp, calc: getCalc(inp), preparedDate: 'June 23, 2026' });
};
const flagById = (model, id) => model.flags.find((f) => f.id === id);

describe('cover + result mapping (seed)', () => {
  const m = build();
  const c = getCalc(SEED);

  it('cover headline PV range is usdRange(low) – usdRange(high), en-dashed', () => {
    expect(m.cover.pvRange).toBe(`${usdRange(c.pvLow)} – ${usdRange(c.pvHigh)}`);
    expect(m.cover.pvRange).toMatch(/–/); // en dash, not hyphen
  });

  it('cover monthly figure is the spouse monthly share', () => {
    expect(m.cover.monthlyShare).toBe(usd(c.spouseMonthly)); // $1,100
  });

  it('result tiles carry real gross + share (NOT the mock placeholders)', () => {
    expect(m.result.gross).toBe('$2,475'); // 0.025*18*5500, frozen
    expect(m.result.gross).not.toBe('$2,750'); // mock placeholder must not survive
    expect(m.result.share).toBe('$1,100 / mo');
    expect(m.result.shareSub).toMatch(/44% of the pension/);
  });

  it('preparedDate passes through to the model', () => {
    expect(m.preparedDate).toBe('June 23, 2026');
  });
});

describe('recap tiles (derived from inputs)', () => {
  it('seed recap reflects assumed legacy system, active 20-yr service, $5,500, 16-yr overlap', () => {
    const m = build();
    const labels = Object.fromEntries(m.recap.map((t) => [t.label, t.value]));
    expect(labels['Retirement system']).toMatch(/2\.5%\/yr/);
    expect(labels['Service']).toMatch(/Active duty · 20 yrs at retirement/);
    expect(labels['High-3 monthly base pay']).toBe('$5,500 / month');
    expect(labels['Marriage overlap with service']).toMatch(/≈ 16 years · award 50%/);
  });

  it('BRS + reserve inputs change the system and service tiles', () => {
    const m = build({ system: 'brs', serviceType: 'reserve', alreadyReceivingPay: true });
    const labels = Object.fromEntries(m.recap.map((t) => [t.label, t.value]));
    expect(labels['Retirement system']).toMatch(/2\.0%\/yr/);
    expect(labels['Service']).toMatch(/Reserve/);
  });
});

describe('present-value range card', () => {
  it('lower/middle/higher use the ≈ usdRange forms of pvLow/pvBase/pvHigh', () => {
    const m = build();
    const c = getCalc(SEED);
    expect(m.pv.lower).toBe(`≈ ${usdRange(c.pvLow)}`);
    expect(m.pv.middle).toBe(`≈ ${usdRange(c.pvBase)}`);
    expect(m.pv.higher).toBe(`≈ ${usdRange(c.pvHigh)}`);
  });

  it('exposes the three valuation-method chips', () => {
    const m = build();
    expect(m.pv.methods).toHaveLength(3);
    expect(m.pv.methods.map((x) => x.name).join('|')).toMatch(/Life-expectancy.*PBGC.*GATT/);
  });
});

describe('conditional flags — tone + branch copy', () => {
  it('seed: 10/10 met → good tone, meets-10/10 body with the overlap years', () => {
    const f = flagById(build(), 'tenten');
    expect(f.tone).toBe('good');
    expect(f.body).toMatch(/likely meet 10\/10/);
    expect(f.body).toMatch(/16 years/);
  });

  it('short overlap: 10/10 NOT met → caution tone, different body', () => {
    const f = flagById(build({ marriageDate: '2020-06' }), 'tenten');
    expect(f.tone).toBe('caution');
    expect(f.body).toMatch(/under 10|don't meet 10\/10|not.*entitlement|still award/i);
  });

  it('seed (post-2016, not retired): frozen flag → info tone, freeze-applies body', () => {
    const f = flagById(build(), 'frozen');
    expect(f.tone).toBe('info');
    expect(f.body).toMatch(/frozen to/);
  });

  it('already receiving pay: frozen flag explains the freeze does NOT apply', () => {
    const f = flagById(build({ alreadyReceivingPay: true }), 'frozen');
    expect(f.body).toMatch(/already drawing retired pay|freeze doesn't apply/);
  });

  it('on the Dec-23-2016 boundary: frozen flag surfaces the exact-date caution', () => {
    const f = flagById(build({ separationDate: '2016-12' }), 'frozen');
    expect(f.body).toMatch(/right at the cutoff|exact decree date/);
  });

  it('seed (SBP unsure): SBP flag → caution, "stops when the retiree dies" body', () => {
    const f = flagById(build(), 'sbp');
    expect(f.tone).toBe('caution');
    expect(f.body).toMatch(/stops when the retiree dies/);
  });

  it('SBP elected: SBP flag → good tone, coverage-in-place body', () => {
    const f = flagById(build({ sbpElected: 'yes' }), 'sbp');
    expect(f.tone).toBe('good');
    expect(f.body).toMatch(/coverage in place|can continue to you/);
  });

  it('VA flag is always present, caution tone', () => {
    const f = flagById(build(), 'va');
    expect(f.tone).toBe('caution');
  });
});

describe('citations — match audited tool + add § 1450(f)(3)(C)', () => {
  const m = build();
  it('10/10 flag cites § 1408(d)(2)', () => {
    expect(flagById(m, 'tenten').cite).toMatch(/1408\(d\)\(2\)/);
  });
  it('frozen flag restores § 1408(a)(4)(B) alongside Pub. L. 114-328, with the operative cutoff date', () => {
    expect(flagById(m, 'frozen').cite).toMatch(/114-328/);
    expect(flagById(m, 'frozen').cite).toMatch(/1408\(a\)\(4\)\(B\)/);
    expect(flagById(m, 'frozen').cite).toMatch(/Dec\. 23, 2016/); // audited SOURCES form
  });
  it('SBP flag carries §§ 1447–1455 AND the added § 1450(f)(3)(C)', () => {
    expect(flagById(m, 'sbp').cite).toMatch(/1447/);
    expect(flagById(m, 'sbp').cite).toMatch(/1450\(f\)\(3\)\(C\)/);
  });
  it('VA flag carries full attorney-grade reporter cites for all three cases', () => {
    const cite = flagById(m, 'va').cite;
    expect(cite).toMatch(/Mansell v\. Mansell, 490 U\.S\. 581 \(1989\)/);
    expect(cite).toMatch(/Howell v\. Howell, 581 U\.S\. 214, 137 S\. Ct\. 1400 \(2017\)/);
    expect(cite).toMatch(/Yourko v\. Yourko, 302 Va\. 149 \(2023\)/);
    expect(cite).not.toMatch(/Mansell \(1989\)/); // never a bare-year abbreviation
  });

  it('no flag cite abbreviates a case name to a bare year (e.g. "Mansell (1989)")', () => {
    // A capitalized word immediately followed by a parenthesised 4-digit year,
    // with no reporter in between — the bare-year form we forbid.
    for (const f of m.flags) {
      expect(f.cite, `bare-year cite in ${f.id}: ${f.cite}`).not.toMatch(/[A-Z][A-Za-z]+ \(\d{4}\)/);
    }
  });
});

describe('UPL guardrail — everything actionable is a question, never advice', () => {
  it('every flag body frames the action as a question to the attorney', () => {
    for (const f of build().flags) {
      expect(f.body).toMatch(/Ask your attorney:/);
    }
  });
  it('checklist has the 7 prep items and the cover/closing disclaimers are present', () => {
    const m = build();
    expect(m.checklist).toHaveLength(7);
    expect(m.disclaimer).toMatch(/not a law firm/i);
    expect(m.coverDisclaimer).toMatch(/Not legal advice/i);
  });
});
