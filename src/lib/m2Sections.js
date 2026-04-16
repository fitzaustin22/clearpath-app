// Shared M2 section definitions + category totals helper.
// Imported by MaritalEstateInventory, PersonalPropertyInventory, and the
// shared blueprint payload builder so all three agree on section keys,
// liability classification, and per-category aggregation.

export const ASSET_SECTIONS = [
  {
    key: 'realEstate',
    label: 'Real Estate',
    subcategories: ['Primary Residence', 'Other Real Estate (1)', 'Other Real Estate (2)'],
  },
  {
    key: 'workingCapital',
    label: 'Working Capital',
    subcategories: [
      'Cash',
      'Checking Account',
      'Savings Account',
      'Money Market Account',
      'Certificate of Deposit',
      'Treasury Bill / Savings Bond',
      'Mutual Fund',
      'Individual Stock',
      'Individual Bond',
    ],
  },
  {
    key: 'retirement',
    label: 'Retirement Accounts',
    subcategories: ['IRA / Roth IRA', '401(k) / 403(b) / 457 Plan', 'Thrift Savings Plan'],
  },
  {
    key: 'pensions',
    label: 'Pension Plans',
    subcategories: ['Pension Plan (Present Value)'],
    helperText:
      "Pensions are valued differently than other retirement accounts. The 'present value' is what the future pension payments are worth today. If you don't know this number, leave it blank — a CDFA can calculate it.",
  },
  {
    key: 'stockOptions',
    label: 'Stock Options',
    subcategories: ['Stock Options'],
    helperText:
      'Unvested stock options may still be marital property. Include them with a note about the vesting date and exercise price. A CDFA or attorney can determine the marital portion using the coverture fraction.',
  },
  {
    key: 'corporateIncentives',
    label: 'Corporate Incentive Programs',
    subcategories: [
      'Restricted Stock Units (RSUs)',
      'Employee Stock Purchase Plan (ESPP)',
      'Deferred Compensation',
      'Other Incentive Program',
    ],
    helperText:
      'RSUs, ESPP shares, and deferred compensation are separate from stock options and have different tax treatment. Include the grant date, vesting schedule, and current value for each.',
  },
  {
    key: 'businessInterests',
    label: 'Business Interests',
    subcategories: ['Business Interest'],
    helperText:
      "If either spouse owns a business — even a small one — it needs to be valued. The value listed here is your best estimate. If there's any significant value at stake, an independent business appraiser is strongly recommended.",
  },
  {
    key: 'otherAssets',
    label: 'Other Assets',
    subcategories: ['Cash Value of Life Insurance', 'Annuity', 'Other'],
  },
  {
    key: 'personalProperty',
    label: 'Personal Property',
    isPersonalProperty: true,
  },
];

export const LIABILITY_SECTIONS = [
  {
    key: 'loans',
    label: 'Loans',
    subcategories: ['Personal Loan', 'Educational Loan', 'Promissory Note', 'Line of Credit'],
    isLiability: true,
    helperText:
      'Do not include loans or mortgages already deducted against assets in the Asset sections.',
  },
  {
    key: 'creditCards',
    label: 'Credit Cards',
    subcategories: ['Credit Card'],
    isLiability: true,
  },
  {
    key: 'otherDebt',
    label: 'Other Debt',
    subcategories: ['Back Taxes', 'Professional Debt', 'Business Liability', 'Other'],
    isLiability: true,
  },
];

export const ALL_SECTIONS = [...ASSET_SECTIONS, ...LIABILITY_SECTIONS];

export const LIABILITY_KEYS = new Set(['loans', 'creditCards', 'otherDebt']);

// Returns { [categoryKey]: { total, client, spouse, unallocated } }
export function computeCategoryTotals(items) {
  const totals = {};
  for (const section of ALL_SECTIONS) {
    totals[section.key] = { total: 0, client: 0, spouse: 0, unallocated: 0 };
  }
  for (const item of items) {
    const t = totals[item.category];
    if (!t) continue;
    const isLiab = LIABILITY_KEYS.has(item.category);
    const cv = Number(item.currentValue) || 0;
    const ob = Number(item.outstandingBalance) || 0;
    const net = isLiab ? cv : cv - ob;
    if (net === 0) continue;
    t.total += net;
    if (item.classification === 'disputed' || item.classification === 'unknown') {
      t.unallocated += net;
      continue;
    }
    if (item.titleholder === 'self') t.client += net;
    else if (item.titleholder === 'spouse') t.spouse += net;
    else if (item.titleholder === 'joint') {
      t.client += net / 2;
      t.spouse += net / 2;
    } else {
      t.unallocated += net;
    }
  }
  return totals;
}
