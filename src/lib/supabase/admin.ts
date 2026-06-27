import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env, isSupabaseConfigured } from "@/lib/env";

/**
 * Service-role Supabase client. Bypasses RLS — SERVER ONLY, never import into
 * client code. Use only inside route handlers / server actions for privileged
 * operations (inventory RPC, webhooks, admin writes).
 */
export function createAdminClient() {
  if (!isSupabaseConfigured || !env.supabaseServiceRoleKey) return null;
  return createSupabaseClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
