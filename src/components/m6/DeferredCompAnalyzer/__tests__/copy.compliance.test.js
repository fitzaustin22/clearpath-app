import { describe, it, expect } from 'vitest';
import { DCA_COPY, DCA_DISCLAIMER } from '../copy';

// Recursively collect every string leaf from a copy object.
function collectStrings(node, acc = []) {
  if (typeof node === 'string') acc.push(node);
  else if (Array.isArray(node)) node.forEach((n) => collectStrings(n, acc));
  else if (node && typeof node === 'object') Object.values(node).forEach((n) => collectStrings(n, acc));
  return acc;
}

// §9.6 surface 1 — the split-ASSERTION vocabulary. Bans ASSERTING a split; it does
// NOT ban the word "split" (the disclaimer is required to say "not the final split").
const BANNED_ASSERTIONS = ['you get', "you'll receive", 'your share is', '50-50', 'half of'];

describe('DCA copy — surface 1: generated output asserts no split (§9.7 #12)', () => {
  const haystack = [...collectStrings(DCA_COPY), DCA_DISCLAIMER].join(' \n ').toLowerCase();

  it.each(BANNED_ASSERTIONS)('contains no split-assertion phrase: "%s"', (phrase) => {
    expect(haystack).not.toContain(phrase.toLowerCase());
  });

  it('permits the bare word "split" (the disclaimer requires it)', () => {
    expect(DCA_DISCLAIMER.toLowerCase()).toContain('split');
  });
});

describe('DCA copy — surface 2: disclaimer positively states the guardrails (§9.7 #13)', () => {
  const d = DCA_DISCLAIMER;
  const dl = d.toLowerCase();

  it('states the result is the marital portion, not the final split', () => {
    expect(dl).toContain('marital portion');
    expect(dl).toContain('not the final split');
  });

  it('states the split is state-dependent and an attorney question', () => {
    expect(dl).toContain('depends on your state');
    expect(dl).toContain('attorney');
  });

  it('labels the dollars as intrinsic-value estimates (not Black-Scholes)', () => {
    expect(dl).toContain('intrinsic-value estimate');
    expect(d).toContain('Black-Scholes');
  });

  it('states which formula applies turns on the grant intent', () => {
    expect(dl).toContain('intent');
  });

  it('states this is not legal or tax advice', () => {
    expect(dl).toContain('not legal or tax advice');
  });
});
