import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const serviceKey = import.meta.env.PRIVATE_SUPABASE_SERVICE_KEY;

export function getAdminClient() {
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing PRIVATE_SUPABASE_SERVICE_KEY in .env');
  }
  return createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
}
