import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/src/lib/supabase/server';
import PrioritiesWorksheet from '@/src/components/m6/PrioritiesWorksheet/PrioritiesWorksheet';

export const metadata = {
  title: 'Priorities Worksheet | ClearPath',
};

export default async function PrioritiesPage() {
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
      <PrioritiesWorksheet userTier={userTier} />
    </main>
  );
}
