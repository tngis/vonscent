import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { uploadImage } from "@/lib/storage/storage";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

/** Upload an avatar (or other user image) to Supabase Storage. Auth required. */
export async function POST(req: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ demo: true });
  }

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "NO_DB" }, { status: 500 });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const folder = (form?.get("folder") as string) || "avatars";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "NO_FILE" }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "BAD_TYPE" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "TOO_LARGE" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${folder}/${user.id}-${crypto.randomUUID()}.${ext}`;
  const result = await uploadImage(path, await file.arrayBuffer(), file.type);
  if (!result) {
    return NextResponse.json({ error: "UPLOAD_FAILED" }, { status: 500 });
  }
  return NextResponse.json(result);
}
