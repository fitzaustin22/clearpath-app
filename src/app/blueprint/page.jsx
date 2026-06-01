import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/src/lib/supabase/server';
import BlueprintView from '@/src/components/blueprint/BlueprintView';

export const metadata = {
  title: 'Your Financial Blueprint | ClearPath',
};

export default async function BlueprintPage() {
  // Tier resolved server-side (mirrors the M7 action-plan route) and passed to
  // BlueprintView so the Export action can gate to Full Access. Viewing stays
  // ungated; only the export trigger is gated.
  const { userId } = await auth();

  let userTier = 'essentials';
  if (userId) {
    const { data } = await supabaseAdmin
      .from('users')
      .select('tier')
      .eq('id', userId)
      .single();
    if (data?.tier) userTier = data.tier;
  }

  return <BlueprintView userTier={userTier} />;
}
