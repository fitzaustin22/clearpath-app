import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/src/lib/supabase/server';
import PayStubDecoder from '@/src/components/m3/PayStubDecoder';

export default async function PayStubPage() {
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
      <PayStubDecoder userTier={userTier} />
    </main>
  );
}
