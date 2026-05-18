// Tests for §8.3.2 / §8.3.3 plan-type radio → planType routing and the
// §8.3.5 "still not sure" 3-question diagnostic. Pure functions, no store.

import { describe, it, expect } from 'vitest';
import {
  PLAN_TYPE_RADIO_CHOICES,
  ACCRUAL_STATUS_OPTIONS,
  routePlanType,
  applyAccrualStatus,
  diagnosePlanType,
} from '../planTypeRouter.js';

describe('PLAN_TYPE_RADIO_CHOICES (§8.3.2)', () => {
  it('exposes exactly the 6 spec radio choices in order', () => {
    expect(PLAN_TYPE_RADIO_CHOICES.map((c) => c.id)).toEqual([
      'db_pension',
      'account_balance',
      'ira',
      'federal_civilian',
      'military',
      'state_municipal',
    ]);
  });

  it('each choice carries the spec-locked label text and planType', () => {
    const byId = Object.fromEntries(PLAN_TYPE_RADIO_CHOICES.map((c) => [c.id, c]));
    expect(byId.db_pension.label).toBe(
      'Pension that pays a monthly benefit at retirement (defined benefit / DB)',
    );
    expect(byId.account_balance.label).toBe('Account-balance plan: 401(k), 403(b), 457(b)');
    expect(byId.ira.label).toBe('IRA (Traditional, Roth, SEP, SIMPLE)');
    expect(byId.federal_civilian.label).toBe('Federal civilian: CSRS, FERS');
    expect(byId.military.label).toBe('Military: active duty, Reserve, National Guard');
    expect(byId.state_municipal.label).toBe('State or municipal employee retirement');
  });
});

describe('routePlanType (§8.3.3 routing table)', () => {
  it('routes DB pension → private_db', () => {
    expect(routePlanType('db_pension')).toBe('private_db');
  });

  it('routes account balance → dc', () => {
    expect(routePlanType('account_balance')).toBe('dc');
  });

  it('routes IRA → ira', () => {
    expect(routePlanType('ira')).toBe('ira');
  });

  it('routes federal civilian → gov_civilian', () => {
    expect(routePlanType('federal_civilian')).toBe('gov_civilian');
  });

  it('routes military → military', () => {
    expect(routePlanType('military')).toBe('military');
  });

  it('routes state/municipal → state_municipal', () => {
    expect(routePlanType('state_municipal')).toBe('state_municipal');
  });

  it('returns null for an unrecognized radio id', () => {
    expect(routePlanType('not_a_choice')).toBeNull();
    expect(routePlanType(undefined)).toBeNull();
  });
});

describe('applyAccrualStatus (§8.3.2 — informational, does NOT affect routing)', () => {
  it('exposes the 3 accrual-status options', () => {
    expect(ACCRUAL_STATUS_OPTIONS).toEqual(['accruing', 'frozen', 'in_pay']);
  });

  it('carries accrualStatus through without changing planType for any value', () => {
    for (const accrualStatus of ACCRUAL_STATUS_OPTIONS) {
      const result = applyAccrualStatus({ radioChoiceId: 'db_pension', accrualStatus });
      expect(result).toEqual({ planType: 'private_db', accrualStatus });
    }
  });

  it('planType is invariant to accrualStatus across every radio choice', () => {
    for (const choice of PLAN_TYPE_RADIO_CHOICES) {
      const base = routePlanType(choice.id);
      for (const accrualStatus of [...ACCRUAL_STATUS_OPTIONS, null, undefined]) {
        expect(applyAccrualStatus({ radioChoiceId: choice.id, accrualStatus }).planType).toBe(base);
      }
    }
  });
});

describe('diagnosePlanType (§8.3.5 "still not sure" 3-question flow)', () => {
  it('pays monthly + no account balance → db_pension best guess with rationale', () => {
    const r = diagnosePlanType({
      paysMonthlyAtRetirement: true,
      hasAccountBalance: false,
      w2Box12CodeMatches: false,
    });
    expect(r.bestGuess).toBe('db_pension');
    expect(r.rationale).toMatch(/monthly benefit/i);
  });

  it('account balance + W-2 box 12 code → account_balance (DC) best guess', () => {
    const r = diagnosePlanType({
      paysMonthlyAtRetirement: false,
      hasAccountBalance: true,
      w2Box12CodeMatches: true,
    });
    expect(r.bestGuess).toBe('account_balance');
    expect(r.rationale).toMatch(/W-2 box 12/i);
  });

  it('account balance + no W-2 box 12 code → ira best guess', () => {
    const r = diagnosePlanType({
      paysMonthlyAtRetirement: false,
      hasAccountBalance: true,
      w2Box12CodeMatches: false,
    });
    expect(r.bestGuess).toBe('ira');
    expect(r.rationale).toMatch(/IRA/);
  });

  it('hybrid (monthly + account balance) → account_balance with hybrid rationale', () => {
    const r = diagnosePlanType({
      paysMonthlyAtRetirement: true,
      hasAccountBalance: true,
      w2Box12CodeMatches: true,
    });
    expect(r.bestGuess).toBe('account_balance');
    expect(r.rationale).toMatch(/hybrid|cash.balance/i);
  });

  it('all-no answers → null best guess + rationale prompting manual selection', () => {
    const r = diagnosePlanType({
      paysMonthlyAtRetirement: false,
      hasAccountBalance: false,
      w2Box12CodeMatches: false,
    });
    expect(r.bestGuess).toBeNull();
    expect(r.rationale).toMatch(/select|choose|attorney/i);
  });
});
