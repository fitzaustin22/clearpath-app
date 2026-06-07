// Pure active-route logic for the (app) primary nav. Kept dependency-free and
// framework-agnostic so it can be unit-tested without React or next/navigation.
//
// `route` is the active-detection BASE for a nav item — NOT necessarily the link
// href. (Example: the "Modules" item links to /modules/m1 but uses /modules as
// its route so the pill lights across every /modules/* page.)
//
// Dashboard is EXACT-MATCH ONLY by deliberate design: /dashboard/extra does NOT
// light the Dashboard pill. There is no nested dashboard route today, and an
// exact match avoids a future /dashboard-foo style path falsely activating it.
// Modules and Blueprint are prefix-match (route itself OR any nested path).
export function isActive(pathname, route) {
  if (route === '/dashboard') return pathname === route;
  // Modules and Blueprint match the route exactly OR any nested path.
  return pathname === route || pathname.startsWith(route + '/');
}
