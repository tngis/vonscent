import Link from "next/link";
import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/server";
import { formatPrice, formatDate } from "@/lib/format";
import { ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/constants";
import type { OrderRow } from "@/db/types";

const STATUS_VARIANT: Record<OrderStatus, "secondary" | "new" | "sale"> = {
  pending: "secondary",
  confirmed: "new",
  shipping: "new",
  delivered: "new",
  cancelled: "sale",
};

export default async function OrdersPage() {
  const supabase = await createClient();
  let orders: OrderRow[] = [];

  if (supabase) {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    orders = (data as OrderRow[] | null) ?? [];
  }

  if (orders.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="font-serif text-2xl font-semibold">Миний захиалга</h1>
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border py-20 text-center">
          <Package className="size-10 text-muted-foreground" />
          <div>
            <p className="font-medium">Захиалга алга байна</p>
            <p className="text-sm text-muted-foreground">
              Эхний захиалгаа өгөөд энд хянаарай.
            </p>
          </div>
          <Button asChild>
            <Link href="/catalog">Бараа үзэх</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl font-semibold">Миний захиалга</h1>
      <div className="space-y-4">
        {orders.map((o) => (
          <Card key={o.id} className="transition-colors hover:border-primary">
            <Link href={`/account/orders/${o.id}`} className="block">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono font-medium">{o.order_no}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(o.created_at)}
                  </p>
                </div>
                <Badge variant={STATUS_VARIANT[o.status]}>
                  {ORDER_STATUS_LABEL[o.status]}
                </Badge>
              </div>
              <Separator className="my-3" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Нийт дүн</span>
                <span className="font-semibold">{formatPrice(o.total)}</span>
              </div>
            </CardContent>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
