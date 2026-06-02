import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/src/lib/supabase/server';
import PITTaxDiscountCalculator from '@/src/components/m4/PITTaxDiscountCalculator';

export const metadata = {
  title: 'PIT Tax Discount Calculator | ClearPath',
};

export default async function PITCalcPage() {
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
      <PITTaxDiscountCalculator userTier={userTier} />
    </main>
  );
}
