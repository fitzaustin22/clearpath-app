import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/src/lib/supabase/server';
import M6ModulePage from '@/src/components/m6/M6ModulePage';

export const metadata = {
  title: 'Module 6: Negotiate from Strength | ClearPath',
};

export default async function M6Page() {
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
      <M6ModulePage userTier={userTier} />
    </main>
  );
}
