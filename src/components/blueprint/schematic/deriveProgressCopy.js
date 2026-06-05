/**
 * Sidebar progress copy — the consumer-framed two-sentence summary that lives
 * under the "33%" stat in the design sidebar. Computed from store counts so it
 * never drifts from reality.
 *
 * Phase-1 D1 rewrite: the design's reference sentence ends with "before your
 * file is ready to hand to an attorney." That trips the "no attorney-ready
 * language on this surface" rule. The CONSUMER rewrite keeps the structure but
 * ends with "before your Blueprint is complete." applied uniformly across all
 * counts. Numbers are spelled out for small values (≤ ten) and digits otherwise,
 * matching the design's "Four sections written, two underway. Six still to go…"
 * cadence.
 *
 * Edge cases:
 *   completed=0, partial=0  →  "Your Blueprint is ready to build. Begin with the first section to start."
 *   completed=12            →  "Your Blueprint is complete — all twelve sections written."
 *
 * percentComplete is just `round(completed / 12 * 100)`, returned alongside the
 * copy so the sidebar stat number and the copy come from a single computation.
 */

const TOTAL = 12;

const NUMBER_WORDS = Object.freeze({
  0: 'zero', 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five',
  6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten',
  11: 'eleven', 12: 'twelve',
});

function spell(n) {
  return NUMBER_WORDS[n] ?? String(n);
}

function capitalize(s) {
  if (!s) return s;
  return s[0].toUpperCase() + s.slice(1);
}

function pluralizeSection(n) {
  return n === 1 ? 'section' : 'sections';
}

export function deriveProgressCopy(completed, partial) {
  const safeCompleted = Math.max(0, Math.min(TOTAL, Number(completed) || 0));
  const safePartial = Math.max(0, Math.min(TOTAL - safeCompleted, Number(partial) || 0));
  const remaining = Math.max(0, TOTAL - safeCompleted - safePartial);
  const percentComplete = Math.round((safeCompleted / TOTAL) * 100);

  if (safeCompleted === TOTAL) {
    return {
      percentComplete,
      sentence: 'Your Blueprint is complete — all twelve sections written.',
    };
  }

  if (safeCompleted === 0 && safePartial === 0) {
    return {
      percentComplete,
      sentence: 'Your Blueprint is ready to build. Begin with the first section to start.',
    };
  }

  const writtenPart = `${capitalize(spell(safeCompleted))} ${pluralizeSection(safeCompleted)} written`;
  const underwayPart = safePartial > 0
    ? `${spell(safePartial)} underway`
    : null;
  const togoPart = remaining > 0
    ? `${capitalize(spell(remaining))} still to go before your Blueprint is complete.`
    : 'Almost there — your Blueprint is nearly complete.';

  const firstSentence = underwayPart
    ? `${writtenPart}, ${underwayPart}.`
    : `${writtenPart}.`;

  return {
    percentComplete,
    sentence: `${firstSentence} ${togoPart}`,
  };
}
