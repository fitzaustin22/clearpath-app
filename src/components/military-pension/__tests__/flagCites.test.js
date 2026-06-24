// Part C — the tool's four on-screen flag citations must carry the same
// authorities the audited report does (derived from getCalc's SOURCES). Concise
// form is fine; no authority may be missing, and no case may be abbreviated to a
// bare year (the design prototype's "Mansell (1989)" form is forbidden).
import { describe, it, expect } from 'vitest';
import { FLAG_CITES } from '../MilitaryPensionTool';

describe('tool flag citations — complete vs the audited authorities', () => {
  it('10/10 flag cites § 1408(d)(2)', () => {
    expect(FLAG_CITES.tenten).toMatch(/1408\(d\)\(2\)/);
  });

  it('frozen flag cites Pub. L. 114-328 + § 1408(a)(4)(B) + the Dec. 23, 2016 cutoff', () => {
    expect(FLAG_CITES.frozen).toMatch(/114-328/);
    expect(FLAG_CITES.frozen).toMatch(/1408\(a\)\(4\)\(B\)/);
    expect(FLAG_CITES.frozen).toMatch(/Dec\. 23, 2016/);
  });

  it('SBP flag cites §§ 1447–1455 AND § 1450(f)(3)(C)', () => {
    expect(FLAG_CITES.sbp).toMatch(/1447/);
    expect(FLAG_CITES.sbp).toMatch(/1450\(f\)\(3\)\(C\)/);
  });

  it('VA flag carries full reporter cites for Mansell, Howell, and Yourko', () => {
    expect(FLAG_CITES.va).toMatch(/Mansell v\. Mansell, 490 U\.S\. 581 \(1989\)/);
    expect(FLAG_CITES.va).toMatch(/Howell v\. Howell, 581 U\.S\. 214, 137 S\. Ct\. 1400 \(2017\)/);
    expect(FLAG_CITES.va).toMatch(/Yourko v\. Yourko, 302 Va\. 149 \(2023\)/);
  });

  it('no flag cite abbreviates a case name to a bare year (e.g. "Mansell (1989)")', () => {
    for (const v of Object.values(FLAG_CITES)) {
      expect(v, `bare-year cite: ${v}`).not.toMatch(/[A-Z][A-Za-z]+ \(\d{4}\)/);
    }
  });
});
