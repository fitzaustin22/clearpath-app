'use client';

// Module 4 "Tax Landscape" landing — Primary design (sidebar + journey spine),
// migrated onto the shared ModuleLanding system (the third consumer after M2 + M3,
// and the FIRST to turn on real `gated` worksheets). Thin module island: the server
// page (page.jsx) resolves the user's tier (Clerk + Supabase) and passes it in; this
// binds M4's store (via useM4Progress) to the shared ModuleLanding, which renders the
// whole screen from M4_LANDING + the normalized progress — including, for users below
// the Full-Access gate, the Option C locked treatment on every (wholesale-gated) M4
// worksheet. All copy/routes live in m4Landing.config; the binary completedAt ->
// status mapping lives in m4Landing.adapter. The shared module-landing system is
// untouched (M4 is a pure config + adapter swap).

import ModuleLanding from '@/src/components/module-landing/ModuleLanding';
import { M4_LANDING } from './m4Landing.config';
import { useM4Progress } from './m4Landing.adapter';

export default function M4ModulePage({ userTier = 'free' }) {
  const progress = useM4Progress();
  return <ModuleLanding config={M4_LANDING} progress={progress} userTier={userTier} />;
}
