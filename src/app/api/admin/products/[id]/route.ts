import { NextResponse } from "next/server";
import { productEditSchema } from "@/lib/validators/product";
import { isSupabaseConfigured } from "@/lib/env";
import { getStaffUser } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { callRpc } from "@/lib/supabase/rpc";

async function guard() {
  if (!isSupabaseConfigured) return { demo: true as const };
  const staff = await getStaffUser();
  if (!staff) return { error: "FORBIDDEN" as const };
  const supabase = createAdminClient();
  if (!supabase) return { error: "NO_DB" as const };
  return { supabase };
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = productEditSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
  }
  const g = await guard();
  if ("demo" in g) return NextResponse.json({ demo: true });
  if ("error" in g) {
    return NextResponse.json(
      { error: g.error },
      { status: g.error === "FORBIDDEN" ? 403 : 500 },
    );
  }
  const { supabase } = g;
  const input = parsed.data;

  const productUpdate: Record<string, unknown> = {};
  if (input.name !== undefined) productUpdate.name = input.name;
  if (input.brand !== undefined) productUpdate.brand = input.brand;
  if (input.gender !== undefined) productUpdate.gender = input.gender;
  if (input.concentration !== undefined)
    productUpdate.concentration = input.concentration;
  if (input.scentFamily !== undefined)
    productUpdate.scent_family = input.scentFamily;
  if (input.season !== undefined) productUpdate.season = input.season;
  if (input.notesTop !== undefined) productUpdate.notes_top = input.notesTop;
  if (input.notesHeart !== undefined) productUpdate.notes_heart = input.notesHeart;
  if (input.notesBase !== undefined) productUpdate.notes_base = input.notesBase;
  if (input.description !== undefined)
    productUpdate.description = input.description;
  if (input.originCountry !== undefined)
    productUpdate.origin_country = input.originCountry;
  if (input.releaseYear !== undefined)
    productUpdate.release_year = input.releaseYear;
  if (input.sampleAvailable !== undefined)
    productUpdate.sample_available = input.sampleAvailable;
  if (input.isActive !== undefined) productUpdate.is_active = input.isActive;
  if (input.bottlePrice !== undefined)
    productUpdate.bottle_price = input.bottlePrice;
  if (input.bottleMl !== undefined) productUpdate.bottle_ml = input.bottleMl;

  if (Object.keys(productUpdate).length > 0) {
    const { error } = await supabase
      .from("products")
      .update(productUpdate)
      .eq("id", id);
    if (error) return NextResponse.json({ error: "UPDATE_FAILED" }, { status: 500 });
  }

  // Recompute variant auto-prices when bottle price/ml changed.
  if (input.bottlePrice !== undefined || input.bottleMl !== undefined) {
    await callRpc(supabase, "recompute_variant_prices", { p_product: id });
  }

  // Low-stock threshold.
  if (input.lowStockMl !== undefined) {
    await supabase
      .from("inventory")
      .update({ low_stock_ml: input.lowStockMl })
      .eq("product_id", id);
  }

  // Tags: replace the whole set.
  if (input.tags !== undefined) {
    const { data: tagRows } = await supabase
      .from("tags")
      .select("id, slug")
      .in("slug", input.tags.length ? input.tags : ["__none__"]);
    await supabase.from("product_tags").delete().eq("product_id", id);
    const links = ((tagRows as { id: string; slug: string }[] | null) ?? []).map(
      (t) => ({ product_id: id, tag_id: t.id }),
    );
    if (links.length) await supabase.from("product_tags").insert(links);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const g = await guard();
  if ("demo" in g) return NextResponse.json({ demo: true });
  if ("error" in g) {
    return NextResponse.json(
      { error: g.error },
      { status: g.error === "FORBIDDEN" ? 403 : 500 },
    );
  }
  const { error } = await g.supabase.from("products").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "DELETE_FAILED" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
