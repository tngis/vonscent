import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { formatPrice, formatDate } from "@/lib/format";
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUSES,
  type OrderStatus,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { OrderRow } from "@/db/types";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;
  const supabase = await createClient();
  let orders: OrderRow[] = [];
  if (supabase) {
    let query = supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (status && ORDER_STATUSES.includes(status as OrderStatus)) {
      query = query.eq("status", status);
    }
    if (q) {
      query = query.or(`order_no.ilike.%${q}%,contact_name.ilike.%${q}%`);
    }
    const { data } = await query;
    orders = (data as OrderRow[] | null) ?? [];
  }

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl font-semibold">Захиалга</h1>

      {/* Status filter + search */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterChip label="Бүгд" href="/admin/orders" active={!status} />
        {ORDER_STATUSES.map((s) => (
          <FilterChip
            key={s}
            label={ORDER_STATUS_LABEL[s]}
            href={`/admin/orders?status=${s}`}
            active={status === s}
          />
        ))}
        <form action="/admin/orders" className="ml-auto">
          <input
            name="q"
            defaultValue={q}
            placeholder="Дугаар / нэрээр хайх"
            className="h-9 rounded-md border border-border bg-transparent px-3 text-sm outline-none focus:border-primary"
          />
        </form>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-20 text-center">
          <ShoppingCart className="size-10 text-muted-foreground" />
          <p className="font-medium">Захиалга алга</p>
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Дугаар</th>
                  <th className="px-4 py-3 font-medium">Огноо</th>
                  <th className="px-4 py-3 font-medium">Хэрэглэгч</th>
                  <th className="px-4 py-3 font-medium">Дүн</th>
                  <th className="px-4 py-3 font-medium">Төлбөр</th>
                  <th className="px-4 py-3 font-medium">Төлөв</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr
                    key={o.id}
                    className="border-t border-border hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 font-mono">
                      <Link
                        href={`/admin/orders/${o.id}`}
                        className="hover:text-primary"
                      >
                        {o.order_no}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(o.created_at)}
                    </td>
                    <td className="px-4 py-3">{o.contact_name}</td>
                    <td className="px-4 py-3 font-medium">
                      {formatPrice(o.total)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={o.payment_status === "paid" ? "new" : "secondary"}
                      >
                        {o.payment_status === "paid"
                          ? "Төлсөн"
                          : o.payment_status === "refunded"
                            ? "Буцаагдсан"
                            : "Төлөөгүй"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">
                        {ORDER_STATUS_LABEL[o.status]}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function FilterChip({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border text-muted-foreground hover:border-primary",
      )}
    >
      {label}
    </Link>
  );
}
