import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { getStaffUser } from "@/lib/auth/guard";
import { uploadImage } from "@/lib/storage/storage";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

/** Upload a product/blog image to Supabase Storage. Staff only. */
export async function POST(req: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ demo: true });
  }

  const staff = await getStaffUser();
  if (!staff) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const folder = (form?.get("folder") as string) || "products";

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
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const buffer = await file.arrayBuffer();

  const result = await uploadImage(path, buffer, file.type);
  if (!result) {
    return NextResponse.json({ error: "UPLOAD_FAILED" }, { status: 500 });
  }

  return NextResponse.json(result);
}
