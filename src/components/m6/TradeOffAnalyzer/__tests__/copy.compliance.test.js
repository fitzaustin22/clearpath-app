/**
 * TradeOffAnalyzer copy — compliance + byte hygiene (§7.6).
 *
 * The tool organizes the user's own thinking; it never renders a verdict, a
 * recommendation, a fees-vs-value calculation, or a "worth it" steer. The
 * garage-sale note is purely factual and computes nothing. Copy is straight-
 * quotes-only (no smart quotes, zero-width chars, BOM, or autolink artifacts).
 */

import { describe, it, expect } from 'vitest';
import { TRADEOFF_COPY, TRADEOFF_DISCLAIMER } from '../copy';

// Recursively collect every string value in the copy tree.
function collectStrings(obj, acc = []) {
  if (typeof obj === 'string') {
    acc.push(obj);
  } else if (Array.isArray(obj)) {
    obj.forEach((v) => collectStrings(v, acc));
  } else if (obj && typeof obj === 'object') {
    Object.values(obj).forEach((v) => collectStrings(v, acc));
  }
  return acc;
}

const ALL_STRINGS = [TRADEOFF_DISCLAIMER, ...collectStrings(TRADEOFF_COPY)];

describe('TradeOffAnalyzer copy — compliance (no verdict / advice / fees-vs-value)', () => {
  const BANNED = [
    /worth it/i,
    /\brecommend/i,
    /better (deal|option|outcome)/i,
    /\bbest (option|choice|deal)\b/i,
    /we (suggest|advise)/i,
    /you should\b/i,
    /\bguarantee/i,
    /fair share/i,
  ];

  it('contains no verdict / recommendation / "worth it" language', () => {
    for (const s of ALL_STRINGS) {
      for (const re of BANNED) {
        expect(s, `banned phrase ${re} found in: "${s}"`).not.toMatch(re);
      }
    }
  });

  it('the garage-sale note is purely factual — no digits, no dollar figure, no percentage', () => {
    const note = TRADEOFF_COPY.build.garageSaleNote;
    expect(typeof note).toBe('string');
    expect(note.length).toBeGreaterThan(0);
    expect(note).not.toMatch(/\d/);
    expect(note).not.toContain('$');
    expect(note).not.toMatch(/%/);
  });
});

describe('TradeOffAnalyzer copy — byte hygiene (straight quotes only)', () => {
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
