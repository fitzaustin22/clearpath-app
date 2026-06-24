// Email suppression list (CAN-SPAM unsubscribe). The send path checks isSuppressed
// before sending; the unsubscribe route calls addSuppression. Backed by the
// public.email_suppressions table (see schema.sql — applied by hand, not via DDL here).
import { supabaseAdmin } from '@/src/lib/supabase/server';

export async function isSuppressed(email) {
  const { data, error } = await supabaseAdmin
    .from('email_suppressions')
    .select('email')
    .eq('email', email)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function addSuppression(email) {
  // Idempotent: re-clicking the unsubscribe link is a no-op.
  const { error } = await supabaseAdmin
    .from('email_suppressions')
    .upsert({ email }, { onConflict: 'email', ignoreDuplicates: true });
  if (error) throw error;
}
