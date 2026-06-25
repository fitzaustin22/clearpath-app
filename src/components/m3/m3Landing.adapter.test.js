import { describe, it, expect } from 'vitest';
import { m3NormalizeProgress } from './m3Landing.adapter';

// Minimal raw store-slice fixtures. m3NormalizeProgress receives the real
// useM3Store slices; these build only the fields it reads. The "badge" definition
// of complete (not the stepper) is what the adapter owns:
//   - pay stub:  store .completed flag           (badge == stepper here)
//   - budget:    results !== null                (badge, NOT budgetModeler.completed)
//   - affidavit: all four progress.*Complete     (badge, NOT affidavitBuilder.completed)

const emptyPayStub = {
  completed: false,
  inputs: { payFrequency: null, grossPayPerCheck: null },
};

const emptyBudget = {
  results: null,
  current: { home: { rentMortgage: 0 }, food: { groceries: 0 } },
  projected: { home: { rentMortgage: 0 }, food: { groceries: 0 } },
};

const emptyAffidavit = {
  progress: {
    incomeComplete: false,
    expensesComplete: false,
    assetsComplete: false,
    liabilitiesComplete: false,
  },
  sections: {
    income: { netMonthlyIncomeAllSources: 0 },
    expenses: { totalMonthlyExpenses: 0 },
    assets: { loaded: false },
    liabilities: { loaded: false },
  },
};

const affidavitWithFlags = (n) => ({
  ...emptyAffidavit,
  progress: {
    incomeComplete: n >= 1,
    expensesComplete: n >= 2,
    assetsComplete: n >= 3,
    liabilitiesComplete: n >= 4,
  },
});

function normalize({ payStubDecoder, budgetModeler, affidavitBuilder } = {}) {
  return m3NormalizeProgress({
    payStubDecoder: payStubDecoder || emptyPayStub,
    budgetModeler: budgetModeler || emptyBudget,
    affidavitBuilder: affidavitBuilder || emptyAffidavit,
  });
}

const byId = (rows, id) => rows.find((r) => r.id === id);

describe('m3NormalizeProgress — shape & order', () => {
  it('returns one entry per worksheet, in journey order, keyed by store id', () => {
    const rows = normalize();
    expect(rows.map((r) => r.id)).toEqual([
      'payStubDecoder',
      'budgetModeler',
      'affidavitBuilder',
    ]);
  });

  it('an all-empty store yields every worksheet not_started at 0%', () => {
    const rows = normalize();
    for (const r of rows) {
      expect(r.status).toBe('not_started');
      expect(r.pct).toBe(0);
    }
  });
});

describe('m3NormalizeProgress — pay stub (0/50/100)', () => {
  it('a pay frequency entered (not completed) → in_progress 50%', () => {
    const rows = normalize({
      payStubDecoder: {
        completed: false,
        inputs: { payFrequency: 'biweekly', grossPayPerCheck: null },
      },
    });
    expect(byId(rows, 'payStubDecoder')).toMatchObject({
      status: 'in_progress',
      pct: 50,
    });
  });

  it('a gross-pay value entered (not completed) → in_progress 50%', () => {
    const rows = normalize({
      payStubDecoder: {
        completed: false,
        inputs: { payFrequency: null, grossPayPerCheck: 2000 },
      },
    });
    expect(byId(rows, 'payStubDecoder')).toMatchObject({
      status: 'in_progress',
      pct: 50,
    });
  });

  it('a completed pay stub → complete 100%', () => {
    const rows = normalize({
      payStubDecoder: {
        completed: true,
        inputs: { payFrequency: 'biweekly', grossPayPerCheck: 2000 },
      },
    });
    expect(byId(rows, 'payStubDecoder')).toMatchObject({
      status: 'complete',
      pct: 100,
    });
  });
});

describe('m3NormalizeProgress — budget modeler (0/50/100, badge = results)', () => {
  it('column data present but no results → in_progress 50%', () => {
    const rows = normalize({
      budgetModeler: {
        results: null,
        current: { home: { rentMortgage: 1500 } },
        projected: { home: { rentMortgage: 0 } },
      },
    });
    expect(byId(rows, 'budgetModeler')).toMatchObject({
      status: 'in_progress',
      pct: 50,
    });
  });

  it('detects data in the projected column too', () => {
    const rows = normalize({
      budgetModeler: {
        results: null,
        current: { home: { rentMortgage: 0 } },
        projected: { food: { groceries: 600 } },
      },
    });
    expect(byId(rows, 'budgetModeler')).toMatchObject({
      status: 'in_progress',
      pct: 50,
    });
  });

  it('results present → complete 100% (badge def: results, not the .completed flag)', () => {
    const rows = normalize({
      budgetModeler: {
        // .completed deliberately false — the badge keys on results, not it.
        completed: false,
        results: { monthlyGap: -250 },
        current: { home: { rentMortgage: 0 } },
        projected: { home: { rentMortgage: 0 } },
      },
    });
    expect(byId(rows, 'budgetModeler')).toMatchObject({
      status: 'complete',
      pct: 100,
    });
  });
});

describe('m3NormalizeProgress — affidavit builder (0/25/50/75/100, badge = all 4 flags)', () => {
  it.each([
    [1, 25],
    [2, 50],
    [3, 75],
  ])('%i of 4 progress flags → in_progress %i%%', (n, pct) => {
    const rows = normalize({ affidavitBuilder: affidavitWithFlags(n) });
    expect(byId(rows, 'affidavitBuilder')).toMatchObject({
      status: 'in_progress',
      pct,
    });
  });

  it('all four progress flags → complete 100% (badge def, not the .completed flag)', () => {
    const rows = normalize({
      affidavitBuilder: { ...affidavitWithFlags(4), completed: false },
    });
    expect(byId(rows, 'affidavitBuilder')).toMatchObject({
      status: 'complete',
      pct: 100,
    });
  });

  it('section data entered but zero flags → in_progress at synthetic 0% (sanctioned coarse pct)', () => {
    const rows = normalize({
      affidavitBuilder: {
        ...emptyAffidavit,
        sections: {
          ...emptyAffidavit.sections,
          income: { netMonthlyIncomeAllSources: 4000 },
        },
      },
    });
    expect(byId(rows, 'affidavitBuilder')).toMatchObject({
      status: 'in_progress',
      pct: 0,
    });
  });

  it('a loaded asset/liability section (no flags) also counts as in_progress', () => {
    const rows = normalize({
      affidavitBuilder: {
        ...emptyAffidavit,
        sections: {
          ...emptyAffidavit.sections,
          assets: { loaded: true },
        },
      },
    });
    expect(byId(rows, 'affidavitBuilder').status).toBe('in_progress');
  });
});
