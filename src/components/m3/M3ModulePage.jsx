'use client';

// Module 3 "Know What You Spend" landing — Primary design (sidebar + journey
// spine), migrated onto the shared ModuleLanding system (the second consumer after
// M2). Thin module island: the server page (page.jsx) resolves the user's tier
// (Clerk + Supabase) and passes it in; this binds M3's store (via useM3Progress) to
// the shared ModuleLanding, which renders the whole screen from M3_LANDING + the
// normalized progress. All copy/routes live in m3Landing.config; the store->
// progress mapping (and M3's badge-based complete semantics) live in
// m3Landing.adapter. The shared module-landing system is untouched.

import ModuleLanding from '@/src/components/module-landing/ModuleLanding';
import { M3_LANDING } from './m3Landing.config';
import { useM3Progress } from './m3Landing.adapter';

export default function M3ModulePage({ userTier = 'free' }) {
  const progress = useM3Progress();
  return <ModuleLanding config={M3_LANDING} progress={progress} userTier={userTier} />;
}
