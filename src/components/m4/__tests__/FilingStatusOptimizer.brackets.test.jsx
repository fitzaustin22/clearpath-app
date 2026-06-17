import { describe, it, expect } from 'vitest';
import { TAX_BRACKETS } from '../FilingStatusOptimizer.jsx';

// Copy-paste tripwire (memo A, Rev. Proc. 2025-32): the HoH 24%→32% boundary
// is $201,750 (TABLE 2 — Heads of Households), which is NOT the Single boundary
// of $201,775 (TABLE 3). These were once identical in code because the HoH edge
// was copied from Single; this test fails if they are ever re-equated.
describe('FSO tax brackets — HoH 24%→32% edge (Rev. Proc. 2025-32 TABLE 2)', () => {
  const single = TAX_BRACKETS.single;
  const hoh = TAX_BRACKETS.hoh;

  it('pins the HoH 24%→32% boundary to the published $201,750', () => {
    expect(hoh[3].max).toBe(201750); // bracket 4 max
    expect(hoh[4].min).toBe(201750); // bracket 5 min
  });

  it('keeps the Single 24%→32% boundary at the published $201,775', () => {
    expect(single[3].max).toBe(201775);
    expect(single[4].min).toBe(201775);
  });

  it('asserts the HoH edge differs from the Single edge (copy-paste guard)', () => {
    expect(hoh[3].max).not.toBe(single[3].max);
  });
});
