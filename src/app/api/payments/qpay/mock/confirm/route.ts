import { NextResponse } from "next/server";
import { isQpayMockMode } from "@/lib/payments/qpay";
import { markOrderPaidByOrderNo } from "@/lib/payments/confirm-order";

/** Dev-only endpoint that simulates a successful QPay payment callback. */
export async function POST(req: Request) {
  if (!isQpayMockMode()) {
    return NextResponse.json({ error: "NOT_AVAILABLE" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const orderNo = typeof body?.orderNo === "string" ? body.orderNo : "";

  const result = await markOrderPaidByOrderNo(orderNo);
  if (!result.ok) {
    const status =
      result.error === "MISSING_ORDER"
        ? 400
        : result.error === "ORDER_NOT_FOUND"
          ? 404
          : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({
    ok: true,
    demo: result.demo,
    alreadyPaid: result.alreadyPaid,
  });
}
