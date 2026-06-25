'use client';

// Module 2 "Know What You Own" landing — Primary design (sidebar + journey spine).
// Thin module island: the server page (page.jsx) resolves the user's tier (Clerk +
// Supabase) and passes it in; this binds M2's store (via useM2Progress) to the
// shared ModuleLanding, which renders the whole screen from M2_LANDING + the
// normalized progress. All copy/routes live in m2Landing.config; the store->
// progress mapping (and M2's complete thresholds) live in m2Landing.adapter.

import ModuleLanding from '@/src/components/module-landing/ModuleLanding';
import { M2_LANDING } from './m2Landing.config';
import { useM2Progress } from './m2Landing.adapter';

export default function M2ModulePage({ userTier = 'free' }) {
  const progress = useM2Progress();
  return <ModuleLanding config={M2_LANDING} progress={progress} userTier={userTier} />;
}
