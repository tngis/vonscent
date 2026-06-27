import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface StaffUser {
  id: string;
  role: string;
}

/**
 * Resolve the current staff user (operator/super_admin) for route handlers —
 * defense in depth beyond middleware (development.md §7.5). Returns null when
 * not authenticated/authorized, or when Supabase isn't configured (demo).
 */
export async function getStaffUser(): Promise<StaffUser | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const role = (data as { role?: string } | null)?.role;
  if (role !== "operator" && role !== "super_admin") return null;
  return { id: user.id, role };
}
