/**
 * prePopulateAffidavitFromTools — M2 → affidavit asset/liability summary mapping.
 *
 * The affidavit's six asset slots are coarser than M2's category enum
 * (src/lib/m2Sections.js), so the prepop maps:
 *
 *   realProperty       ← realEstate            (net of outstandingBalance,
 *                                               matching M2's "Real Estate (Net Equity)")
 *   cashAccounts       ← workingCapital        (M2's single cash+brokerage bucket;
 *                                               no store-level cash/investment split)
 *   investments        ← stockOptions + corporateIncentives
 *   retirementAccounts ← retirement + pensions
 *   otherAssets        ← otherAssets + businessInterests
 *   personalProperty   ← personalPropertyInventory.summary.totalValue
 *
 * Liabilities map 1:1 (loans / creditCards / otherDebt). Regression guard for
 * the bug where the prepop queried keys absent from the M2 enum (bankAccounts,
 * investments, retirementAccounts, lifeInsurance) and silently prepopped 0.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useM2Store } from '../m2Store.js';
import { useM3Store } from '../m3Store.js';

let idCounter = 0;
const makeItem = (category, currentValue, extra = {}) => ({
  id: `prepop-test-${++idCounter}`,
  category,
  description: '',
  dateAcquired: null,
  titleholder: 'unknown',
  sourceOfPayment: null,
  currentValue,
  costBasis: null,
  outstandingBalance: null,
  classification: 'unknown',
  classificationSource: null,
  notes: '',
  ...extra,
});

const seedM2 = (items) => useM2Store.getState().initInventoryItems(items);

const seedPersonalProperty = (totalValue, totalItems = 1) =>
  useM2Store.setState((s) => ({
    personalPropertyInventory: {
      ...s.personalPropertyInventory,
      summary: { ...s.personalPropertyInventory.summary, totalValue, totalItems },
    },
  }));

const prepop = () => useM3Store.getState().prePopulateAffidavitFromTools();
const affidavit = () => useM3Store.getState().affidavitBuilder;
const assetSummary = () => affidavit().sections.assets.summary;
const liabilitySummary = () => affidavit().sections.liabilities.summary;

beforeEach(() => {
  useM2Store.getState().resetMaritalEstateInventory();
  useM2Store.getState().resetPersonalPropertyInventory();
  useM3Store.getState().resetAffidavitBuilder();
});

describe('prePopulateAffidavitFromTools — M2 asset category mapping', () => {
  it('sums workingCapital into cashAccounts (cash + brokerage live in one M2 bucket)', () => {
    seedM2([
      makeItem('workingCapital', 12000, { description: 'Checking Account' }),
      makeItem('workingCapital', 30000, { description: 'Mutual Fund' }),
    ]);
    prepop();
    expect(assetSummary().cashAccounts).toBe(42000);
    expect(affidavit().sections.assets.loaded).toBe(true);
    expect(affidavit().prePopulated.fromM2).toBe(true);
  });

  it('sums retirement + pensions into retirementAccounts', () => {
    seedM2([
      makeItem('retirement', 250000, { description: '401(k) / 403(b) / 457 Plan' }),
      makeItem('pensions', 90000, { description: 'Pension Plan (Present Value)' }),
    ]);
    prepop();
    expect(assetSummary().retirementAccounts).toBe(340000);
  });

  it('sums stockOptions + corporateIncentives into investments', () => {
    seedM2([
      makeItem('stockOptions', 15000, { description: 'Stock Options' }),
      makeItem('corporateIncentives', 25000, { description: 'Restricted Stock Units (RSUs)' }),
    ]);
    prepop();
    expect(assetSummary().investments).toBe(40000);
  });

  it('sums otherAssets (incl. life-insurance cash value) + businessInterests into otherAssets', () => {
    seedM2([
      makeItem('otherAssets', 18000, { description: 'Cash Value of Life Insurance' }),
      makeItem('businessInterests', 50000, { description: 'Business Interest' }),
    ]);
    prepop();
    expect(assetSummary().otherAssets).toBe(68000);
  });

  it('nets outstandingBalance out of realProperty, matching the M2 net-equity totals', () => {
    seedM2([
      makeItem('realEstate', 600000, {
        description: 'Primary Residence',
        outstandingBalance: 380000,
      }),
    ]);
    prepop();
    expect(assetSummary().realProperty).toBe(220000);
  });

  it('pulls personalProperty from the Personal Property Inventory summary', () => {
    seedM2([makeItem('workingCapital', 100)]);
    seedPersonalProperty(5000, 3);
    prepop();
    expect(assetSummary().personalProperty).toBe(5000);
  });

  it('totalAssets covers every M2 asset category — nothing drops out of the estate', () => {
    seedM2([
      makeItem('realEstate', 500000, { outstandingBalance: 300000 }), // 200000 net
      makeItem('workingCapital', 42000),
      makeItem('retirement', 250000),
      makeItem('pensions', 90000),
      makeItem('stockOptions', 15000),
      makeItem('corporateIncentives', 25000),
      makeItem('businessInterests', 50000),
      makeItem('otherAssets', 18000),
      // Liability items must not bleed into asset totals
      makeItem('loans', 8000),
    ]);
    seedPersonalProperty(5000);
    prepop();
    expect(assetSummary()).toEqual({
      realProperty: 200000,
      cashAccounts: 42000,
      investments: 40000,
      retirementAccounts: 340000,
      otherAssets: 68000,
      personalProperty: 5000,
      totalAssets: 695000,
    });
  });
});

describe('prePopulateAffidavitFromTools — M2 liability mapping', () => {
  it('maps loans / creditCards / otherDebt 1:1 and totals them', () => {
    seedM2([
      makeItem('loans', 8000, { description: 'Personal Loan' }),
      makeItem('creditCards', 4500, { description: 'Credit Card' }),
      makeItem('otherDebt', 1200, { description: 'Back Taxes' }),
    ]);
    prepop();
    expect(liabilitySummary()).toEqual({
      loans: 8000,
      creditCards: 4500,
      otherDebt: 1200,
      totalLiabilities: 13700,
    });
    expect(affidavit().sections.liabilities.loaded).toBe(true);
  });
});

describe('prePopulateAffidavitFromTools — gating', () => {
  it('does nothing when the M2 inventory is empty', () => {
    prepop();
    expect(affidavit().prePopulated.fromM2).toBe(false);
    expect(affidavit().sections.assets.loaded).toBe(false);
    expect(assetSummary().totalAssets).toBe(0);
  });

  it('does not re-apply once fromM2 is set (manual edits survive later calls)', () => {
    seedM2([makeItem('workingCapital', 1000)]);
    prepop();
    expect(assetSummary().cashAccounts).toBe(1000);

    seedM2([makeItem('workingCapital', 999999)]);
    prepop();
    expect(assetSummary().cashAccounts).toBe(1000);
  });
});
