// Single source of truth for the routes that bypass Clerk auth in src/proxy.ts,
// which feeds this array to clerkMiddleware's createRouteMatcher. Kept free of
// any @clerk import so it can be unit-tested in isolation (importing proxy.ts
// under vitest/jsdom fails — @clerk/nextjs/server transitively pulls in
// `server-only`). Patterns are path-to-regexp; "(.*)" matches the prefix and
// everything under it.
//
// /privacy and /terms have no page yet; they are listed for forward-compat so
// those routes are public the day they ship (today they 404 publicly instead of
// redirecting to /login).
export const PUBLIC_ROUTES = [
  "/",
  "/signup(.*)",
  "/login(.*)",
  "/modules/m1(.*)",
  "/upgrade(.*)",
  "/pricing(.*)",
  "/about(.*)",
  "/resources(.*)",
  "/privacy(.*)",
  "/terms(.*)",
  "/api/webhooks(.*)",
  "/api/leads(.*)",
];
