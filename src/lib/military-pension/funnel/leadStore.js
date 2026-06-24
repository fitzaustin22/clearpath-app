// Lead-write wrapper — mirrors the existing /api/leads upsert pattern, scoped to
// this tool's magnet. Persists the EMAIL ONLY (+ magnet/source/consent timestamp);
// on the composite-unique (email, magnet_id) conflict it does nothing else.
import { supabaseAdmin } from '@/src/lib/supabase/server';

export const MAGNET_ID = 'military-pension-tool';

export async function upsertLead(email) {
  const { error } = await supabaseAdmin.from('leads').upsert(
    {
      email,
      magnet_id: MAGNET_ID,
      source: 'military-pension-value-tool',
      consent_at: new Date().toISOString(),
    },
    { onConflict: 'email,magnet_id', ignoreDuplicates: true },
  );
  if (error) throw error;
}
