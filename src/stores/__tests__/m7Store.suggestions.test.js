/**
 * m7Store — selectSuggestedSteps (Action Plan & Timeline, M7 Phase A).
 *
 * §6.7 cases 10, 11, 15 (seeded half). The seeder is NON-ADVISORY and
 * STATUS-DRIVEN ONLY. For each section in the SEEDABLE_SECTIONS allowlist it
 * emits a *process* next-step keyed to status:
 *   - 'empty' / 'partial'  → "Complete the [label] module"
 *   - 'complete'           → "Review your [label] results with your attorney or CDFA"
 * It NEVER reads deep section `data`, never references a figure or financial
 * decision, and the allowlist EXCLUDES s8 (the M5 no-writer defect makes its
 * status empty for every user → a false "Complete the Support Analysis module")
 * AND s12 (this tool IS the s12 writer → a self-referential suggestion). Both
 * exclusions hold for EVERY status. Pure over `sections`; dismissal filtering
 * happens in the component, so this stays testable on sections alone.
 */

import { describe, it, expect } from 'vitest';
import { selectSuggestedSteps, SEEDABLE_SECTIONS } from '../m7Store.js';

// Minimal sections fixture mirroring blueprintStore.sections — only status +
// label are read by the (pure) seeder. `status` applied to ALL seedable rows.
function makeSections(status) {
  const labels = {
    s1: 'Personal Profile',
    s2: 'Income Analysis',
    s3: 'Asset Inventory',
    s4: 'Tax Analysis',
    s5: 'Property Division',
    s6: 'Retirement Plan Division',
    s7: 'Expense Analysis',
    s8: 'Support Analysis',
    s9: 'Home Decision',
    s10: 'Negotiation Strategy',
    s11: 'Settlement Offer Overview',
    s12: 'Action Plan & Timeline',
  };
  const out = {};
  for (const [key, label] of Object.entries(labels)) out[key] = { status, label };
  return out;
}

// Advisory / verdict vocabulary that must NEVER appear in generated copy.
const BANNED = [
  /\byou should\b/i,
  /\bwe recommend\b/i,
  /\brecommend(ed|ation)?\b/i,
  /\bbest\b/i,
  /\bworth\b/i,
  /\baccept\b/i,
  /\breject\b/i,
  /\badvise\b/i,
  /\bguarantee\b/i,
  /\$/,
];

describe('m7Store selectSuggestedSteps — allowlist + exclusions', () => {
  it('TC-M7-SUG-1: SEEDABLE_SECTIONS excludes BOTH s8 and s12 (FIX-4)', () => {
    expect(SEEDABLE_SECTIONS).not.toContain('s8');
    expect(SEEDABLE_SECTIONS).not.toContain('s12');
  });

  it('TC-M7-SUG-2 (case 10): s8 Support Analysis emits NO suggestion when empty', () => {
    const suggestions = selectSuggestedSteps(makeSections('empty'));
    expect(suggestions.some((s) => /Support Analysis/.test(s))).toBe(false);
  });

  it('TC-M7-SUG-3 (case 11): s12 Action Plan emits NO self-referential suggestion when empty', () => {
    const suggestions = selectSuggestedSteps(makeSections('empty'));
    expect(suggestions.some((s) => /Action Plan/.test(s))).toBe(false);
  });
});

describe('m7Store selectSuggestedSteps — status-driven behavior', () => {
  it('TC-M7-SUG-4: returns [] when given no sections', () => {
    expect(selectSuggestedSteps()).toEqual([]);
    expect(selectSuggestedSteps({})).toEqual([]);
  });

  it('TC-M7-SUG-5: an empty seedable section seeds "Complete the [label] module"', () => {
    expect(selectSuggestedSteps({ s4: { status: 'empty', label: 'Tax Analysis' } })).toEqual([
      'Complete the Tax Analysis module',
    ]);
  });

  it('TC-M7-SUG-6: a partial seedable section is also seeded "Complete the [label] module"', () => {
    expect(selectSuggestedSteps({ s9: { status: 'partial', label: 'Home Decision' } })).toEqual([
      'Complete the Home Decision module',
    ]);
  });

  it('TC-M7-SUG-7 (ruling a): a COMPLETE seedable section seeds "Review your [label] results with your attorney or CDFA"', () => {
    expect(selectSuggestedSteps({ s4: { status: 'complete', label: 'Tax Analysis' } })).toEqual([
      'Review your Tax Analysis results with your attorney or CDFA',
    ]);
  });

  it('TC-M7-SUG-8: never reads deep section data (pure over status + label)', () => {
    const suggestions = selectSuggestedSteps({
      s4: { status: 'empty', label: 'Tax Analysis', data: { maxSavings: 12345 } },
    });
    expect(suggestions.some((s) => /12345/.test(s))).toBe(false);
    expect(suggestions).toEqual(['Complete the Tax Analysis module']);
  });

  it('TC-M7-SUG-9: all-empty → one "Complete the [label] module" per seedable section (10), none for s8/s12', () => {
    const suggestions = selectSuggestedSteps(makeSections('empty'));
    expect(suggestions).toHaveLength(SEEDABLE_SECTIONS.length); // 10
    expect(suggestions.every((s) => /^Complete the .+ module$/.test(s))).toBe(true);
    expect(suggestions.some((s) => /Support Analysis/.test(s))).toBe(false);
    expect(suggestions.some((s) => /Action Plan/.test(s))).toBe(false);
  });

  it('TC-M7-SUG-10: all-complete → one "Review your [label] results…" per seedable section (10), none for s8/s12', () => {
    const suggestions = selectSuggestedSteps(makeSections('complete'));
    expect(suggestions).toHaveLength(SEEDABLE_SECTIONS.length); // 10
    expect(suggestions.every((s) => /^Review your .+ results with your attorney or CDFA$/.test(s))).toBe(true);
    expect(suggestions.some((s) => /Support Analysis/.test(s))).toBe(false);
    expect(suggestions.some((s) => /Action Plan/.test(s))).toBe(false);
  });
});

describe('m7Store selectSuggestedSteps — s8/s12 silent at EVERY status (FIX-4 + ruling b)', () => {
  it('TC-M7-SUG-11 (ruling b): s8 and s12 stay silent even when COMPLETE', () => {
    const suggestions = selectSuggestedSteps({
      s8: { status: 'complete', label: 'Support Analysis' },
      s12: { status: 'complete', label: 'Action Plan & Timeline' },
    });
    expect(suggestions).toEqual([]);
    // explicit: a complete s12 emits nothing (no self-referential "Review your Action Plan…")
    expect(selectSuggestedSteps({ s12: { status: 'complete', label: 'Action Plan & Timeline' } })).toEqual([]);
  });
});

describe('m7Store selectSuggestedSteps — compliance (case 15, seeded half)', () => {
  it('TC-M7-SUG-12 (ruling c): BOTH templates ("Complete the…" and "Review your…") are non-advisory', () => {
    const completeStrings = selectSuggestedSteps(makeSections('empty')); // "Complete the…"
    const reviewStrings = selectSuggestedSteps(makeSections('complete')); // "Review your…"
    const all = [...completeStrings, ...reviewStrings];
    expect(completeStrings.length).toBeGreaterThan(0);
    expect(reviewStrings.length).toBeGreaterThan(0);
    for (const s of all) {
      for (const pattern of BANNED) {
        expect(pattern.test(s)).toBe(false);
      }
    }
  });
});
