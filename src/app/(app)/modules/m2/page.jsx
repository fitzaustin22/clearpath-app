import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/src/lib/supabase/server';
import M2ModulePage from '@/src/components/m2/M2ModulePage';

// Server component: resolve the user's tier (Clerk session -> Supabase users.tier),
// then hand it to the Module 2 landing client island, which derives the rest of the
// screen (journey states, Blueprint count, upgrade promo) from the real
// m2Store / blueprintStore. Mirrors dashboard/page.tsx — previously this hardcoded
// userTier="essentials", which made the Full Access promo wrong for real users.
export default async function M2Page() {
  const { userId } = await auth();

  let userTier = 'free';
  if (userId) {
    const { data } = await supabaseAdmin
      .from('users')
      .select('tier')
      .eq('id', userId)
      .single();

    if (data?.tier) {
      userTier = data.tier;
    }
  }

  return <M2ModulePage userTier={userTier} />;
}
