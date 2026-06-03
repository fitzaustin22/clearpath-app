import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { type UserTier } from '@/src/lib/plans'
import DashboardPathView from '@/src/components/dashboard/DashboardPathView'

// Server component: resolves the user's tier (Clerk session -> Supabase users.tier)
// exactly as before, then hands it to the "Path to Clarity" client island, which
// derives the rest of the screen from the real blueprintStore. Data wiring here is
// unchanged from the prior dashboard; only the rendered body is re-skinned.
export default async function DashboardPage() {
  const { userId } = await auth()

  let userTier: UserTier = 'free'
  if (userId) {
    const { data } = await supabaseAdmin
      .from('users')
      .select('tier')
      .eq('id', userId)
      .single()

    if (data?.tier) {
      userTier = data.tier as UserTier
    }
  }

  return <DashboardPathView userTier={userTier} />
}
