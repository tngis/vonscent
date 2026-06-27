import { NextResponse } from "next/server";
import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  if (isSupabaseConfigured) {
    const supabase = createAdminClient();
    if (supabase) {
      // Idempotent: ignore duplicate emails (unique constraint).
      await supabase
        .from("newsletter_subscribers")
        .upsert({ email: parsed.data.email }, { onConflict: "email" });
    }
  }

  return NextResponse.json({ ok: true });
}
