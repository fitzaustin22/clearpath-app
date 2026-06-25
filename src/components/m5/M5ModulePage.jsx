'use client';

// Module 5 "Value What Matters" landing — Primary design (sidebar + journey spine),
// migrated onto the shared ModuleLanding system. M5 is the FINAL module-landing
// migration and the second wholesale-gated consumer (after M4): the server page
// (page.jsx) resolves the user's tier (Clerk + Supabase) and passes it in; this binds
// M5's store (via useM5Progress) to the shared ModuleLanding, which renders the whole
// screen from M5_LANDING + the normalized progress — including, for users below the
// Full-Access gate, the Option C locked treatment on every (wholesale-gated) M5
// worksheet. All copy/routes live in m5Landing.config; the heterogeneous store →
// {id,status,pct} mapping (singleton `results`, multi-instance `assets{}`, and the
// dormant QDRO `qdroPacketGeneratedAt`) lives entirely in m5Landing.adapter. The
// shared module-landing system is UNTOUCHED — M5 is a pure config + adapter swap.

import ModuleLanding from '@/src/components/module-landing/ModuleLanding';
import { M5_LANDING } from './m5Landing.config';
import { useM5Progress } from './m5Landing.adapter';

export default function M5ModulePage({ userTier = 'free' }) {
  const progress = useM5Progress();
  return <ModuleLanding config={M5_LANDING} progress={progress} userTier={userTier} />;
}
