import { NextResponse } from "next/server";
import { productInputSchema } from "@/lib/validators/product";
import { calcTierPrice } from "@/lib/pricing/calc";
import { DEFAULT_ROUND_TO } from "@/lib/constants";
import { isSupabaseConfigured } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffUser } from "@/lib/auth/guard";

function slugify(name: string, brand: string) {
  return `${brand}-${name}`
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = productInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const input = parsed.data;

  // Demo mode: no DB — confirm the pricing core ran, but don't persist.
  if (!isSupabaseConfigured) {
    return NextResponse.json({ demo: true });
  }

  // Defense in depth: re-check staff role at the handler.
  const staff = await getStaffUser();
  if (!staff) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "NO_DB" }, { status: 500 });
  }

  const slug = slugify(input.name, input.brand);

  const { data: product, error: pErr } = await supabase
    .from("products")
    .insert({
      slug,
      name: input.name,
      brand: input.brand,
      description: input.description,
      notes_top: input.notesTop,
      notes_heart: input.notesHeart,
      notes_base: input.notesBase,
      gender: input.gender,
      concentration: input.concentration,
      scent_family: input.scentFamily,
      season: input.season ?? null,
      origin_country: input.originCountry ?? null,
      release_year: input.releaseYear ?? null,
      bottle_price: input.bottlePrice,
      bottle_ml: input.bottleMl,
    })
    .select("id")
    .single();

  if (pErr || !product) {
    return NextResponse.json({ error: "INSERT_FAILED" }, { status: 500 });
  }
  const productId = (product as { id: string }).id;

  // Variants: compute auto price from the same pricing core; keep overrides.
  const variants = input.variants.map((v) => ({
    product_id: productId,
    ml: v.ml,
    auto_price: calcTierPrice(
      input.bottlePrice,
      input.bottleMl,
      { ml: v.ml, coefficient: v.coefficient },
      DEFAULT_ROUND_TO,
    ),
    override_price: v.override,
    is_active: v.active,
  }));

  await supabase.from("product_variants").insert(variants);
  await supabase.from("inventory").insert({
    product_id: productId,
    on_hand_ml: input.onHandMl,
    low_stock_ml: input.lowStockMl,
  });

  return NextResponse.json({ ok: true, id: productId, slug });
}
