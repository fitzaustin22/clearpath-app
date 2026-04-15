import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/src/lib/supabase/server';
import FilingStatusOptimizer from '@/src/components/m4/FilingStatusOptimizer';

export const metadata = {
  title: 'Filing Status Optimizer | ClearPath',
};

export default async function FilingStatusPage() {
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
      <FilingStatusOptimizer userTier={userTier} />
    </main>
  );
}
