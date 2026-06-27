import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSms } from "@/lib/sms";

const schema = z.object({ phone: z.string().regex(/^\d{8}$/u) });

export function hashCode(phone: string, code: string) {
  return createHash("sha256").update(`${phone}:${code}`).digest("hex");
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_PHONE" }, { status: 400 });
  }
  const { phone } = parsed.data;

  if (!isSupabaseConfigured) {
    return NextResponse.json({ ok: true, demo: true });
  }
  const supabase = createAdminClient();
  if (!supabase) return NextResponse.json({ error: "NO_DB" }, { status: 500 });

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  await supabase.from("phone_otps").insert({
    phone,
    code_hash: hashCode(phone, code),
    expires_at: expiresAt,
  });

  const sms = await sendSms(
    phone,
    `vonscent баталгаажуулах код: ${code} (5 мин хүчинтэй)`,
  );

  // In mock mode (no SMS gateway) return the code so it can be tested locally.
  return NextResponse.json({ ok: true, mock: sms.mock, devCode: sms.mock ? code : undefined });
}
