import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/src/lib/supabase/server';
import DocumentationChecklist from '@/src/components/m2/DocumentationChecklist';

export default async function ChecklistPage() {
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
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '20px 20px 0' }}>
        <a
          href="/modules/m2"
          style={{
            fontFamily: '"Source Sans Pro", -apple-system, system-ui, sans-serif',
            fontSize: 14,
            color: '#1B2A4A',
            opacity: 0.65,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          ← Back to Know What You Own
        </a>
      </div>
      <DocumentationChecklist userTier={userTier} />
    </main>
  );
}
