// Contract: the set of API routes is explicit. Adding a route means adding it here,
// which is the moment to decide whether it is public (src/lib/publicRoutes.ts),
// how it authenticates, and whether it needs rate limiting. A leftover debug
// endpoint (the old /api/convertkit-test) is what this guards against.
import { describe, it, expect } from 'vitest';
import { readdirSync } from 'node:fs';
import path from 'node:path';

const API_DIR = path.resolve(process.cwd(), 'src/app/api');

function findRoutes(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return findRoutes(full);
    return /^route\.(js|ts)$/.test(entry.name)
      ? ['/api/' + path.relative(API_DIR, dir).split(path.sep).join('/')]
      : [];
  });
}

describe('API surface', () => {
  it('is exactly the reviewed set of routes', () => {
    expect(findRoutes(API_DIR).sort()).toEqual([
      '/api/leads',
      '/api/stripe/create-checkout-session',
      '/api/webhooks/stripe',
    ]);
  });
});
