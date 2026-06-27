import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { callRpc } from "@/lib/supabase/rpc";

export type ConfirmOrderResult =
  | { ok: true; demo?: boolean; alreadyPaid?: boolean }
  | {
      ok: false;
      error: "MISSING_ORDER" | "ORDER_NOT_FOUND" | "COMMIT_FAILED";
    };

/** Mark an order paid and commit reserved inventory (idempotent). */
export async function markOrderPaidByOrderNo(
  orderNo: string,
): Promise<ConfirmOrderResult> {
  if (!orderNo) return { ok: false, error: "MISSING_ORDER" };

  const supabase = createAdminClient();
  if (!supabase) return { ok: true, demo: true };

  const { data } = await supabase
    .from("orders")
    .select("id, payment_status")
    .eq("order_no", orderNo)
    .maybeSingle();
  const order = data as { id: string; payment_status: string } | null;

  if (!order) return { ok: false, error: "ORDER_NOT_FOUND" };
  if (order.payment_status === "paid") return { ok: true, alreadyPaid: true };

  const { error } = await callRpc(supabase, "mark_order_paid", {
    p_order: order.id,
  });
  if (error) return { ok: false, error: "COMMIT_FAILED" };

  return { ok: true };
}
