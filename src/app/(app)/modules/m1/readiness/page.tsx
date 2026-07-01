import { redirect } from 'next/navigation';

// D1 = SPLIT: the Readiness Assessment is now embedded-only, rendered as Card 1
// of the M1 landing (/modules/m1). This sub-route no longer has a standalone
// surface — it permanently redirects to the canonical landing. The route file
// stays so the "/modules/m1(.*)" public-route glob still covers it (no auth or
// publicRoutes change needed).
export default function ReadinessPage() {
  redirect('/modules/m1');
}
