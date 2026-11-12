// Fails when eslint-suppressions.json suppresses more violations of any rule
// than it does on the base commit, so the lint baseline can shrink but never grow.
// Usage: node .github/scripts/check-lint-baseline.mjs [base-ref]   (default: HEAD^1)
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const FILE = 'eslint-suppressions.json';
const baseRef = process.argv[2] ?? 'HEAD^1';

function totalsByRule(json) {
  const totals = new Map();
  for (const rules of Object.values(JSON.parse(json))) {
    for (const [rule, { count }] of Object.entries(rules)) {
      totals.set(rule, (totals.get(rule) ?? 0) + count);
    }
  }
  return totals;
}

let baseJson;
try {
  baseJson = execFileSync('git', ['show', `${baseRef}:${FILE}`], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
} catch {
  console.log(`No ${FILE} on ${baseRef}; nothing to compare.`);
  process.exit(0);
}

const base = totalsByRule(baseJson);
const head = totalsByRule(existsSync(FILE) ? readFileSync(FILE, 'utf8') : '{}');
const rules = [...new Set([...base.keys(), ...head.keys()])].sort();
const grew = rules.filter((rule) => (head.get(rule) ?? 0) > (base.get(rule) ?? 0));

for (const rule of rules) {
  console.log(`${rule}: ${base.get(rule) ?? 0} -> ${head.get(rule) ?? 0}`);
}

if (grew.length > 0) {
  console.error(`\n${FILE} grew for: ${grew.join(', ')}.`);
  console.error('Fix new lint errors instead of suppressing them. Never re-run eslint --suppress-all.');
  process.exit(1);
}
console.log('\nLint baseline did not grow.');
