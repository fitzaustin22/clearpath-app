import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/src/lib/supabase/server';
import TradeOffAnalyzer from '@/src/components/m6/TradeOffAnalyzer/TradeOffAnalyzer';

export const metadata = {
  title: 'Trade-Off Analyzer | ClearPath',
};

export default async function TradeOffPage() {
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
      <TradeOffAnalyzer userTier={userTier} />
    </main>
  );
}
