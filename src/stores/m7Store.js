import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import useBlueprintStore from '@/src/stores/blueprintStore';

/**
 * m7Store — Put It All Together. Tool slices accrue per build phase.
 *
 * Phase A adds the `actionPlan` slice (Action Plan & Timeline, Tool 1 / the
 * §12 writer). The slice is additive — the persist key (`clearpath-m7`) and
 * version (0) mirror m6Store, so no migrate is required (a migrate with no
 * prior persisted version is dead code).
 *
 * Persistence (REF-B): ONLY `actionPlan` persists, via `partialize`. The
 * sibling field `dismissedSuggestions` is held in the store (so the store
 * action `applySuggestedStep` can auto-dismiss) but is OMITTED from persistence
 * — it is a session-only set that resets on reload. It cannot be pure component
 * state because a store action must reach it; the partialized store field is
 * the one mechanism that is both reachable-from-a-store-action and never-persisted.
 *
 * Row shapes (in-store — all string fields default '' for uniform controlled
 * inputs; optional fields are OMITTED from the Blueprint payload by
 * buildActionPlanPayload when empty):
 *   NextStep     = { id: makeId('step'), step, timeline, responsible }   // step required at the boundary
 *   Professional = { id: makeId('pro'),  role, name, contact }           // role + name required at the boundary
 *   KeyDate      = { id: makeId('date'), date, event }                   // date + event required at the boundary
 *
 * The LOCKED §12 payload contract (what buildActionPlanPayload emits, what
 * S12ActionPlan reads) carries NO `id` and OMITS absent optional fields:
 *   { nextSteps:[{step,timeline?,responsible?}],
 *     professionals:[{role,name,contact?}],
 *     keyDates:[{date,event}] }
 */

// Local id factory (mirrors m6Store's store-local makeId; not a shared export).
const makeId = (prefix = 'step') =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// Row factories — uniform shape so a suggestion-applied row is editable exactly
// like a manually-added one (FIX-5: applySuggestedStep "pushes an editable row").
const makeNextStep = (fields = {}) => ({
  id: makeId('step'),
  step: '',
  timeline: '',
  responsible: '',
  ...fields,
});
const makeProfessional = (fields = {}) => ({
  id: makeId('pro'),
  role: '',
  name: '',
  contact: '',
  ...fields,
});
const makeKeyDate = (fields = {}) => ({
  id: makeId('date'),
  date: '',
  event: '',
  ...fields,
});

const trimStr = (v) => (typeof v === 'string' ? v.trim() : '');

/**
 * buildActionPlanPayload — PURE. Maps the in-tool actionPlan slice to the LOCKED
 * §12 Blueprint payload. Strips the in-tool `id`; drops incomplete rows
 * (next-step without `step`; professional without `role` OR `name`; key-date
 * without `date` OR `event`); OMITS (does not null) absent optional fields;
 * empty lists become []. The renderer (S12ActionPlan) reads this shape verbatim.
 */
export function buildActionPlanPayload(actionPlan) {
  const ap = actionPlan ?? {};

  const nextSteps = (Array.isArray(ap.nextSteps) ? ap.nextSteps : [])
    .map((s) => {
      const step = trimStr(s?.step);
      if (!step) return null; // incomplete: no step
      const out = { step };
      const timeline = trimStr(s?.timeline);
      if (timeline) out.timeline = timeline;
      const responsible = trimStr(s?.responsible);
      if (responsible) out.responsible = responsible;
      return out;
    })
    .filter(Boolean);

  const professionals = (Array.isArray(ap.professionals) ? ap.professionals : [])
    .map((p) => {
      const role = trimStr(p?.role);
      const name = trimStr(p?.name);
      if (!role || !name) return null; // incomplete: needs role AND name
      const out = { role, name };
      const contact = trimStr(p?.contact);
      if (contact) out.contact = contact;
      return out;
    })
    .filter(Boolean);

  const keyDates = (Array.isArray(ap.keyDates) ? ap.keyDates : [])
    .map((d) => {
      const date = trimStr(d?.date);
      const event = trimStr(d?.event);
      if (!date || !event) return null; // incomplete: needs date AND event
      return { date, event };
    })
    .filter(Boolean);

  return { nextSteps, professionals, keyDates };
}

// Sections the Action Plan may seed *process* next-steps from. STATUS-DRIVEN
// ONLY — never deep data. EXCLUDES s8 (Support Analysis: the M5 no-writer
// defect leaves its status 'empty' for every user, so seeding it would emit a
// false "Complete the Support Analysis module") AND s12 (this tool IS the s12
// writer; before save s12 is empty, so seeding it would emit a self-referential
// "Complete the Action Plan module"). [FIX-4]
export const SEEDABLE_SECTIONS = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's9', 's10', 's11'];

/**
 * selectSuggestedSteps — PURE over `sections` (the blueprintStore.sections
 * map). For each section in the SEEDABLE_SECTIONS allowlist it emits a
 * NON-ADVISORY *process* next-step keyed to status:
 *   - 'empty' / 'partial' → "Complete the [label] module"      (not yet done)
 *   - 'complete'          → "Review your [label] results with your attorney or CDFA"
 * Returns dismissible suggestion strings; the component filters them against
 * the store's dismissedSuggestions (REF-B), so this helper stays testable on
 * `sections` alone. NEVER reads deep section `data`; NEVER references a figure
 * or a financial decision. s8/s12 are silent at EVERY status (allowlist).
 */
export function selectSuggestedSteps(sections) {
  const secs = sections ?? {};
  const out = [];
  for (const key of SEEDABLE_SECTIONS) {
    const section = secs[key];
    if (!section) continue;
    const label =
      typeof section.label === 'string' && section.label ? section.label : key;
    if (section.status === 'empty' || section.status === 'partial') {
      out.push(`Complete the ${label} module`);
    } else if (section.status === 'complete') {
      out.push(`Review your ${label} results with your attorney or CDFA`);
    }
  }
  return out;
}

export const useM7Store = create(
  persist(
    (set, get) => ({
      actionPlan: { nextSteps: [], professionals: [], keyDates: [] },

      // Session-only set of dismissed suggestion strings. NEVER persisted
      // (omitted by partialize). Reachable from store actions so
      // applySuggestedStep can auto-dismiss (FIX-5) and dismissSuggestion can
      // hide a suggestion (FIX-3). Resets on reload.
      dismissedSuggestions: [],

      // ── Next Steps ────────────────────────────────────────────────────────
      addNextStep: (fields = {}) =>
        set((state) => ({
          actionPlan: {
            ...state.actionPlan,
            nextSteps: [
              ...state.actionPlan.nextSteps,
              makeNextStep({
                step: trimStr(fields.step),
                timeline: trimStr(fields.timeline),
                responsible: trimStr(fields.responsible),
              }),
            ],
          },
        })),
      updateNextStep: (id, patch = {}) =>
        set((state) => ({
          actionPlan: {
            ...state.actionPlan,
            nextSteps: state.actionPlan.nextSteps.map((s) => {
              if (s.id !== id) return s;
              const next = { ...s };
              if (typeof patch.step === 'string') next.step = patch.step;
              if (typeof patch.timeline === 'string') next.timeline = patch.timeline;
              if (typeof patch.responsible === 'string') next.responsible = patch.responsible;
              return next;
            }),
          },
        })),
      removeNextStep: (id) =>
        set((state) => ({
          actionPlan: {
            ...state.actionPlan,
            nextSteps: state.actionPlan.nextSteps.filter((s) => s.id !== id),
          },
        })),

      // ── Professionals ─────────────────────────────────────────────────────
      addProfessional: (fields = {}) =>
        set((state) => ({
          actionPlan: {
            ...state.actionPlan,
            professionals: [
              ...state.actionPlan.professionals,
              makeProfessional({
                role: trimStr(fields.role),
                name: trimStr(fields.name),
                contact: trimStr(fields.contact),
              }),
            ],
          },
        })),
      updateProfessional: (id, patch = {}) =>
        set((state) => ({
          actionPlan: {
            ...state.actionPlan,
            professionals: state.actionPlan.professionals.map((p) => {
              if (p.id !== id) return p;
              const next = { ...p };
              if (typeof patch.role === 'string') next.role = patch.role;
              if (typeof patch.name === 'string') next.name = patch.name;
              if (typeof patch.contact === 'string') next.contact = patch.contact;
              return next;
            }),
          },
        })),
      removeProfessional: (id) =>
        set((state) => ({
          actionPlan: {
            ...state.actionPlan,
            professionals: state.actionPlan.professionals.filter((p) => p.id !== id),
          },
        })),

      // ── Key Dates ─────────────────────────────────────────────────────────
      addKeyDate: (fields = {}) =>
        set((state) => ({
          actionPlan: {
            ...state.actionPlan,
            keyDates: [
              ...state.actionPlan.keyDates,
              makeKeyDate({ date: trimStr(fields.date), event: trimStr(fields.event) }),
            ],
          },
        })),
      updateKeyDate: (id, patch = {}) =>
        set((state) => ({
          actionPlan: {
            ...state.actionPlan,
            keyDates: state.actionPlan.keyDates.map((d) => {
              if (d.id !== id) return d;
              const next = { ...d };
              if (typeof patch.date === 'string') next.date = patch.date;
              if (typeof patch.event === 'string') next.event = patch.event;
              return next;
            }),
          },
        })),
      removeKeyDate: (id) =>
        set((state) => ({
          actionPlan: {
            ...state.actionPlan,
            keyDates: state.actionPlan.keyDates.filter((d) => d.id !== id),
          },
        })),

      // ── Suggested steps (status-driven, dismissible) ──────────────────────
      // Apply a suggested step: push an EDITABLE next-step row carrying the
      // suggestion text, then auto-dismiss the source string so it never renders
      // simultaneously as a pending suggestion and an applied row (FIX-5). Both
      // this and dismissSuggestion operate on the same session-only set.
      applySuggestedStep: (suggestion) => {
        const text = trimStr(suggestion);
        if (!text) return;
        set((state) => ({
          actionPlan: {
            ...state.actionPlan,
            nextSteps: [...state.actionPlan.nextSteps, makeNextStep({ step: text })],
          },
          dismissedSuggestions: state.dismissedSuggestions.includes(text)
            ? state.dismissedSuggestions
            : [...state.dismissedSuggestions, text],
        }));
      },
      // Dismiss a suggestion: add the string to the session-only set so it does
      // not re-surface this session (FIX-3). Never persisted (partialize omits it).
      dismissSuggestion: (suggestion) => {
        const text = trimStr(suggestion);
        if (!text) return;
        set((state) => ({
          dismissedSuggestions: state.dismissedSuggestions.includes(text)
            ? state.dismissedSuggestions
            : [...state.dismissedSuggestions, text],
        }));
      },

      // ── Reset / Save ──────────────────────────────────────────────────────
      resetActionPlan: () =>
        set({
          actionPlan: { nextSteps: [], professionals: [], keyDates: [] },
          dismissedSuggestions: [],
        }),

      // Explicit, user-triggered write into Blueprint §12. Builds the payload
      // (dropping incomplete rows, stripping ids) and hands it to the dedicated
      // single-source writer updateActionPlan, which sets s12.data AND derives
      // status from the PAYLOAD lists. Returns { status } from the Blueprint action.
      saveActionPlanToBlueprint: () => {
        const payload = buildActionPlanPayload(get().actionPlan);
        return useBlueprintStore.getState().updateActionPlan(payload);
      },
    }),
    {
      name: 'clearpath-m7',
      storage: createJSONStorage(() => localStorage),
      version: 0,
      // REF-B: persist ONLY actionPlan. dismissedSuggestions is session-only.
      partialize: (state) => ({ actionPlan: state.actionPlan }),
    },
  ),
);

export default useM7Store;
