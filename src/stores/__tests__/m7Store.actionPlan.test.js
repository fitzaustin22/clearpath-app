/**
 * m7Store — Action Plan & Timeline slice + buildActionPlanPayload (M7 Phase A).
 *
 * Covers the §6.7 set's store/helper half: payload building (strip id, drop
 * incomplete rows, omit empty optionals), the FIX-2 incomplete-only→empty
 * invariant at the integration boundary, every declared mutator round-trip,
 * applySuggestedStep (editable row + auto-dismiss, FIX-5), dismissal +
 * partialize session-only persistence (FIX-3/REF-B), clear-all, and generated-
 * output compliance. The writer itself (updateActionPlan) is covered in
 * blueprintStore.actionPlan.test.js. All store assertions; no render.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  useM7Store,
  buildActionPlanPayload,
  selectSuggestedSteps,
} from '../m7Store.js';
import useBlueprintStore from '../blueprintStore.js';

// Advisory / verdict vocabulary that must never appear in generated copy.
const BANNED = [
  /\byou should\b/i,
  /\brecommend(ed|ation)?\b/i,
  /\bbest\b/i,
  /\bworth\b/i,
  /\baccept\b/i,
  /\breject\b/i,
  /\badvise\b/i,
];

const NEXTSTEP_KEYS = ['step', 'timeline', 'responsible'];
const PRO_KEYS = ['role', 'name', 'contact'];
const KEYDATE_KEYS = ['date', 'event'];

beforeEach(() => {
  localStorage.clear();
  useM7Store.getState().resetActionPlan();
  useBlueprintStore.getState().resetBlueprint();
});

// ── buildActionPlanPayload (pure) ─────────────────────────────────────────────
describe('buildActionPlanPayload — pure §6.7 cases', () => {
  it('TC-M7-AP-1 (case 1): empty plan → { [], [], [] }', () => {
    expect(buildActionPlanPayload({ nextSteps: [], professionals: [], keyDates: [] })).toEqual({
      nextSteps: [],
      professionals: [],
      keyDates: [],
    });
    // Also robust to undefined / missing slices.
    expect(buildActionPlanPayload(undefined)).toEqual({ nextSteps: [], professionals: [], keyDates: [] });
    expect(buildActionPlanPayload({})).toEqual({ nextSteps: [], professionals: [], keyDates: [] });
  });

  it('TC-M7-AP-2 (case 2): one valid step → nextSteps length 1', () => {
    const payload = buildActionPlanPayload({
      nextSteps: [{ id: 'step_1', step: 'Open a checking account', timeline: '', responsible: '' }],
      professionals: [],
      keyDates: [],
    });
    expect(payload.nextSteps).toHaveLength(1);
    expect(payload.nextSteps[0]).toEqual({ step: 'Open a checking account' });
  });

  it('TC-M7-AP-3 (case 3): optional fields round-trip (timeline, responsible, contact)', () => {
    const payload = buildActionPlanPayload({
      nextSteps: [{ id: 'step_1', step: 'Refinance', timeline: '60 days', responsible: 'Me' }],
      professionals: [{ id: 'pro_1', role: 'Attorney', name: 'Jane Doe', contact: 'jane@law.test' }],
      keyDates: [{ id: 'date_1', date: '2026-09-01', event: 'Mediation' }],
    });
    expect(payload.nextSteps[0]).toEqual({ step: 'Refinance', timeline: '60 days', responsible: 'Me' });
    expect(payload.professionals[0]).toEqual({ role: 'Attorney', name: 'Jane Doe', contact: 'jane@law.test' });
    expect(payload.keyDates[0]).toEqual({ date: '2026-09-01', event: 'Mediation' });
  });

  it('TC-M7-AP-3b: empty optional fields are OMITTED (not nulled)', () => {
    const payload = buildActionPlanPayload({
      nextSteps: [{ id: 'step_1', step: 'Just a step', timeline: '', responsible: '   ' }],
      professionals: [{ id: 'pro_1', role: 'CDFA', name: 'Sam', contact: '' }],
      keyDates: [],
    });
    expect(payload.nextSteps[0]).toEqual({ step: 'Just a step' });
    expect('timeline' in payload.nextSteps[0]).toBe(false);
    expect('responsible' in payload.nextSteps[0]).toBe(false);
    expect(payload.professionals[0]).toEqual({ role: 'CDFA', name: 'Sam' });
    expect('contact' in payload.professionals[0]).toBe(false);
  });

  it('TC-M7-AP-4 (case 4): incomplete rows are dropped', () => {
    const payload = buildActionPlanPayload({
      nextSteps: [
        { id: 's1', step: 'Valid', timeline: '', responsible: '' },
        { id: 's2', step: '', timeline: 'Next week', responsible: 'Me' }, // no step → dropped
        { id: 's3', step: '   ', timeline: '', responsible: '' }, // whitespace step → dropped
      ],
      professionals: [
        { id: 'p1', role: 'Attorney', name: 'Has Name', contact: '' },
        { id: 'p2', role: 'Attorney', name: '', contact: 'x' }, // no name → dropped
        { id: 'p3', role: '', name: 'No Role', contact: '' }, // no role → dropped
      ],
      keyDates: [
        { id: 'd1', date: '2026-01-01', event: 'Has both' },
        { id: 'd2', date: '2026-01-01', event: '' }, // no event → dropped
        { id: 'd3', date: '', event: 'No date' }, // no date → dropped
      ],
    });
    expect(payload.nextSteps).toEqual([{ step: 'Valid' }]);
    expect(payload.professionals).toEqual([{ role: 'Attorney', name: 'Has Name' }]);
    expect(payload.keyDates).toEqual([{ date: '2026-01-01', event: 'Has both' }]);
  });

  it('TC-M7-AP-5 (case 5, payload half): incomplete-only rows → empty payload', () => {
    const payload = buildActionPlanPayload({
      nextSteps: [{ id: 's1', step: '', timeline: 'x', responsible: 'y' }],
      professionals: [{ id: 'p1', role: 'Attorney', name: '', contact: 'x' }],
      keyDates: [{ id: 'd1', date: '', event: 'x' }],
    });
    expect(payload).toEqual({ nextSteps: [], professionals: [], keyDates: [] });
  });

  it('TC-M7-AP-6 (case 6): the in-tool id is stripped from every payload row', () => {
    const payload = buildActionPlanPayload({
      nextSteps: [{ id: 'step_zzz', step: 'A', timeline: 'T', responsible: 'R' }],
      professionals: [{ id: 'pro_zzz', role: 'Attorney', name: 'N', contact: 'C' }],
      keyDates: [{ id: 'date_zzz', date: '2026-01-01', event: 'E' }],
    });
    expect(payload.nextSteps[0]).not.toHaveProperty('id');
    expect(payload.professionals[0]).not.toHaveProperty('id');
    expect(payload.keyDates[0]).not.toHaveProperty('id');
  });

  it('TC-M7-AP-6b: trims field values', () => {
    const payload = buildActionPlanPayload({
      nextSteps: [{ id: 's1', step: '  Trim me  ', timeline: '  soon  ', responsible: '' }],
      professionals: [],
      keyDates: [],
    });
    expect(payload.nextSteps[0]).toEqual({ step: 'Trim me', timeline: 'soon' });
  });
});

// ── mutator round-trips (case 9) ──────────────────────────────────────────────
describe('m7Store — mutator round-trips (case 9)', () => {
  it('TC-M7-AP-9a: next steps — add, update-in-place, remove-correct-row', () => {
    const s = () => useM7Store.getState();
    s().addNextStep({ step: 'First' });
    s().addNextStep({ step: 'Second' });
    let steps = s().actionPlan.nextSteps;
    expect(steps).toHaveLength(2);
    expect(steps.map((x) => x.step)).toEqual(['First', 'Second']);

    // update-in-place: only the targeted row changes
    s().updateNextStep(steps[0].id, { step: 'First (edited)', timeline: 'Today' });
    steps = s().actionPlan.nextSteps;
    expect(steps[0].step).toBe('First (edited)');
    expect(steps[0].timeline).toBe('Today');
    expect(steps[1].step).toBe('Second');

    // remove the correct row
    s().removeNextStep(steps[0].id);
    steps = s().actionPlan.nextSteps;
    expect(steps).toHaveLength(1);
    expect(steps[0].step).toBe('Second');
  });

  it('TC-M7-AP-9b: professionals — add, update-in-place, remove-correct-row', () => {
    const s = () => useM7Store.getState();
    s().addProfessional({ role: 'Attorney', name: 'A' });
    s().addProfessional({ role: 'CDFA', name: 'B' });
    let pros = s().actionPlan.professionals;
    expect(pros).toHaveLength(2);

    s().updateProfessional(pros[1].id, { name: 'B (edited)', contact: 'b@test' });
    pros = s().actionPlan.professionals;
    expect(pros[1].name).toBe('B (edited)');
    expect(pros[1].contact).toBe('b@test');
    expect(pros[0].name).toBe('A');

    s().removeProfessional(pros[0].id);
    pros = s().actionPlan.professionals;
    expect(pros).toHaveLength(1);
    expect(pros[0].name).toBe('B (edited)');
  });

  it('TC-M7-AP-9c: key dates — add, update-in-place, remove-correct-row', () => {
    const s = () => useM7Store.getState();
    s().addKeyDate({ date: '2026-01-01', event: 'X' });
    s().addKeyDate({ date: '2026-02-02', event: 'Y' });
    let dates = s().actionPlan.keyDates;
    expect(dates).toHaveLength(2);

    s().updateKeyDate(dates[0].id, { event: 'X (edited)' });
    dates = s().actionPlan.keyDates;
    expect(dates[0].event).toBe('X (edited)');
    expect(dates[1].event).toBe('Y');

    s().removeKeyDate(dates[1].id);
    dates = s().actionPlan.keyDates;
    expect(dates).toHaveLength(1);
    expect(dates[0].event).toBe('X (edited)');
  });
});

// ── applySuggestedStep (case 12) ──────────────────────────────────────────────
describe('m7Store — applySuggestedStep (case 12, FIX-5)', () => {
  it('TC-M7-AP-12: pushes an EDITABLE next-step row AND auto-dismisses the source', () => {
    const SUGGESTION = 'Complete the Tax Analysis module';
    useM7Store.getState().applySuggestedStep(SUGGESTION);

    const { nextSteps } = useM7Store.getState().actionPlan;
    expect(nextSteps).toHaveLength(1);
    expect(nextSteps[0].step).toBe(SUGGESTION);
    expect(nextSteps[0].id).toBeTruthy(); // has an id → it is a row, not a raw string
    // Same shape as a manually-added row → genuinely editable.
    expect(nextSteps[0]).toHaveProperty('timeline');
    expect(nextSteps[0]).toHaveProperty('responsible');

    // auto-dismiss: the source string lands in dismissedSuggestions
    expect(useM7Store.getState().dismissedSuggestions).toContain(SUGGESTION);

    // editable: the applied row can be edited like any other
    useM7Store.getState().updateNextStep(nextSteps[0].id, { timeline: 'This month' });
    expect(useM7Store.getState().actionPlan.nextSteps[0].timeline).toBe('This month');
  });

  it('TC-M7-AP-12b: an applied suggestion no longer surfaces (component filter composition)', () => {
    const SUGGESTION = 'Complete the Tax Analysis module';
    const sections = { s4: { status: 'empty', label: 'Tax Analysis' } };
    expect(selectSuggestedSteps(sections)).toContain(SUGGESTION);

    useM7Store.getState().applySuggestedStep(SUGGESTION);

    const dismissed = useM7Store.getState().dismissedSuggestions;
    const surfaced = selectSuggestedSteps(sections).filter((x) => !dismissed.includes(x));
    expect(surfaced).not.toContain(SUGGESTION);
  });
});

// ── dismissal + session-only persistence (case 13) ────────────────────────────
describe('m7Store — dismissSuggestion + partialize (case 13, FIX-3/REF-B)', () => {
  it('TC-M7-AP-13a: dismissSuggestion adds to dismissedSuggestions; dismissed item stops surfacing', () => {
    const SUGGESTION = 'Complete the Home Decision module';
    const sections = { s9: { status: 'empty', label: 'Home Decision' } };
    expect(selectSuggestedSteps(sections)).toContain(SUGGESTION);

    useM7Store.getState().dismissSuggestion(SUGGESTION);
    expect(useM7Store.getState().dismissedSuggestions).toContain(SUGGESTION);

    const dismissed = useM7Store.getState().dismissedSuggestions;
    const surfaced = selectSuggestedSteps(sections).filter((x) => !dismissed.includes(x));
    expect(surfaced).not.toContain(SUGGESTION);
  });

  it('TC-M7-AP-13b: dismissedSuggestions is ABSENT from the persisted clearpath-m7 payload', () => {
    // Mutate both slices so each has something to persist.
    useM7Store.getState().addNextStep({ step: 'A real step' });
    useM7Store.getState().dismissSuggestion('Complete the Tax Analysis module');

    const raw = localStorage.getItem('clearpath-m7');
    expect(raw).toBeTruthy();
    const persisted = JSON.parse(raw).state;

    // actionPlan persists; dismissedSuggestions does NOT (partialize omits it).
    expect(persisted.actionPlan).toBeDefined();
    expect(persisted.actionPlan.nextSteps).toHaveLength(1);
    expect('dismissedSuggestions' in persisted).toBe(false);

    // ...even though it IS live in memory (reachable from store actions).
    expect(useM7Store.getState().dismissedSuggestions).toContain('Complete the Tax Analysis module');
  });

  it('TC-M7-AP-13c: actionPlan SURVIVES a persist.rehydrate() round-trip (draft persistence)', () => {
    // Complement of 13b: the draft the user is building IS meant to persist
    // across a reload. Save to the store, then re-read the persisted blob back
    // in and confirm the rows survived.
    useM7Store.getState().addNextStep({ step: 'Persisted step' });
    useM7Store.getState().addProfessional({ role: 'Attorney', name: 'Jane' });

    useM7Store.persist.rehydrate();

    const ap = useM7Store.getState().actionPlan;
    expect(ap.nextSteps).toHaveLength(1);
    expect(ap.nextSteps[0].step).toBe('Persisted step');
    expect(ap.professionals).toHaveLength(1);
    expect(ap.professionals[0].name).toBe('Jane');
  });
});

// ── clear-all (case 14) ───────────────────────────────────────────────────────
describe('m7Store — resetActionPlan (case 14)', () => {
  it('TC-M7-AP-14: clear-all → three empty arrays (and an empty save reads "empty")', () => {
    useM7Store.getState().addNextStep({ step: 'X' });
    useM7Store.getState().addProfessional({ role: 'Attorney', name: 'Y' });
    useM7Store.getState().addKeyDate({ date: '2026-01-01', event: 'Z' });
    useM7Store.getState().dismissSuggestion('Complete the Tax Analysis module');

    useM7Store.getState().resetActionPlan();

    expect(useM7Store.getState().actionPlan).toEqual({ nextSteps: [], professionals: [], keyDates: [] });
    expect(useM7Store.getState().dismissedSuggestions).toEqual([]);

    const { status } = useM7Store.getState().saveActionPlanToBlueprint();
    expect(status).toBe('empty');
  });
});

// ── saveActionPlanToBlueprint integration (cases 5, 8) ─────────────────────────
describe('m7Store — saveActionPlanToBlueprint integration', () => {
  it('TC-M7-AP-INT-1 (case 8): a real entry → s12.data non-null AND status complete (two obligations)', () => {
    useM7Store.getState().addNextStep({ step: 'Open my own bank account' });
    const ret = useM7Store.getState().saveActionPlanToBlueprint();

    expect(ret).toEqual({ status: 'complete' });
    const s12 = useBlueprintStore.getState().sections.s12;
    expect(s12.data).not.toBeNull();
    expect(s12.status).toBe('complete');
    expect(s12.data.nextSteps).toEqual([{ step: 'Open my own bank account' }]);
  });

  it('TC-M7-AP-INT-2 (case 5, status half): incomplete-only store rows → status "empty" (status reads the PAYLOAD, not the store)', () => {
    // Construct non-empty store lists that hold ONLY incomplete rows.
    useM7Store.setState({
      actionPlan: {
        nextSteps: [{ id: 's1', step: '', timeline: 'x', responsible: 'y' }],
        professionals: [{ id: 'p1', role: 'Attorney', name: '', contact: 'x' }],
        keyDates: [{ id: 'd1', date: '', event: 'x' }],
      },
    });
    // Store lists are non-empty...
    expect(useM7Store.getState().actionPlan.nextSteps).toHaveLength(1);

    const ret = useM7Store.getState().saveActionPlanToBlueprint();
    // ...but the payload is empty, so status is 'empty', not a false 'complete'.
    expect(ret).toEqual({ status: 'empty' });
    const s12 = useBlueprintStore.getState().sections.s12;
    expect(s12.status).toBe('empty');
    expect(s12.data).toEqual({ nextSteps: [], professionals: [], keyDates: [] });
  });
});

// ── generated-output compliance (case 15, generated half) ─────────────────────
describe('m7Store — generated-output compliance (case 15)', () => {
  it('TC-M7-AP-15: buildActionPlanPayload emits ONLY contract keys (no advisory fields injected)', () => {
    const payload = buildActionPlanPayload({
      nextSteps: [{ id: 's1', step: 'A step', timeline: 'T', responsible: 'R' }],
      professionals: [{ id: 'p1', role: 'Attorney', name: 'N', contact: 'C' }],
      keyDates: [{ id: 'd1', date: '2026-01-01', event: 'E' }],
    });
    // No keys beyond the locked contract on any row — the builder echoes user
    // text and never injects a verdict/score/advice field.
    expect(Object.keys(payload).sort()).toEqual(['keyDates', 'nextSteps', 'professionals']);
    payload.nextSteps.forEach((r) => expect(Object.keys(r).every((k) => NEXTSTEP_KEYS.includes(k))).toBe(true));
    payload.professionals.forEach((r) => expect(Object.keys(r).every((k) => PRO_KEYS.includes(k))).toBe(true));
    payload.keyDates.forEach((r) => expect(Object.keys(r).every((k) => KEYDATE_KEYS.includes(k))).toBe(true));
  });

  it('TC-M7-AP-15b: applySuggestedStep text (the only tool-generated row content) is non-advisory', () => {
    // The sole generated row text comes from selectSuggestedSteps via
    // applySuggestedStep. Confirm it carries no advice/verdict vocabulary.
    useM7Store.getState().applySuggestedStep('Complete the Tax Analysis module');
    const step = useM7Store.getState().actionPlan.nextSteps[0].step;
    for (const pattern of BANNED) {
      expect(pattern.test(step)).toBe(false);
    }
  });
});
