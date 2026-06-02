import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/src/lib/supabase/server';
import OfferOrganizer from '@/src/components/m6/OfferOrganizer/OfferOrganizer';

export const metadata = {
  title: 'Settlement Offer Organizer | ClearPath',
};

export default async function OfferOrganizerPage() {
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
      <OfferOrganizer userTier={userTier} />
    </main>
  );
}
