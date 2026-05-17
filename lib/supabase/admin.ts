import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../env';

// Service-role client. Bypasses RLS. NEVER import from client components.
//
// We deliberately type the return as `SupabaseClient<any, any, any>` because
// we haven't generated a Database type (`supabase gen types typescript`). With
// the default schema generic, every query infers row types as `never` and breaks
// every call site. Looser typing here is the right tradeoff until we run codegen.
let cached: SupabaseClient<any, any, any> | null = null;

export function supabaseAdmin(): SupabaseClient<any, any, any> {
  if (cached) return cached;
  cached = createClient<any, any, any>(env.supabaseUrl(), env.supabaseServiceKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
