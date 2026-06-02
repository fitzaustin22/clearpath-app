import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/src/lib/supabase/server';
import M7ModulePage from '@/src/components/m7/M7ModulePage';

export const metadata = {
  title: 'Module 7: Put It All Together | ClearPath',
};

export default async function M7Page() {
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
      <M7ModulePage userTier={userTier} />
    </main>
  );
}
