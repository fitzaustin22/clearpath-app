/**
 * Settlement Offer Organizer — compliance (the load-bearing §8.8 / §8.9 SPLIT).
 *
 * The compliance line (non-negotiable, AI-Knowledge-Base-Architecture.md §5
 * "never evaluate offers"): the tool ORGANIZES and MAPS an offer against the
 * user's priorities and surfaces what it is silent on. It NEVER scores, grades,
 * rates, ranks, or says better / worse / fair / accept / reject / recommend.
 *
 * The split is the whole point:
 *   (8) GENERATED OUTPUT — the strings the tool itself emits (buildOfferMap /
 *       buildOfferGaps output + the dynamic §11 readout) must contain NONE of
 *       the verdict vocabulary. Scoped to generated output ONLY.
 *   (9) THE DISCLAIMER — the ONE surface where those words MUST appear, because
 *       it is precisely where the tool disclaims evaluating. The disclaimer is
 *       deliberately NOT in (8)'s ban scope.
 *
 * Plus byte hygiene over the copy-as-data surface (straight quotes only).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { OFFER_COPY, OFFER_DISCLAIMER } from '../copy';
import { useM6Store, buildOfferMap, buildOfferGaps } from '@/src/stores/m6Store';
import useBlueprintStore from '@/src/stores/blueprintStore';
import S11SettlementEvaluation from '@/src/components/blueprint/sections/S11SettlementEvaluation';

// The verdict vocabulary the GENERATED output must never contain (case-insensitive).
const BANNED_VERDICT = /score|grade|rate|fair|better|worse|accept|reject|recommend|should|fails/i;

// Recursively collect every string value in a copy tree.
function collectStrings(obj, acc = []) {
  if (typeof obj === 'string') acc.push(obj);
  else if (Array.isArray(obj)) obj.forEach((v) => collectStrings(v, acc));
  else if (obj && typeof obj === 'object') Object.values(obj).forEach((v) => collectStrings(v, acc));
  return acc;
}

// A clean priorities spine (Phase 1 payload shape) with no verdict words in the
// user labels — so any banned hit would come from the TOOL, not the fixture.
const PRIORITIES = [
  { item: 'Keep the house', importance: 'must-have', rank: 1 },
  { item: 'Time with the kids', importance: 'must-have', rank: 2 },
  { item: 'Retirement security', importance: 'would-like', rank: 1 },
];

beforeEach(() => {
  localStorage.clear();
  useM6Store.getState().resetOffer();
  useM6Store.getState().resetPriorities();
  useBlueprintStore.getState().resetBlueprint();
});

// ── (8) GENERATED OUTPUT — no verdict vocabulary ──────────────────────────────

describe('compliance (8) — GENERATED output carries no verdict vocabulary', () => {
  it('buildOfferMap + buildOfferGaps emit no score/grade/rate/fair/better/worse/accept/reject/recommend/should/fails', () => {
    const offer = { priorityTags: { 'Keep the house': 'addressed' } };
    const mapStrings = collectStrings(buildOfferMap(offer, PRIORITIES));
    const gapStrings = collectStrings(buildOfferGaps({})); // empty offer → all six gaps

    for (const s of [...mapStrings, ...gapStrings]) {
      expect(s, `banned verdict vocab in generated string: "${s}"`).not.toMatch(BANNED_VERDICT);
    }
    // sanity: we actually produced output (the test isn't vacuous)
    expect(mapStrings.length).toBeGreaterThan(0);
    expect(gapStrings.length).toBeGreaterThan(0);
  });

  it('the rendered §11 readout (a real saved payload) carries no verdict vocabulary', () => {
    // Build a real generated payload through the store, then render it.
    PRIORITIES.forEach((p) => {
      useM6Store.getState().addPriority({ item: p.item });
      const items = useM6Store.getState().priorities.items;
      useM6Store.getState().setPriorityImportance(items[items.length - 1].id, p.importance);
    });
    useM6Store.getState().addAssetItem({ label: 'The house', toUser: 'You' });
    useM6Store.getState().setOfferField('support.amount', 2000);
    useM6Store.getState().setOfferField('support.durationMonths', 36);
    useM6Store.getState().setOfferField('support.kind', 'Spousal');
    useM6Store.getState().tagPriority('Keep the house');
    useM6Store.getState().saveOfferToBlueprint();

    const data = useBlueprintStore.getState().sections.s11.data;
    const { container } = render(<S11SettlementEvaluation data={data} status="complete" />);

    expect(container.textContent).not.toMatch(BANNED_VERDICT);
    // sanity: the readout actually rendered content
    expect(container.textContent).toMatch(/Keep the house/);
    expect(container.textContent).toMatch(/silent on/);
  });
});

// ── (9) THE DISCLAIMER — the one place those words must appear ─────────────────

describe('compliance (9) — the disclaimer positively disclaims evaluation', () => {
  it('OFFER_DISCLAIMER states it is not an evaluation and that accept/reject is the user decision', () => {
    expect(OFFER_DISCLAIMER).toMatch(/not an evaluation/i);
    expect(OFFER_DISCLAIMER).toMatch(/accept or reject/i);
    expect(OFFER_DISCLAIMER).toMatch(/your(s)?\b/i); // "those decisions are yours"
    expect(OFFER_DISCLAIMER).toMatch(/score/i); // "does not score an offer"
    expect(OFFER_DISCLAIMER).toMatch(/fair/i); // "call it fair or unfair"
  });

  it('the disclaimer is INTENTIONALLY outside the (8) ban scope — it must contain the disclaiming words', () => {
    // This is the explicit documentation of the split: the same words banned
    // from generated output are REQUIRED here, on the disclaiming surface.
    expect(OFFER_DISCLAIMER).toMatch(BANNED_VERDICT);
  });
});

// ── Byte hygiene — straight quotes only over the copy-as-data surface ──────────

describe('Settlement Offer Organizer copy — byte hygiene (straight quotes only)', () => {
  const ALL_STRINGS = [OFFER_DISCLAIMER, ...collectStrings(OFFER_COPY)];

  it('has no smart quotes, zero-width chars, BOM, or markdown autolink artifacts', () => {
    const bannedChars = ['‘', '’', '“', '”', '​', '﻿'];
    for (const s of ALL_STRINGS) {
      for (const ch of bannedChars) {
        expect(
          s.includes(ch),
          `codepoint U+${ch.charCodeAt(0).toString(16).toUpperCase()} found in: "${s}"`,
        ).toBe(false);
      }
      expect(s.includes('](http'), `autolink artifact in: "${s}"`).toBe(false);
    }
  });
});
