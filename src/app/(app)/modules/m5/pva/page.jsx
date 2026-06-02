import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/src/lib/supabase/server';
import PVA from '@/src/components/m5/PVA/PVA';

export const metadata = {
  title: 'Pension Valuation Analyzer | ClearPath',
};

export default async function PVAPage() {
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

  return (
    <main style={{ backgroundColor: '#FAF8F2', minHeight: '100vh' }}>
      <PVA userTier={userTier} />
    </main>
  );
}
