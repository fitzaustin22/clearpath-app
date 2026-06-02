import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/src/lib/supabase/server';
import M4ModulePage from '@/src/components/m4/M4ModulePage';

export const metadata = {
  title: 'Module 4: Tax Landscape | ClearPath',
};

export default async function M4Page() {
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
      <M4ModulePage userTier={userTier} />
    </main>
  );
}
