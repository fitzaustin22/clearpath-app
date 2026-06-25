import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/src/lib/supabase/server';
import M3ModulePage from '@/src/components/m3/M3ModulePage';

// Server component: resolve the user's tier (Clerk session -> Supabase users.tier),
// then hand it to the Module 3 landing client island, which derives the rest of the
// screen (journey states, Blueprint count, upgrade promo) from the real m3Store /
// blueprintStore. Mirrors the M2 page: previously this defaulted userTier to
// "essentials" and wrapped the island in its own <main>; the default is now "free"
// (so the Full Access promo is correct for real users) and the chrome <main> is
// owned by ModuleLanding.
export default async function M3Page() {
  const { userId } = await auth();

  let userTier = 'free';
  if (userId) {
    const { data } = await supabaseAdmin
      .from('users')
      .select('tier')
      .eq('id', userId)
      .single();
    if (data?.tier) userTier = data.tier;
  }

  return <M3ModulePage userTier={userTier} />;
}
