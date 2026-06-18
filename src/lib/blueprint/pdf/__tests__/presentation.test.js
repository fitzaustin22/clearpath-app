import { describe, it, expect } from 'vitest';
import { formatValue, isNegativeValue } from '../format';
import { layoutSection, layoutCarrier } from '../presentation';

// Build a row exactly as buildRenderPlan does (formatted value + raw + flags).
const row = (id, rawValue, valueClass, label) => {
  const b = { value: rawValue, valueClass };
  return {
    id,
    label: label ?? id,
    value: formatValue(b),
    rawValue,
    valueClass,
    negative: isNegativeValue(b),
    markers: [],
  };
};

describe('layoutSection — s3 Asset Inventory (hero, cards, ranked bars, liabilities group)', () => {
  const rows = [
    row('s3.totalAssets', 1216700, 'currency_actual', 'Total assets'),
    row('s3.totalLiabilities', 9800, 'currency_actual', 'Total liabilities'),
    row('s3.netWorth', 1206900, 'currency_actual', 'Net worth'),
    row('s3.assets.realEstate', 540000, 'currency_actual', 'Assets — Real estate'),
    row('s3.assets.retirement', 410000, 'currency_actual', 'Assets — retirement'),
    row('s3.assets.workingCapital', 260000, 'currency_actual', 'Assets — Working capital'),
    row('s3.assets.personalProperty', 6700, 'currency_actual', 'Assets — Personal property'),
    row('s3.liabilities.creditCards', 9800, 'currency_actual', 'Liabilities — Credit cards'),
    row('s3.documentsGathered', 8, 'count', 'Documents gathered'),
  ];
  const layout = layoutSection('s3', rows);

  it('hero is net worth', () => {
    expect(layout.hero.id).toBe('s3.netWorth');
    expect(layout.hero.value).toBe('$1,206,900');
  });
  it('cards are total assets then total liabilities', () => {
    expect(layout.cards.map((c) => c.id)).toEqual(['s3.totalAssets', 's3.totalLiabilities']);
  });
  it('asset-mix bars are sorted largest-first with a percent of the asset total', () => {
    expect(layout.bars.map((b) => b.id)).toEqual([
      's3.assets.realEstate',
      's3.assets.retirement',
      's3.assets.workingCapital',
      's3.assets.personalProperty',
    ]);
    // 540000 / 1216700 = 44.38%
    expect(layout.bars[0].pct).toBe(44.38);
  });
  it('category labels are Title-cased (no lowercase "retirement")', () => {
    const ret = layout.bars.find((b) => b.id === 's3.assets.retirement');
    expect(ret.label).toBe('Retirement');
  });
  it('liabilities are in their own group', () => {
    const liab = layout.groups.find((g) => /Liabilities/i.test(g.header));
    expect(liab).toBeTruthy();
    expect(liab.rows.map((r) => r.id)).toContain('s3.liabilities.creditCards');
  });
});

describe('layoutSection — s7 Expense (negative hero, current/projected method table)', () => {
  const rows = [
    row('s7.currentTotal', 8940, 'currency_actual', 'Modeled current monthly expenses (Module 3)'),
    row('s7.projectedTotal', 7960, 'currency_projection', 'Modeled projected monthly expenses (Module 3)'),
    row('s7.monthlyIncome', 5747.66, 'currency_actual', 'Net monthly income (from Module 3 pay stub)'),
    row('s7.monthlyGap', -2212, 'currency_projection', 'Projected monthly surplus/shortfall'),
    row('s7.category.Home.current', 5270, 'currency_actual', 'Home — current'),
    row('s7.category.Home.projected', 4450, 'currency_projection', 'Home — projected'),
    row('s7.category.Food.current', 1190, 'currency_actual', 'Food — current'),
    row('s7.category.Food.projected', 1010, 'currency_projection', 'Food — projected'),
  ];
  const layout = layoutSection('s7', rows);

  it('hero is the monthly gap and is flagged negative', () => {
    expect(layout.hero.id).toBe('s7.monthlyGap');
    expect(layout.hero.negative).toBe(true);
    expect(layout.hero.value).toBe('($2,212)');
  });
  it('categories render as a Current vs Projected method table, sorted by current desc', () => {
    expect(layout.methodTables).toHaveLength(1);
    const mt = layout.methodTables[0];
    expect(mt.columns).toEqual(['Current', 'Projected']);
    expect(mt.rows[0].label).toBe('Home');
    expect(mt.rows[0].cells).toEqual(['$5,270', '$4,450']);
    expect(mt.rows[1].label).toBe('Food');
  });
});

describe('layoutCarrier — Deferred Compensation (per-grant entities + Hug/Nelson method table)', () => {
  const rows = [
    row('carrier.dcs.dcsF1Options.company', 'Calvert Federal Systems', 'text', 'Deferred comp — company'),
    row('carrier.dcs.dcsF1Options.category', 'Stock options', 'text', 'Deferred comp — category'),
    row('carrier.dcs.dcsF1Options.sharesGranted', 4000, 'count', 'Shares granted'),
    row('carrier.dcs.dcsF1Options.strikePrice', 22.5, 'currency_actual', 'Strike price'),
    row('carrier.dcs.dcsF1Options.maritalShares.hug', 4000, 'count', 'Marital shares, grant total — Hug time rule'),
    row('carrier.dcs.dcsF1Options.maritalShares.nelson', 4000, 'count', 'Marital shares, grant total — Nelson time rule'),
    row('carrier.dcs.dcsF1Options.intrinsicValue.hug', 154000, 'currency_projection', 'Intrinsic value, grant total — Hug time rule'),
    row('carrier.dcs.dcsF1Options.intrinsicValue.nelson', 154000, 'currency_projection', 'Intrinsic value, grant total — Nelson time rule'),
    row('carrier.dcs.dcsF1Rsu.company', 'Calvert Federal Systems', 'text', 'Deferred comp — company'),
    row('carrier.dcs.dcsF1Rsu.category', 'Restricted stock units', 'text', 'Deferred comp — category'),
    row('carrier.dcs.dcsF1Rsu.sharesGranted', 1200, 'count', 'Shares granted'),
    row('carrier.dcs.dcsF1Rsu.maritalShares.hug', 1180, 'count', 'Marital shares, grant total — Hug time rule'),
    row('carrier.dcs.dcsF1Rsu.maritalShares.nelson', 1136, 'count', 'Marital shares, grant total — Nelson time rule'),
  ];
  const layout = layoutCarrier('deferredCompStubs', rows);

  it('is numbered as a supplement to its parent section', () => {
    expect(layout.number).toBe('Supplement to Section 5');
    expect(layout.title).toBe('Deferred Compensation');
  });
  it('produces one named entity per grant', () => {
    expect(layout.entities).toHaveLength(2);
    expect(layout.entities[0].header).toContain('Stock options');
    expect(layout.entities[1].header).toContain('Restricted stock units');
  });
  it('pairs Hug/Nelson into a single labeled method table per grant', () => {
    const mt = layout.entities[0].methodTable;
    expect(mt.columns).toEqual(['Hug', 'Nelson']);
    const shares = mt.rows.find((r) => /Marital shares/.test(r.label));
    expect(shares.cells).toEqual(['4,000', '4,000']);
  });
});
