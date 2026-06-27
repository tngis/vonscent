import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Typed wrapper around supabase.rpc().
 *
 * Isolates the rpc-argument cast so callers pass a plain args object and get a
 * typed result back. Works whether or not a generated Database generic is set.
 */
export async function callRpc<T = unknown>(
  client: SupabaseClient,
  fn: string,
  args: Record<string, unknown>,
): Promise<{ data: T | null; error: { message: string } | null }> {
  // Must call on the client instance — detaching `.rpc` breaks internal `this`.
  const res = await client.rpc(fn, args as never);
  return { data: res.data as T | null, error: res.error };
}
