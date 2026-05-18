// Tests for §8.5.4 (DC), §8.5.5 (IRA), §8.5.6 (flag-only) branch question
// sets + §8.9.1/§8.9.2 locked callout/disclaimer literals. Step-4 scope only
// (no private_db — that is §13 step 6).

import { describe, it, expect } from 'vitest';
import {
  DC_QUESTIONS,
  IRA_QUESTIONS,
  FLAG_ONLY_BRANCHES,
  QDG_DISCLAIMER_BULLETS,
  QDG_CALLOUTS,
  getDcQuestions,
  getIraQuestions,
  getFlagOnlyBranch,
  getBranchQuestionSet,
} from '../branchQuestionSets.js';

describe('DC branch (§8.5.4 + §8.5.1/§8.5.2 conditioning)', () => {
  it('participant flow surfaces exactly Q1 allocation + Q3 valuation date (Q2 skipped per §8.5.4.2)', () => {
    const qs = getDcQuestions('participant');
    expect(qs.map((q) => q.id)).toEqual(['allocation', 'valuationDate']);
  });

  it('alternate-payee flow surfaces all 3 DC questions in order', () => {
    const qs = getDcQuestions('alternatePayee');
    expect(qs.map((q) => q.id)).toEqual(['allocation', 'receiptMethod', 'valuationDate']);
  });

  it('receipt-method question is alternate-payee-only and carries the why-this-matters wrapper', () => {
    const receipt = DC_QUESTIONS.find((q) => q.id === 'receiptMethod');
    expect(receipt.alternatePayeeOnly).toBe(true);
    expect(receipt.whyThisMatters).toBe(true);
    expect(receipt.wording).toBe('How will you receive your portion?');
    expect(receipt.options).toEqual([
      'rollover_ira',
      'cash_72t',
      'leave_in_plan',
      'not_yet_decided',
    ]);
  });

  it('allocation + valuation-date are mechanical (no why-this-matters wrapper) per §8.5.2', () => {
    const alloc = DC_QUESTIONS.find((q) => q.id === 'allocation');
    const valDate = DC_QUESTIONS.find((q) => q.id === 'valuationDate');
    expect(alloc.whyThisMatters).toBe(false);
    expect(valDate.whyThisMatters).toBe(false);
    expect(alloc.options).toEqual(['percentage', 'fixed_dollar']);
    expect(valDate.options).toEqual([
      'divorce',
      'separation',
      'other',
      'no_specific',
      'not_yet_decided',
    ]);
  });

  it('every DC question is perspective-symmetric in wording per §8.5.1', () => {
    for (const q of DC_QUESTIONS) expect(q.perspectiveSymmetric).toBe(true);
  });
});

describe('IRA branch (§8.5.5 — no perspective conditioning)', () => {
  it('yields Q1 informational + Q2 decree-language + Q3 custodian in order', () => {
    expect(IRA_QUESTIONS.map((q) => q.id)).toEqual([
      'transferMechanic',
      'decreeLanguageConfirmed',
      'custodian',
    ]);
  });

  it('Q1 is an informational §408(d)(6) block, not a question input', () => {
    const q1 = IRA_QUESTIONS[0];
    expect(q1.inputType).toBe('informational');
    expect(q1.wording).toBe(
      "IRA division uses a §408(d)(6) trustee-to-trustee transfer. No QDRO is required. Decree must explicitly characterize the transfer as 'incident to divorce' for tax-free treatment.",
    );
  });

  it('Q2 decree-language options match §8.5.5.2 exactly', () => {
    const q2 = IRA_QUESTIONS[1];
    expect(q2.options).toEqual(['yes', 'no', 'not_yet_drafted', 'not_sure']);
  });

  it('Q3 custodian is free-text + notes', () => {
    expect(IRA_QUESTIONS[2].inputType).toBe('freetext+notes');
  });

  it('renders identically regardless of userRole (no perspective delta)', () => {
    expect(getIraQuestions('participant')).toEqual(getIraQuestions('alternatePayee'));
  });

  it('IRA carries no education callout at v1 per §8.5.2', () => {
    for (const q of IRA_QUESTIONS) expect(q.whyThisMatters).toBe(false);
  });
});

describe('Flag-only branches (§8.5.6 — 3 starter Qs + locked consult-specialist callout)', () => {
  it('gov_civilian (COAP): 3 starter Qs + verbatim §8.5.6.1 callout', () => {
    const b = getFlagOnlyBranch('gov_civilian');
    expect(b.starterQuestions).toHaveLength(3);
    expect(b.starterQuestions[0].wording).toBe(
      'Will the former-spouse share be expressed as a marital fraction (e.g., months-of-marriage-during-service / total-months-of-service) or a fixed dollar amount?',
    );
    expect(b.consultSpecialistCallout).toBe(
      'Federal civilian retirement (CSRS/FERS) requires a Court Order Acceptable for Processing (COAP), processed by OPM under 5 CFR Part 838. Procedural rules differ materially from ERISA QDROs. Engage an attorney experienced with COAP drafting; a generalist domestic-relations attorney without federal-retirement experience often runs into rejection.',
    );
  });

  it('military (USFSPA): 3 starter Qs + verbatim §8.5.6.2 callout', () => {
    const b = getFlagOnlyBranch('military');
    expect(b.starterQuestions).toHaveLength(3);
    expect(b.starterQuestions[0].wording).toBe(
      'Does the 10/10 rule apply (at least 10 years of marriage overlapping at least 10 years of creditable military service) for direct DFAS payment to the former spouse?',
    );
    expect(b.consultSpecialistCallout).toBe(
      "Military retired pay division under the Uniformed Services Former Spouses' Protection Act (USFSPA, 10 USC §1408) involves DFAS-specific drafting requirements and SBP timing rules. Engage an attorney experienced with military divorce; civilian-only domestic-relations attorneys frequently miss SBP deemed-election deadlines.",
    );
  });

  it('state_municipal (State DRO): 3 starter Qs + verbatim §8.5.6.3 callout', () => {
    const b = getFlagOnlyBranch('state_municipal');
    expect(b.starterQuestions).toHaveLength(3);
    expect(b.starterQuestions[0].wording).toBe(
      'Does the state or municipal plan administrator publish a model order or required-elements list, and have you obtained it?',
    );
    expect(b.consultSpecialistCallout).toBe(
      'State and municipal retirement systems vary widely in their division mechanics and required order language. Some plans (e.g., VRS, MD State Retirement) have standardized procedures; others require plan-administrator pre-approval before order entry. Engage an attorney experienced with the specific plan, or one willing to coordinate directly with the plan administrator.',
    );
  });

  it('FLAG_ONLY_BRANCHES has exactly the 3 flag-only planTypes', () => {
    expect(Object.keys(FLAG_ONLY_BRANCHES).sort()).toEqual([
      'gov_civilian',
      'military',
      'state_municipal',
    ]);
  });

  it('flag-only starter questions have stable branch-scoped ids', () => {
    const ids = getFlagOnlyBranch('military').starterQuestions.map((q) => q.id);
    expect(ids).toEqual(['military_q1', 'military_q2', 'military_q3']);
  });

  it('getFlagOnlyBranch returns null for a non-flag planType', () => {
    expect(getFlagOnlyBranch('dc')).toBeNull();
    expect(getFlagOnlyBranch('private_db')).toBeNull();
  });
});

describe('Locked disclaimer + callout literals (§8.9.1 / §8.9.2)', () => {
  it('QDG_DISCLAIMER_BULLETS is the 4 verbatim §8.9.2 strings in order', () => {
    expect(QDG_DISCLAIMER_BULLETS).toEqual([
      'This tool produces a decision-capture and handoff document, NOT a legal order.',
      'The actual QDRO/COAP/DRO/IRA-transfer order must be drafted and reviewed by a licensed attorney (and frequently a QDRO drafting specialist for complex DB plans).',
      "The handoff packet represents one side's preferences; opposing-counsel review and negotiation will follow.",
      'Plan-specific procedural requirements (plan administrator pre-approval, model-order availability) vary and must be verified by the drafting attorney.',
    ]);
  });

  it('QDG_CALLOUTS exposes the 3 named §8.9.1 callouts', () => {
    expect(Object.keys(QDG_CALLOUTS).sort()).toEqual([
      'qdg_attorney_review_required',
      'qdg_not_legal_order',
      'qdg_packet_ready',
    ]);
  });

  it('qdg_not_legal_order body carries the locked 4 bullets', () => {
    expect(QDG_CALLOUTS.qdg_not_legal_order.bullets).toBe(QDG_DISCLAIMER_BULLETS);
  });

  it('qdg_packet_ready carries the locked §8.9.1 body text', () => {
    expect(QDG_CALLOUTS.qdg_packet_ready.body).toBe(
      'All asset decisions captured. You can now generate the attorney handoff packet.',
    );
  });
});

describe('getBranchQuestionSet orchestrator (step-4 scope guard)', () => {
  it('returns DC set for dc planType conditioned on userRole', () => {
    expect(getBranchQuestionSet({ planType: 'dc', userRole: 'participant' }).map((q) => q.id)).toEqual(
      ['allocation', 'valuationDate'],
    );
  });

  it('returns IRA set for ira planType', () => {
    expect(getBranchQuestionSet({ planType: 'ira', userRole: 'participant' })).toEqual(IRA_QUESTIONS);
  });

  it('returns the flag-only branch descriptor for a flag-only planType', () => {
    expect(getBranchQuestionSet({ planType: 'gov_civilian', userRole: 'alternatePayee' })).toEqual(
      getFlagOnlyBranch('gov_civilian'),
    );
  });

  it('returns null for private_db (out of step-4 scope — §13 step 6)', () => {
    expect(getBranchQuestionSet({ planType: 'private_db', userRole: 'participant' })).toBeNull();
  });
});
