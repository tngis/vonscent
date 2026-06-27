import { NextResponse } from "next/server";
import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashCode } from "../send/route";

const schema = z.object({
  phone: z.string().regex(/^\d{8}$/u),
  code: z.string().regex(/^\d{6}$/u),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID" }, { status: 400 });
  }
  const { phone, code } = parsed.data;

  if (!isSupabaseConfigured) {
    return NextResponse.json({ ok: true, demo: true });
  }
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "NO_DB" }, { status: 500 });

  const { data: rows } = await admin
    .from("phone_otps")
    .select("id, code_hash, expires_at, attempts, consumed")
    .eq("phone", phone)
    .order("created_at", { ascending: false })
    .limit(1);

  const otp = (rows as
    | {
        id: string;
        code_hash: string;
        expires_at: string;
        attempts: number;
        consumed: boolean;
      }[]
    | null)?.[0];

  if (!otp || otp.consumed) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 400 });
  }
  if (new Date(otp.expires_at) < new Date()) {
    return NextResponse.json({ error: "EXPIRED" }, { status: 400 });
  }
  if (otp.attempts >= 5) {
    return NextResponse.json({ error: "TOO_MANY_ATTEMPTS" }, { status: 429 });
  }
  if (otp.code_hash !== hashCode(phone, code)) {
    await admin
      .from("phone_otps")
      .update({ attempts: otp.attempts + 1 })
      .eq("id", otp.id);
    return NextResponse.json({ error: "WRONG_CODE" }, { status: 400 });
  }

  await admin.from("phone_otps").update({ consumed: true }).eq("id", otp.id);

  // If signed in, mark the phone verified on the profile.
  const session = await createClient();
  if (session) {
    const {
      data: { user },
    } = await session.auth.getUser();
    if (user) {
      await admin
        .from("profiles")
        .update({ phone, phone_verified: true })
        .eq("id", user.id);
    }
  }

  return NextResponse.json({ ok: true });
}
