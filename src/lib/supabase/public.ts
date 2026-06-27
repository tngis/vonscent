import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env, isSupabaseConfigured } from "@/lib/env";

/**
 * Cookie-less anon Supabase client for build-time / static contexts
 * (sitemap, etc.) where request cookies aren't available. Public reads only —
 * RLS still applies. Returns null when Supabase isn't configured.
 */
export function createPublicClient() {
  if (!isSupabaseConfigured) return null;
  return createSupabaseClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
