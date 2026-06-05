import { describe, it, expect } from 'vitest';
import { deriveProgressCopy } from '../deriveProgressCopy';

describe('deriveProgressCopy', () => {
  it('builds the design reference sentence (4 written, 2 underway, 6 to go) consumer-framed', () => {
    const { sentence, percentComplete } = deriveProgressCopy(4, 2);
    expect(sentence).toBe(
      'Four sections written, two underway. Six still to go before your Blueprint is complete.'
    );
    expect(percentComplete).toBe(33); // 4/12 = 33.33 → rounded to 33
  });

  it('never includes "attorney" or "hand to an attorney" framing (D1 rule)', () => {
    const cases = [[0, 0], [1, 0], [4, 2], [11, 1], [12, 0]];
    for (const [c, p] of cases) {
      const { sentence } = deriveProgressCopy(c, p);
      expect(sentence.toLowerCase()).not.toContain('attorney');
      expect(sentence.toLowerCase()).not.toContain('hand to');
    }
  });

  it('returns the zero-start sentinel when nothing is started', () => {
    const { sentence, percentComplete } = deriveProgressCopy(0, 0);
    expect(sentence).toBe('Your Blueprint is ready to build. Begin with the first section to start.');
    expect(percentComplete).toBe(0);
  });

  it('returns the all-complete sentinel when 12/12 written', () => {
    const { sentence, percentComplete } = deriveProgressCopy(12, 0);
    expect(sentence).toBe('Your Blueprint is complete — all twelve sections written.');
    expect(percentComplete).toBe(100);
  });

  it('singularizes "section" when exactly one written and none underway', () => {
    const { sentence } = deriveProgressCopy(1, 0);
    expect(sentence).toBe('One section written. Eleven still to go before your Blueprint is complete.');
  });

  it('drops the "underway" clause when partial=0', () => {
    const { sentence } = deriveProgressCopy(3, 0);
    expect(sentence).toBe('Three sections written. Nine still to go before your Blueprint is complete.');
  });

  it('reports the "almost there" tail when nothing is left to go and some are underway', () => {
    // 11 written + 1 underway → 0 remaining
    const { sentence, percentComplete } = deriveProgressCopy(11, 1);
    expect(sentence).toBe('Eleven sections written, one underway. Almost there — your Blueprint is nearly complete.');
    expect(percentComplete).toBe(92);
  });

  it('clamps negative inputs to zero', () => {
    const { sentence, percentComplete } = deriveProgressCopy(-3, -1);
    expect(sentence).toBe('Your Blueprint is ready to build. Begin with the first section to start.');
    expect(percentComplete).toBe(0);
  });

  it('clamps over-total inputs to the 12-section ceiling', () => {
    const { sentence, percentComplete } = deriveProgressCopy(20, 5);
    expect(sentence).toBe('Your Blueprint is complete — all twelve sections written.');
    expect(percentComplete).toBe(100);
  });

  it('clamps partial so completed+partial never exceeds 12', () => {
    // completed=10, partial=5 → partial gets clamped to 2 (10+2=12), remaining=0 → "almost there" tail
    const { sentence, percentComplete } = deriveProgressCopy(10, 5);
    expect(sentence).toBe('Ten sections written, two underway. Almost there — your Blueprint is nearly complete.');
    expect(percentComplete).toBe(83);
  });

  it('coerces non-numeric inputs to zero', () => {
    const { sentence, percentComplete } = deriveProgressCopy('abc', NaN);
    expect(sentence).toBe('Your Blueprint is ready to build. Begin with the first section to start.');
    expect(percentComplete).toBe(0);
  });
});
