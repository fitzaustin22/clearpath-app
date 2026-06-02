import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/src/lib/supabase/server';
import M5ModulePage from '@/src/components/m5/M5ModulePage';

export const metadata = {
  title: 'Module 5: Value What Matters | ClearPath',
};

export default async function M5Page() {
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
      <M5ModulePage userTier={userTier} />
    </main>
  );
}
