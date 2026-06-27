"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env, isSupabaseConfigured } from "@/lib/env";

/**
 * Browser Supabase client (anon key). Returns null when Supabase is not
 * configured so callers can gracefully fall back to seed data in the demo.
 *
 * The generated Database type (db/types.ts via `supabase gen types`) can be
 * passed as a generic here for full query typing; reads are cast to Row types
 * at call sites in the meantime.
 */
export function createClient() {
  if (!isSupabaseConfigured) return null;
  return createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
}
