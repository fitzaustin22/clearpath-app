/**
 * Support Estimator validation TC runner — §6.7.1 partial-deep-equality.
 *
 * Loads every fixture in ./fixtures/*.json and asserts that the keys
 * present in `expected` match the calculator result. Other result fields
 * are not checked.
 *
 * Tolerance per §6.7.1: $1 absolute on monetary values; exact on enum
 * strings and booleans.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { calculateSupport } from '../calculateSupport.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURES_DIR = join(__dirname, 'fixtures');

const fixtures = readdirSync(FIXTURES_DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(FIXTURES_DIR, f), 'utf-8')));

function assertPartialDeepEqual(actual, expected, tcId, path = '') {
  for (const key of Object.keys(expected)) {
    const fullPath = path ? `${path}.${key}` : key;
    const exp = expected[key];
    const act = actual?.[key];

    if (exp === null) {
      expect(act, `${tcId} @ ${fullPath} expected null, got ${JSON.stringify(act)}`).toBeNull();
    } else if (Array.isArray(exp)) {
      // Arrays asserted by length + per-element partial-deep-equality.
      expect(
        Array.isArray(act),
        `${tcId} @ ${fullPath} expected array, got ${typeof act}`,
      ).toBe(true);
      expect(
        act.length >= exp.length,
        `${tcId} @ ${fullPath} expected at least ${exp.length} elements, got ${act.length}`,
      ).toBe(true);
      for (let i = 0; i < exp.length; i++) {
        if (typeof exp[i] === 'object' && exp[i] !== null) {
          assertPartialDeepEqual(act[i], exp[i], tcId, `${fullPath}[${i}]`);
        } else {
          expect(act[i], `${tcId} @ ${fullPath}[${i}]`).toStrictEqual(exp[i]);
        }
      }
    } else if (typeof exp === 'number') {
      // §6.7.1: $1 absolute tolerance on monetary values.
      expect(
        Math.abs(act - exp),
        `${tcId} @ ${fullPath} expected ${exp}, got ${act}`,
      ).toBeLessThanOrEqual(1);
    } else if (typeof exp === 'object') {
      assertPartialDeepEqual(act, exp, tcId, fullPath);
    } else {
      expect(act, `${tcId} @ ${fullPath}`).toStrictEqual(exp);
    }
  }
}

describe('Support Estimator — calculateSupport fixtures (§6.7)', () => {
  for (const fx of fixtures) {
    it(`${fx.id}: ${fx.description}`, () => {
      const result = calculateSupport(fx.input);
      assertPartialDeepEqual(result, fx.expected, fx.id);
    });
  }
});
