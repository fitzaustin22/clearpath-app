import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/src/lib/supabase/server';
import MaritalEstateInventory from '@/src/components/m2/MaritalEstateInventory';

export default async function InventoryPage() {
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

  // The Guided Path screen renders its own breadcrumb + 1180px container; the
  // page only resolves auth + the M2 tier and hands it down. Auth gating is via
  // Clerk middleware (src/proxy.ts) — this route is NOT in publicRoutes.
  return <MaritalEstateInventory userTier={userTier} />;
}
