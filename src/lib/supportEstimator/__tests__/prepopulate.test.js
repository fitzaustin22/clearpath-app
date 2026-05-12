/**
 * Support Estimator pre-pop TC runner — §6.7.3 cross-cutting test cases for
 * `prePopulateSupportEstimatorInputs`. Lives separately from the calc-engine
 * runner (calculateSupport.test.js) because fixture shape differs:
 *   - calc fixtures:    { id, input: <inputs>, expected: <results> }
 *   - prepop fixtures:  { id, input: { m1Store, m2Store, m3Store },
 *                             expected: { inputs, _prePopSources } }
 *
 * Physical separation via fixtures/prepop/ subdir keeps the non-recursive
 * readdirSync in the calc runner from picking these up.
 *
 * Partial-deep-equality semantics mirror the calc runner: keys present in
 * `expected` are checked; absent keys are ignored.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { prePopulateSupportEstimatorInputs } from '@/src/stores/prePopulate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURES_DIR = join(__dirname, 'fixtures', 'prepop');

const fixtures = readdirSync(FIXTURES_DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(FIXTURES_DIR, f), 'utf-8')));

function assertPartialDeepEqual(actual, expected, tcId, path = '') {
  for (const key of Object.keys(expected)) {
    const fullPath = path ? `${path}.${key}` : key;
    const exp = expected[key];
    const act = actual == null ? undefined : actual[key];

    if (exp === null) {
      expect(act, `${tcId} @ ${fullPath} expected null, got ${JSON.stringify(act)}`).toBeNull();
    } else if (typeof exp === 'number') {
      expect(typeof act, `${tcId} @ ${fullPath} type`).toBe('number');
      expect(
        Math.abs(act - exp),
        `${tcId} @ ${fullPath} (expected ${exp}, got ${act})`,
      ).toBeLessThanOrEqual(1);
    } else if (typeof exp === 'object' && !Array.isArray(exp)) {
      expect(
        typeof act === 'object' && act !== null,
        `${tcId} @ ${fullPath} expected object, got ${typeof act}`,
      ).toBe(true);
      assertPartialDeepEqual(act, exp, tcId, fullPath);
    } else {
      expect(act, `${tcId} @ ${fullPath}`).toStrictEqual(exp);
    }
  }
}

describe('Support Estimator — prePopulate fixtures (§6.7.3)', () => {
  expect(fixtures.length).toBeGreaterThan(0);

  for (const fx of fixtures) {
    it(`${fx.id}: ${fx.description}`, () => {
      const result = prePopulateSupportEstimatorInputs(fx.input);
      assertPartialDeepEqual(result, fx.expected, fx.id);
    });
  }
});
