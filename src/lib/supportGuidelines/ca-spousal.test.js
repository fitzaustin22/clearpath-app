import { describe, it, expect } from 'vitest';
import { lookupSpousal } from './ca-spousal.js';

describe('lookupSpousal (CA) — payor/payee net resolution', () => {
  it('full_worksheet — partyB is payor: uses partyB.net for payor, partyA.net for payee', () => {
    const result = lookupSpousal({
      payorGrossMonthly: 12000,
      payeeGrossMonthly: 4000,
      depth: 'full_worksheet',
      fullWorksheet: {
        partyA: { fedTax: 0, stateTax: 0, fica: 0, otherDeductions: 0, net: 3000 },
        partyB: { fedTax: 0, stateTax: 0, fica: 0, otherDeductions: 0, net: 9000 },
      },
      temporal: 'pendente_lite',
      payorIsPartyA: false,
    });

    // Expected: 0.40 × 9000 (partyB net = payor net) − 0.50 × 3000 (partyA net = payee net)
    //         = 3600 − 1500 = 2100
    expect(result.monthlyAmount).toBeCloseTo(2100, 0);
    expect(result.formulaUsed).toBe('ca_santa_clara_temp');
  });

  it('full_worksheet — partyA is payor: uses partyA.net for payor (regression of pre-fix behavior)', () => {
    const result = lookupSpousal({
      payorGrossMonthly: 12000,
      payeeGrossMonthly: 4000,
      depth: 'full_worksheet',
      fullWorksheet: {
        partyA: { fedTax: 0, stateTax: 0, fica: 0, otherDeductions: 0, net: 9000 },
        partyB: { fedTax: 0, stateTax: 0, fica: 0, otherDeductions: 0, net: 3000 },
      },
      temporal: 'pendente_lite',
      payorIsPartyA: true,
    });

    expect(result.monthlyAmount).toBeCloseTo(2100, 0);
    expect(result.formulaUsed).toBe('ca_santa_clara_temp');
  });

  it('standard depth — uses 75%-of-gross approximation (symmetric on payor/payee)', () => {
    const result = lookupSpousal({
      payorGrossMonthly: 10000,
      payeeGrossMonthly: 4000,
      depth: 'standard',
      fullWorksheet: null,
      temporal: 'pendente_lite',
      payorIsPartyA: true,
    });

    // 0.40 × (10000 × 0.75) − 0.50 × (4000 × 0.75)
    // = 0.40 × 7500 − 0.50 × 3000
    // = 3000 − 1500 = 1500
    expect(result.monthlyAmount).toBeCloseTo(1500, 0);
    expect(result.formulaUsed).toBe('ca_santa_clara_temp');
  });

  it('throws when payorIsPartyA is missing', () => {
    expect(() =>
      lookupSpousal({
        payorGrossMonthly: 10000,
        payeeGrossMonthly: 5000,
        depth: 'full_worksheet',
        fullWorksheet: {
          partyA: { net: 7000 },
          partyB: { net: 4000 },
        },
        temporal: 'pendente_lite',
      })
    ).toThrow(/payorIsPartyA/);
  });

  it('post_divorce — returns factor-test stub regardless of payorIsPartyA', () => {
    const result = lookupSpousal({
      payorGrossMonthly: 10000,
      payeeGrossMonthly: 5000,
      temporal: 'post_divorce',
      payorIsPartyA: true,
    });

    expect(result.monthlyAmount).toBe(0);
    expect(result.formulaUsed).toBe('factor_test_approximation');
    expect(result.factorTestApplies).toBe(true);
  });
});
