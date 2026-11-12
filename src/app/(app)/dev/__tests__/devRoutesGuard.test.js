// Contract: every route under src/app/(app)/dev is a server page whose first
// statement is devOnly(), so no QA harness can render in a production build.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const DEV_DIR = path.resolve(process.cwd(), 'src/app/(app)/dev');

function findPages(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return findPages(full);
    return /^page\.(jsx?|tsx?)$/.test(entry.name) ? [full] : [];
  });
}

const pages = findPages(DEV_DIR);

describe('dev routes are guarded', () => {
  it('finds the dev pages (guards against a vacuous pass)', () => {
    expect(pages.length).toBeGreaterThanOrEqual(4);
  });

  it.each(pages.map((p) => [path.relative(DEV_DIR, p), p]))('%s calls devOnly() first', (_name, file) => {
    const source = readFileSync(file, 'utf8');
    expect(source).not.toMatch(/^\s*['"]use client['"]/);
    expect(source).toContain("import { devOnly } from '@/src/lib/devOnly';");
    expect(source).toMatch(/export default function \w+\(\) \{\n\s+devOnly\(\);/);
  });
});
