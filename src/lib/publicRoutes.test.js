import { describe, it, expect } from 'vitest';
import { createPathMatcher } from '@clerk/shared/pathMatcher';
import { PUBLIC_ROUTES } from '@/src/lib/publicRoutes';

// proxy.ts builds its gate as createRouteMatcher(PUBLIC_ROUTES); Clerk's
// createRouteMatcher delegates to this exact createPathMatcher engine, calling
// it with req.nextUrl.pathname. Re-deriving the matcher here over the SAME
// PUBLIC_ROUTES array exercises the real public/protected split without
// importing proxy.ts (which pulls in @clerk/nextjs/server -> server-only and is
// unimportable under jsdom).
const isPublicRoute = createPathMatcher(PUBLIC_ROUTES);

describe('proxy.ts public-route matrix', () => {
  // Each path must render WITHOUT redirecting to /login (matcher === true, so
  // auth.protect() is skipped): the real Clerk auth routes (/login, /signup),
  // the free M1 surface, billing, and every marketing page — including the four
  // (/about, /resources, /privacy, /terms) this change adds.
  const PUBLIC = [
    '/',
    '/about',
    '/resources',
    '/pricing',
    '/privacy',
    '/terms',
    '/login',
    '/signup',
    '/modules/m1',
    '/upgrade',
    '/api/webhooks',
    '/api/leads',
  ];

  // Each path must stay gated (matcher === false, so auth.protect() runs).
  const PROTECTED = [
    '/dashboard',
    '/blueprint',
    '/modules/m2',
  ];

  it.each(PUBLIC)('treats %s as PUBLIC (auth.protect skipped)', (path) => {
    expect(isPublicRoute(path)).toBe(true);
  });

  it.each(PROTECTED)('treats %s as PROTECTED (auth.protect runs)', (path) => {
    expect(isPublicRoute(path)).toBe(false);
  });

  it('does not leak the /modules/m1 glob to sibling module routes', () => {
    expect(isPublicRoute('/modules/m1')).toBe(true);
    expect(isPublicRoute('/modules/m1/readiness')).toBe(true);
    expect(isPublicRoute('/modules/m2')).toBe(false);
    expect(isPublicRoute('/modules/m3')).toBe(false);
  });
});
