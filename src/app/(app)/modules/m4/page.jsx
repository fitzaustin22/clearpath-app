import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/src/lib/supabase/server';
import M4ModulePage from '@/src/components/m4/M4ModulePage';

export const metadata = {
  title: 'Module 4: Tax Landscape | ClearPath',
};

// Server component: resolve the user's tier (Clerk session -> Supabase users.tier),
// then hand it to the Module 4 landing client island, which derives the rest of the
// screen (journey states + the Option C locked treatment for the wholesale-gated M4
// worksheets, Blueprint count, upgrade promo) from the real m4Store / blueprintStore.
// Mirrors the M2/M3 pages: previously this defaulted userTier to "essentials" and
// wrapped the island in its own <main>; the default is now "free" (so the Full Access
// promo + locked treatment are correct for real users) and the chrome <main> is owned
// by ModuleLanding.
export default async function M4Page() {
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

  return <M4ModulePage userTier={userTier} />;
}
